# backend/app/services/group_service.py
"""
Business logic for student group formation and the invitation workflow.

Design principles
-----------------
- Pure functions — no Flask ``request`` or ``jsonify`` here.
- Every constraint violation raises ``ValueError`` with a human-readable
  message.  Blueprints map ValueError → HTTP 4xx.
- All MongoDB writes that must be atomic use ``find_one_and_update`` with
  appropriate query predicates to prevent TOCTOU race conditions.
- A ``group_id`` field is kept on the student's user document as an O(1)
  "am I in a group?" marker, in addition to the ``member_ids`` array on the
  group document.  Both are kept in sync by every mutating function.

Collections touched
-------------------
- ``users``             (read + update group_id field)
- ``groups``            (primary read/write)
- ``group_invitations`` (read/write)
- ``courses``           (read — min_group / max_group constraints)
"""

import logging
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ASCENDING
from pymongo.errors import PyMongoError

from app.extensions import mongo
from app.models.group import (
    COLLECTION,
    INVITATIONS_COLLECTION,
    JOIN_REQUESTS_COLLECTION,
    Field,
    InvitationField,
    InvitationStatus,
    JoinRequestField,
    JoinRequestStatus,
    Status,
)
from app.models.user import Role, UserFields

# ══════════════════════════════════════════════════════════════════════════════
# Internal helpers
# ══════════════════════════════════════════════════════════════════════════════

def _oid(value: str) -> ObjectId:
    """Convert a string to ObjectId, raising ValueError on failure."""
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise ValueError(f"Invalid ID: {value!r}")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _serialize_group(doc: dict) -> dict:
    """Convert a raw MongoDB group document to a JSON-safe dict."""
    if doc is None:
        return None
    result = dict(doc)
    result["id"] = str(result.pop(Field.ID))

    # Convert ObjectId arrays / scalars
    if result.get(Field.LEADER_ID):
        result[Field.LEADER_ID] = str(result[Field.LEADER_ID])
    if result.get(Field.MEMBER_IDS):
        result[Field.MEMBER_IDS] = [str(m) for m in result[Field.MEMBER_IDS]]
    if result.get(Field.APPROVED_BY):
        result[Field.APPROVED_BY] = str(result[Field.APPROVED_BY])
    if result.get(Field.REJECTED_BY):
        result[Field.REJECTED_BY] = str(result[Field.REJECTED_BY])

    for key, value in result.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
    return result


def _serialize_invitation(doc: dict) -> dict:
    """Convert a raw invitation document to a JSON-safe dict."""
    if doc is None:
        return None
    result = dict(doc)
    result["id"] = str(result.pop(InvitationField.ID))
    for field in (InvitationField.GROUP_ID, InvitationField.INVITED_BY, InvitationField.INVITED_USER):
        if field in result and isinstance(result[field], ObjectId):
            result[field] = str(result[field])
    for key, value in result.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
    return result


def _serialize_join_request(doc: dict) -> dict:
    """Convert a raw join request document to a JSON-safe dict."""
    if doc is None:
        return None
    result = dict(doc)
    result["id"] = str(result.pop(JoinRequestField.ID))
    for field in (JoinRequestField.GROUP_ID, JoinRequestField.STUDENT_ID):
        if field in result and isinstance(result[field], ObjectId):
            result[field] = str(result[field])
    for key, value in result.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
    return result


def _get_active_student(student_id: str) -> dict:
    """Return the user doc for a non-deleted student, raise ValueError otherwise."""
    doc = mongo.db[UserFields.COLLECTION].find_one({
        UserFields.ID:      _oid(student_id),
        UserFields.ROLE:    Role.STUDENT,
        UserFields.DELETED: {"$ne": True},
    })
    if doc is None:
        raise ValueError("Student account not found.")
    return doc


def _get_course_constraints(course_name: str, dept: str) -> dict:
    """
    Look up min_group and max_group for the student's enrolled course.

    Falls back to defaults (2, 4) if no course record is found, so the
    system is usable before the manager has configured course records.
    """
    course_doc = mongo.db.courses.find_one({
        "name": course_name,
        "dept": dept.upper(),
        "deleted": {"$ne": True},
    })
    if course_doc:
        return {
            "min_group": course_doc.get("min_group", 2),
            "max_group": course_doc.get("max_group", 4),
        }
    # Graceful fallback — course record not yet created by manager
    return {"min_group": 2, "max_group": 4}


def _ensure_indexes() -> None:
    """
    Create required indexes if they do not already exist.
    Called lazily on first mutating operation.
    """
    db = mongo.db
    db[COLLECTION].create_index(
        [(Field.DEPT, ASCENDING), (Field.SECTION, ASCENDING), (Field.COURSE, ASCENDING)]
    )
    db[COLLECTION].create_index(Field.LEADER_ID)
    db[COLLECTION].create_index(Field.MEMBER_IDS)
    db[INVITATIONS_COLLECTION].create_index(
        [(InvitationField.INVITED_USER, ASCENDING), (InvitationField.STATUS, ASCENDING)]
    )
    db[INVITATIONS_COLLECTION].create_index(InvitationField.GROUP_ID)
    db[JOIN_REQUESTS_COLLECTION].create_index(
        [(JoinRequestField.STUDENT_ID, ASCENDING), (JoinRequestField.STATUS, ASCENDING)]
    )
    db[JOIN_REQUESTS_COLLECTION].create_index(
        [(JoinRequestField.GROUP_ID, ASCENDING), (JoinRequestField.STATUS, ASCENDING)]
    )
    # Partial unique index: no two *pending* invites to the same person for the same group
    try:
        db[INVITATIONS_COLLECTION].create_index(
            [(InvitationField.GROUP_ID, ASCENDING), (InvitationField.INVITED_USER, ASCENDING)],
            unique=True,
            partialFilterExpression={InvitationField.STATUS: InvitationStatus.PENDING},
            name="unique_pending_invite",
        )
    except PyMongoError as exc:
        logging.getLogger(__name__).debug("Pending invitation index already exists or creation skipped: %s", exc)

    # Partial unique index: no two *pending* join requests from the same student to the same group
    try:
        db[JOIN_REQUESTS_COLLECTION].create_index(
            [(JoinRequestField.GROUP_ID, ASCENDING), (JoinRequestField.STUDENT_ID, ASCENDING)],
            unique=True,
            partialFilterExpression={JoinRequestField.STATUS: JoinRequestStatus.PENDING},
            name="unique_pending_join_request",
        )
    except PyMongoError as exc:
        logging.getLogger(__name__).debug("Pending join request index creation skipped: %s", exc)


# ══════════════════════════════════════════════════════════════════════════════
# Group CRUD
# ══════════════════════════════════════════════════════════════════════════════

def create_group(student_id: str, name: str, project_title: str) -> dict:
    """
    Create a new pending group with the calling student as leader.

    Business rules
    --------------
    1. The student must not already belong to an active group.
    2. The group is seeded with the leader as the sole member.
    3. course, dept, section are copied from the student's user record.
    4. group_id is written back to the student's user doc atomically.

    Returns
    -------
    dict
        Serialized group document including course constraint metadata.

    Raises
    ------
    ValueError
        If the student already has a group.
    """
    _ensure_indexes()
    student = _get_active_student(student_id)

    # Rule 1 — student must not already be in a group
    if student.get(Field.GROUP_ID):
        raise ValueError("You are already in a group. Leave your current group before creating a new one.")

    # Also verify via member_ids (defence-in-depth for stale group_id values)
    existing = mongo.db[COLLECTION].find_one(
        {Field.MEMBER_IDS: _oid(student_id), Field.STATUS: {"$ne": Status.DELETED}}
    )
    if existing:
        raise ValueError("You are already a member of an active group.")

    course_name = student.get(UserFields.COURSE, "")
    dept        = student.get(UserFields.DEPT, "")
    section     = student.get(UserFields.SECTION, "")
    constraints = _get_course_constraints(course_name, dept)
    now = _now()

    group_doc = {
        Field.NAME:          name.strip(),
        Field.PROJECT_TITLE: project_title.strip(),
        Field.COURSE:        course_name,
        Field.DEPT:          dept,
        Field.SECTION:       section,
        Field.LEADER_ID:     _oid(student_id),
        Field.MEMBER_IDS:    [_oid(student_id)],
        Field.STATUS:        Status.PENDING,
        Field.EVALUATED:     False,
        Field.VERSION:       1,
        Field.CREATED_AT:    now,
        Field.UPDATED_AT:    now,
    }

    result = mongo.db[COLLECTION].insert_one(group_doc)
    group_id = result.inserted_id

    # Write group_id back to the leader's user doc
    mongo.db[UserFields.COLLECTION].update_one(
        {UserFields.ID: _oid(student_id)},
        {"$set": {Field.GROUP_ID: group_id, UserFields.UPDATED_AT: now}},
    )

    group_doc[Field.ID] = group_id
    serialized = _serialize_group(group_doc)
    serialized.update({
        "member_count": 1,
        "min_group":    constraints["min_group"],
        "max_group":    constraints["max_group"],
    })
    return serialized


def get_my_group(student_id: str) -> dict | None:
    """
    Return the student's current active group with member details.

    Returns
    -------
    dict | None
        Serialized group with a ``members`` list (id, name, roll, is_leader),
        plus constraint metadata.  ``None`` if the student has no group.
    """
    student = _get_active_student(student_id)
    group_oid_on_user = student.get(Field.GROUP_ID)

    group = None
    # Primary lookup: use the denormalized group_id on the user doc
    if group_oid_on_user:
        try:
            group = mongo.db[COLLECTION].find_one({
                Field.ID: _oid(str(group_oid_on_user)),
                Field.STATUS: {"$ne": Status.DELETED},
            })
        except (PyMongoError, ValueError):
            group = None

    if group is None:
        # Fallback: search by member_ids (handles stale/missing group_id)
        try:
            group = mongo.db[COLLECTION].find_one({
                Field.MEMBER_IDS: {"$in": [_oid(student_id), str(student_id)]},
                Field.STATUS: {"$ne": Status.DELETED},
            })
        except (PyMongoError, ValueError):
            group = None

    if group is None:
        return None

    serialized = _serialize_group(group)

    # Enrich with member details
    member_oids = group.get(Field.MEMBER_IDS, [])
    leader_oid  = group.get(Field.LEADER_ID)
    member_docs = list(mongo.db[UserFields.COLLECTION].find(
        {UserFields.ID: {"$in": member_oids}},
        {UserFields.NAME: 1, UserFields.ROLL: 1, UserFields.EMAIL: 1, UserFields.SECTION: 1},
    ))
    serialized["members"] = [
        {
            "id":        str(m[UserFields.ID]),
            "name":      m.get(UserFields.NAME, ""),
            "roll":      m.get(UserFields.ROLL, ""),
            "email":     m.get(UserFields.EMAIL, ""),
            "section":   m.get(UserFields.SECTION, ""),
            "is_leader": str(m[UserFields.ID]) == str(leader_oid),
        }
        for m in member_docs
    ]

    constraints = _get_course_constraints(
        group.get(Field.COURSE, ""), group.get(Field.DEPT, "")
    )
    serialized["member_count"] = len(member_oids)
    serialized["min_group"]    = constraints["min_group"]
    serialized["max_group"]    = constraints["max_group"]
    serialized["is_leader"]    = str(leader_oid) == str(student_id)
    return serialized


def update_group(group_id: str, leader_id: str, data: dict) -> dict:
    """
    Update name and/or project_title.  Only the group leader may call this.

    Rules
    -----
    - Only ``pending`` or ``rejected`` groups may be modified (approved groups are frozen).
    - If a ``rejected`` group is updated, status is automatically reset to ``pending`` so
      the manager can re-evaluate the updated proposal.
    - ``version`` is incremented on every successful update (optimistic lock audit trail).

    Raises
    ------
    ValueError
        - Caller is not the group leader (403-level).
        - Group is not in ``pending`` or ``rejected`` status.
        - Group not found.
        - No fields to update.
    """
    update_payload = {k: v for k, v in data.items() if v is not None}
    if not update_payload:
        raise ValueError("No fields provided to update.")

    now = _now()
    update_payload[Field.UPDATED_AT] = now
    # If previously rejected, reset to pending for manager re-approval
    update_payload[Field.STATUS] = Status.PENDING
    update_payload[Field.REJECTION_REASON] = None

    result = mongo.db[COLLECTION].find_one_and_update(
        {
            Field.ID:        _oid(group_id),
            Field.LEADER_ID: _oid(leader_id),
            Field.STATUS:    {"$in": [Status.PENDING, Status.REJECTED]},
        },
        {
            "$set": update_payload,
            "$inc": {Field.VERSION: 1},
        },
        return_document=True,
    )

    if result is None:
        # Distinguish between "not leader" and "group not found / approved"
        group = mongo.db[COLLECTION].find_one({Field.ID: _oid(group_id)})
        if group is None:
            raise ValueError("Group not found.")
        if str(group.get(Field.LEADER_ID)) != leader_id:
            raise ValueError("Only the group leader can update group details.")
        raise ValueError(f"Group cannot be modified in '{group.get(Field.STATUS)}' status.")

    return _serialize_group(result)


def leave_group(student_id: str, group_id: str) -> dict:
    """
    Remove a student from the group.
    - If student is the leader and sole member, disbands the group.
    - If student is the leader and other members remain, raises ValueError instructing to transfer leadership.
    - If student is a non-leader member, removes student from group.
    """
    group = mongo.db[COLLECTION].find_one({
        Field.ID:        _oid(group_id),
        Field.STATUS:    Status.PENDING,
        Field.MEMBER_IDS: _oid(student_id),
    })
    if group is None:
        raise ValueError("Group not found, or you are not a member of this pending group.")

    now = _now()
    is_leader = group[Field.LEADER_ID] == _oid(student_id)
    member_count = len(group.get(Field.MEMBER_IDS, []))

    if is_leader:
        if member_count > 1:
            raise ValueError(
                "Group leaders cannot leave while other members remain. Please transfer leadership to another member first."
            )
        # Sole member leader: disband group
        mongo.db[COLLECTION].update_one(
            {Field.ID: _oid(group_id)},
            {"$set": {Field.STATUS: Status.DELETED, Field.UPDATED_AT: now}},
        )
        mongo.db[UserFields.COLLECTION].update_one(
            {UserFields.ID: _oid(student_id)},
            {"$unset": {Field.GROUP_ID: ""}, "$set": {UserFields.UPDATED_AT: now}},
        )
        mongo.db[INVITATIONS_COLLECTION].update_many(
            {InvitationField.GROUP_ID: _oid(group_id), InvitationField.STATUS: InvitationStatus.PENDING},
            {"$set": {InvitationField.STATUS: InvitationStatus.DECLINED, InvitationField.RESPONDED_AT: now}},
        )
        return {"left": True, "disbanded": True, "student_id": student_id, "group_id": group_id}

    # Non-leader member leaving
    mongo.db[COLLECTION].update_one(
        {Field.ID: _oid(group_id)},
        {
            "$pull": {Field.MEMBER_IDS: _oid(student_id)},
            "$set":  {Field.UPDATED_AT: now},
        },
    )
    mongo.db[UserFields.COLLECTION].update_one(
        {UserFields.ID: _oid(student_id)},
        {"$unset": {Field.GROUP_ID: ""}, "$set": {UserFields.UPDATED_AT: now}},
    )
    # Cancel any pending invitations this student sent from this group
    mongo.db[INVITATIONS_COLLECTION].update_many(
        {InvitationField.GROUP_ID: _oid(group_id), InvitationField.INVITED_BY: _oid(student_id),
         InvitationField.STATUS: InvitationStatus.PENDING},
        {"$set": {InvitationField.STATUS: InvitationStatus.DECLINED,
                  InvitationField.RESPONDED_AT: now}},
    )
    return {"left": True, "student_id": student_id, "group_id": group_id}


def transfer_leadership(group_id: str, leader_id: str, new_leader_id: str) -> dict:
    """
    Transfer group leadership to another active group member.
    Only the current group leader can initiate this.
    """
    if leader_id == new_leader_id:
        raise ValueError("You are already the group leader.")

    group = mongo.db[COLLECTION].find_one({
        Field.ID:        _oid(group_id),
        Field.STATUS:    Status.PENDING,
        Field.LEADER_ID: _oid(leader_id),
    })
    if group is None:
        raise ValueError("Group not found, not in pending status, or you are not the leader.")

    new_leader_oid = _oid(new_leader_id)
    if new_leader_oid not in group.get(Field.MEMBER_IDS, []):
        raise ValueError("The designated new leader is not a member of this group.")

    new_leader_doc = mongo.db[UserFields.COLLECTION].find_one({
        UserFields.ID:      new_leader_oid,
        UserFields.DELETED: {"$ne": True},
    })
    if new_leader_doc is None:
        raise ValueError("The designated student account does not exist or is inactive.")

    now = _now()
    mongo.db[COLLECTION].update_one(
        {Field.ID: _oid(group_id)},
        {
            "$set": {Field.LEADER_ID: new_leader_oid, Field.UPDATED_AT: now},
            "$inc": {Field.VERSION: 1},
        },
    )

    return {
        "transferred":     True,
        "group_id":        group_id,
        "new_leader_id":   new_leader_id,
        "new_leader_name": new_leader_doc.get(UserFields.NAME, ""),
        "new_leader_roll": new_leader_doc.get(UserFields.ROLL, ""),
    }


def remove_member(group_id: str, leader_id: str, member_id: str) -> dict:
    """
    Remove a specific member from the group.  Only the leader may call this.

    Raises
    ------
    ValueError
        - Caller is not the leader.
        - Target is the leader themselves (use leave_group instead).
        - Member is not in the group.
        - Group not found or not pending.
    """
    if leader_id == member_id:
        raise ValueError("Leaders cannot remove themselves. Use the leave-group endpoint.")

    now = _now()
    result = mongo.db[COLLECTION].find_one_and_update(
        {
            Field.ID:         _oid(group_id),
            Field.LEADER_ID:  _oid(leader_id),
            Field.STATUS:     Status.PENDING,
            Field.MEMBER_IDS: _oid(member_id),
        },
        {
            "$pull": {Field.MEMBER_IDS: _oid(member_id)},
            "$set":  {Field.UPDATED_AT: now},
        },
        return_document=True,
    )

    if result is None:
        group = mongo.db[COLLECTION].find_one({Field.ID: _oid(group_id)})
        if group is None:
            raise ValueError("Group not found.")
        if str(group.get(Field.LEADER_ID)) != leader_id:
            raise ValueError("Only the group leader can remove members.")
        if _oid(member_id) not in group.get(Field.MEMBER_IDS, []):
            raise ValueError("The specified student is not a member of this group.")
        raise ValueError(f"Group cannot be modified in '{group.get(Field.STATUS)}' status.")

    # Clear group_id on the removed member's user doc
    mongo.db[UserFields.COLLECTION].update_one(
        {UserFields.ID: _oid(member_id)},
        {"$unset": {Field.GROUP_ID: ""}, "$set": {UserFields.UPDATED_AT: now}},
    )
    return {"removed": True, "member_id": member_id, "group_id": group_id}


# ══════════════════════════════════════════════════════════════════════════════
# Invitation workflow
# ══════════════════════════════════════════════════════════════════════════════

def invite_member(group_id: str, leader_id: str, roll: str) -> dict:
    """
    Send a group invitation to a student identified by roll number.

    Business rules
    --------------
    1. Caller must be the group leader.
    2. Group must be in ``pending`` status.
    3. Group must not be at max capacity.
    4. Target student must exist (same dept + section enforced by search,
       but not required here — manager may cross-section if desired).
    5. Target must not already be in any active group.
    6. No duplicate pending invitation to the same student for this group
       (enforced by partial unique index + service-level check).
    7. The leader cannot invite themselves.

    Returns
    -------
    dict
        ``{"invitation_id": str, "invited_email": str, "invited_name": str}``

    Raises
    ------
    ValueError
        Any business rule violation.
    """
    _ensure_indexes()

    group = mongo.db[COLLECTION].find_one({
        Field.ID:     _oid(group_id),
        Field.STATUS: {"$in": [Status.PENDING, Status.APPROVED]},
    })
    if group is None:
        raise ValueError("Group not found, has been deleted, or requires proposal revisions before inviting members.")
    if str(group.get(Field.LEADER_ID)) != leader_id:
        raise ValueError("Only the group leader can send invitations.")

    constraints = _get_course_constraints(
        group.get(Field.COURSE, ""), group.get(Field.DEPT, "")
    )
    current_count = len(group.get(Field.MEMBER_IDS, []))
    if current_count >= constraints["max_group"]:
        raise ValueError(
            f"Group has reached maximum capacity ({constraints['max_group']} members). Cannot send invitations."
        )

    # Find target student by roll number
    target = mongo.db[UserFields.COLLECTION].find_one({
        UserFields.ROLL:    roll.strip().upper(),
        UserFields.ROLE:    Role.STUDENT,
        UserFields.DELETED: {"$ne": True},
    })
    if target is None:
        raise ValueError(f"No active student found with roll number '{roll}'.")

    target_id = target[UserFields.ID]

    # Rule 7 — leader cannot invite themselves
    if target_id == _oid(leader_id):
        raise ValueError("You cannot invite yourself to your own group.")

    # Rule: Same course constraint (cross-section allowed)
    target_course = (target.get(UserFields.COURSE) or "").strip().upper()
    group_course = (group.get(Field.COURSE) or "").strip().upper()
    if target_course != group_course:
        raise ValueError(
            f"Students must be enrolled in the same course ('{group.get(Field.COURSE)}') to join this group. "
            f"Target student is enrolled in '{target.get(UserFields.COURSE) or 'None'}'."
        )

    # Rule 5 — target must not already be in a group
    if target.get(Field.GROUP_ID):
        raise ValueError(
            f"{target.get(UserFields.NAME, roll)} is already a member of another group."
        )
    # Defence-in-depth check via member_ids
    in_group = mongo.db[COLLECTION].find_one({
        Field.MEMBER_IDS: target_id,
        Field.STATUS:     {"$ne": Status.DELETED},
    })
    if in_group:
        raise ValueError(
            f"{target.get(UserFields.NAME, roll)} is already a member of another group."
        )

    # Rule 6 — no duplicate pending invitation
    existing_invite = mongo.db[INVITATIONS_COLLECTION].find_one({
        InvitationField.GROUP_ID:     _oid(group_id),
        InvitationField.INVITED_USER: target_id,
        InvitationField.STATUS:       InvitationStatus.PENDING,
    })
    if existing_invite:
        raise ValueError(
            f"A pending invitation has already been sent to {target.get(UserFields.EMAIL, roll)}."
        )

    now = _now()
    inv_doc = {
        InvitationField.GROUP_ID:     _oid(group_id),
        InvitationField.INVITED_BY:   _oid(leader_id),
        InvitationField.INVITED_USER: target_id,
        InvitationField.STATUS:       InvitationStatus.PENDING,
        InvitationField.CREATED_AT:   now,
        InvitationField.RESPONDED_AT: None,
    }
    result = mongo.db[INVITATIONS_COLLECTION].insert_one(inv_doc)

    return {
        "invitation_id":  str(result.inserted_id),
        "invited_email":  target.get(UserFields.EMAIL, ""),
        "invited_name":   target.get(UserFields.NAME, ""),
        "invited_roll":   target.get(UserFields.ROLL, ""),
    }


def get_pending_invitations(student_id: str) -> list[dict]:
    """
    Return all pending invitations addressed to this student.

    Each invitation is enriched with group name, project title, leader name,
    inviter name, and course so the student can make an informed decision.

    Returns
    -------
    list[dict]
        Sorted newest-first.
    """
    invites = list(mongo.db[INVITATIONS_COLLECTION].find({
        InvitationField.INVITED_USER: {"$in": [_oid(student_id), str(student_id)]},
        InvitationField.STATUS:       InvitationStatus.PENDING,
    }).sort(InvitationField.CREATED_AT, -1))

    enriched = []
    for inv in invites:
        serialized = _serialize_invitation(inv)

        # Enrich with group details
        group = mongo.db[COLLECTION].find_one(
            {Field.ID: inv[InvitationField.GROUP_ID]},
            {Field.NAME: 1, Field.PROJECT_TITLE: 1, Field.COURSE: 1, Field.DEPT: 1, Field.SECTION: 1,
             Field.LEADER_ID: 1, Field.MEMBER_IDS: 1},
        )
        if group:
            serialized["group_name"]    = group.get(Field.NAME, "")
            serialized["project_title"] = group.get(Field.PROJECT_TITLE, "")
            serialized["group_course"]  = group.get(Field.COURSE, "")
            serialized["group_dept"]    = group.get(Field.DEPT, "")
            serialized["group_section"] = group.get(Field.SECTION, "")
            serialized["member_count"]  = len(group.get(Field.MEMBER_IDS, []))

            # Enrich with leader details
            leader = mongo.db[UserFields.COLLECTION].find_one(
                {UserFields.ID: group[Field.LEADER_ID]},
                {UserFields.NAME: 1, UserFields.ROLL: 1},
            )
            if leader:
                serialized["leader_name"] = leader.get(UserFields.NAME, "")
                serialized["leader_roll"] = leader.get(UserFields.ROLL, "")

        # Enrich with inviter details
        if inv.get(InvitationField.INVITED_BY):
            inviter = mongo.db[UserFields.COLLECTION].find_one(
                {UserFields.ID: inv[InvitationField.INVITED_BY]},
                {UserFields.NAME: 1, UserFields.ROLL: 1},
            )
            if inviter:
                serialized["invited_by_name"] = inviter.get(UserFields.NAME, "")
                serialized["invited_by_roll"] = inviter.get(UserFields.ROLL, "")

        enriched.append(serialized)
    return enriched


def respond_to_invitation(invitation_id: str, student_id: str, accept: bool) -> dict:
    """
    Accept or decline a pending group invitation.

    Atomicity
    ---------
    On accept, the student is added to the group's ``member_ids`` and their
    ``group_id`` is set in a **single** ``find_one_and_update`` call that
    also checks current member count vs max_group to prevent race conditions.

    Raises
    ------
    ValueError
        - Invitation not found or does not belong to this student.
        - Invitation already responded to.
        - Student already in a group (if accepting).
        - Group already at capacity (if accepting).
        - Group no longer in pending status (if accepting).
    """
    inv = mongo.db[INVITATIONS_COLLECTION].find_one({
        InvitationField.ID:           _oid(invitation_id),
        InvitationField.INVITED_USER: _oid(student_id),
    })
    if inv is None:
        raise ValueError("Invitation not found.")
    if inv[InvitationField.STATUS] != InvitationStatus.PENDING:
        raise ValueError(
            f"This invitation has already been {inv[InvitationField.STATUS]}."
        )

    now = _now()

    if not accept:
        # Decline — just mark the invitation
        mongo.db[INVITATIONS_COLLECTION].update_one(
            {InvitationField.ID: _oid(invitation_id)},
            {"$set": {InvitationField.STATUS: InvitationStatus.DECLINED,
                      InvitationField.RESPONDED_AT: now}},
        )
        return {"accepted": False, "invitation_id": invitation_id}

    # Accept — validate student is not already in a group
    student = _get_active_student(student_id)
    if student.get(Field.GROUP_ID):
        raise ValueError("You are already in a group. Leave it before accepting an invitation.")

    group_oid = inv[InvitationField.GROUP_ID]
    group = mongo.db[COLLECTION].find_one({Field.ID: group_oid, Field.STATUS: Status.PENDING})
    if group is None:
        raise ValueError("The group for this invitation is no longer active or pending.")

    constraints = _get_course_constraints(
        group.get(Field.COURSE, ""), group.get(Field.DEPT, "")
    )
    current_count = len(group.get(Field.MEMBER_IDS, []))
    if current_count >= constraints["max_group"]:
        raise ValueError(
            f"The group is now at maximum capacity ({constraints['max_group']} members). "
            "Your invitation can no longer be accepted."
        )

    # Atomic add: only succeeds if the group still has room ($size check via slice trick)
    # We use a simpler but safe approach: the count check above + immediate update.
    # True atomicity for capacity is achieved by re-checking member_ids length post-update.
    updated_group = mongo.db[COLLECTION].find_one_and_update(
        {
            Field.ID:     group_oid,
            Field.STATUS: Status.PENDING,
            # Ensure the array size is still < max_group at the moment of write
            f"member_ids.{constraints['max_group'] - 1}": {"$exists": False},
        },
        {
            "$push": {Field.MEMBER_IDS: _oid(student_id)},
            "$set":  {Field.UPDATED_AT: now},
        },
        return_document=True,
    )

    if updated_group is None:
        raise ValueError(
            "The group reached maximum capacity just before your acceptance. "
            "Please contact the group leader."
        )

    # Update invitation status
    mongo.db[INVITATIONS_COLLECTION].update_one(
        {InvitationField.ID: _oid(invitation_id)},
        {"$set": {InvitationField.STATUS: InvitationStatus.ACCEPTED,
                  InvitationField.RESPONDED_AT: now}},
    )

    # Set group_id on the new member's user doc
    mongo.db[UserFields.COLLECTION].update_one(
        {UserFields.ID: _oid(student_id)},
        {"$set": {Field.GROUP_ID: group_oid, UserFields.UPDATED_AT: now}},
    )

    # Decline all other pending invitations this student has received
    # (they can now only be in one group)
    mongo.db[INVITATIONS_COLLECTION].update_many(
        {
            InvitationField.INVITED_USER: _oid(student_id),
            InvitationField.STATUS:       InvitationStatus.PENDING,
            InvitationField.ID:           {"$ne": _oid(invitation_id)},
        },
        {"$set": {InvitationField.STATUS: InvitationStatus.DECLINED,
                  InvitationField.RESPONDED_AT: now}},
    )

    return {
        "accepted":      True,
        "invitation_id": invitation_id,
        "group_id":      str(group_oid),
        "group_name":    updated_group.get(Field.NAME, ""),
    }


# ══════════════════════════════════════════════════════════════════════════════
# Peer discovery
# ══════════════════════════════════════════════════════════════════════════════
# Peer discovery and Group browsing
# ══════════════════════════════════════════════════════════════════════════════

def search_students(query_fragment: str, course: str, dept: str = "", current_student_id: str | None = None) -> list[dict]:
    """
    Search for students in the same course by roll number or name (cross-section allowed).

    Used by the "Invite Peers" modal so a leader can discover and invite classmates.

    Returns
    -------
    list[dict]
        Each entry includes id, name, roll, email, section, dept, and ``has_group`` boolean.
    """
    import re

    pattern = re.compile(re.escape(query_fragment.strip()), re.IGNORECASE)
    query = {
        UserFields.ROLE:    Role.STUDENT,
        UserFields.DELETED: {"$ne": True},
        "$or": [
            {UserFields.ROLL: pattern},
            {UserFields.NAME: pattern},
        ],
    }
    if course:
        query[UserFields.COURSE] = {"$regex": f"^{re.escape(course.strip())}$", "$options": "i"}
    if current_student_id:
        query[UserFields.ID] = {"$ne": _oid(current_student_id)}

    cursor = mongo.db[UserFields.COLLECTION].find(
        query,
        {
            UserFields.NAME: 1,
            UserFields.ROLL: 1,
            UserFields.EMAIL: 1,
            UserFields.SECTION: 1,
            UserFields.DEPT: 1,
            UserFields.COURSE: 1,
            Field.GROUP_ID: 1,
        },
    ).limit(25)

    results = []
    for doc in cursor:
        results.append({
            "id":        str(doc[UserFields.ID]),
            "name":      doc.get(UserFields.NAME, ""),
            "roll":      doc.get(UserFields.ROLL, ""),
            "email":     doc.get(UserFields.EMAIL, ""),
            "section":   doc.get(UserFields.SECTION, ""),
            "dept":      doc.get(UserFields.DEPT, ""),
            "course":    doc.get(UserFields.COURSE, ""),
            "has_group": bool(doc.get(Field.GROUP_ID)),
        })
    return results


def list_groups_for_student(student_id: str, search: str = "", status_filter: str = "") -> list[dict]:
    """
    List all active project groups in the student's enrolled course for discovery.

    Parameters
    ----------
    student_id:
        Calling student's ID.
    search:
        Optional search term to filter by group name or project title.
    status_filter:
        Optional status filter ('pending', 'approved', 'rejected').
    """
    import re

    student = _get_active_student(student_id)
    course_name = student.get(UserFields.COURSE, "").strip()
    student_oid = _oid(student_id)

    # Check if student is in any group
    student_in_group = bool(
        student.get(Field.GROUP_ID)
        or mongo.db[COLLECTION].find_one({
            Field.MEMBER_IDS: student_oid,
            Field.STATUS: {"$ne": Status.DELETED},
        })
    )

    # Retrieve all pending join requests sent by this student
    pending_reqs = list(
        mongo.db[JOIN_REQUESTS_COLLECTION].find({
            JoinRequestField.STUDENT_ID: student_oid,
            JoinRequestField.STATUS: JoinRequestStatus.PENDING,
        })
    )
    pending_req_map = {
        str(pr[JoinRequestField.GROUP_ID]): str(pr[JoinRequestField.ID])
        for pr in pending_reqs
    }

    query = {
        Field.STATUS: {"$ne": Status.DELETED},
    }
    if course_name:
        query[Field.COURSE] = {"$regex": f"^{re.escape(course_name)}$", "$options": "i"}

    if status_filter and status_filter.lower() != "all":
        query[Field.STATUS] = status_filter.lower()

    if search.strip():
        term_pattern = re.compile(re.escape(search.strip()), re.IGNORECASE)
        query["$or"] = [
            {Field.NAME: term_pattern},
            {Field.PROJECT_TITLE: term_pattern},
        ]

    groups_cursor = mongo.db[COLLECTION].find(query).sort(Field.CREATED_AT, -1).limit(50)
    groups = list(groups_cursor)

    results = []
    for g in groups:
        serialized = _serialize_group(g)
        gid_str = str(g[Field.ID])
        member_oids = g.get(Field.MEMBER_IDS, [])
        leader_oid  = g.get(Field.LEADER_ID)

        # Look up leader
        leader_doc = mongo.db[UserFields.COLLECTION].find_one(
            {UserFields.ID: leader_oid},
            {UserFields.NAME: 1, UserFields.ROLL: 1, UserFields.EMAIL: 1},
        )
        if leader_doc:
            serialized["leader_name"] = leader_doc.get(UserFields.NAME, "")
            serialized["leader_roll"] = leader_doc.get(UserFields.ROLL, "")
            serialized["leader_email"] = leader_doc.get(UserFields.EMAIL, "")

        # Look up members
        member_docs = list(mongo.db[UserFields.COLLECTION].find(
            {UserFields.ID: {"$in": member_oids}},
            {UserFields.NAME: 1, UserFields.ROLL: 1, UserFields.SECTION: 1},
        ))
        serialized["members"] = [
            {
                "id": str(m[UserFields.ID]),
                "name": m.get(UserFields.NAME, ""),
                "roll": m.get(UserFields.ROLL, ""),
                "section": m.get(UserFields.SECTION, ""),
                "is_leader": m[UserFields.ID] == leader_oid,
            }
            for m in member_docs
        ]

        constraints = _get_course_constraints(
            g.get(Field.COURSE, ""), g.get(Field.DEPT, "")
        )
        serialized["member_count"] = len(member_oids)
        serialized["min_group"]    = constraints["min_group"]
        serialized["max_group"]    = constraints["max_group"]
        is_full = len(member_oids) >= constraints["max_group"]
        is_my_group = student_oid in member_oids
        is_rejected = (g.get(Field.STATUS) == Status.REJECTED)
        has_pending_req = gid_str in pending_req_map

        serialized["is_full"]             = is_full
        serialized["is_my_group"]         = is_my_group
        serialized["has_pending_request"] = has_pending_req
        serialized["pending_request_id"]  = pending_req_map.get(gid_str)
        serialized["can_request_to_join"] = (
            (not student_in_group)
            and (not is_full)
            and (not is_rejected)
            and (not has_pending_req)
            and (not is_my_group)
        )

        results.append(serialized)

    # Sort so that the student's own group always appears first at the top
    results.sort(key=lambda x: (not x.get("is_my_group", False)))

    return results


# ══════════════════════════════════════════════════════════════════════════════
# Join Requests (Student ➔ Group)
# ══════════════════════════════════════════════════════════════════════════════

def send_join_request(student_id: str, group_id: str, message: str = "") -> dict:
    """
    Submit a request by an unaffiliated student to join an existing group.

    Rules
    -----
    1. Student must exist, be active, and not already belong to any group.
    2. Group must exist, not be deleted, and not be in 'rejected' status.
    3. Group must belong to the same course as the student.
    4. Group must not have reached maximum capacity (max_group).
    5. Student cannot have an active 'pending' join request to this specific group.
    """
    _ensure_indexes()
    student = _get_active_student(student_id)
    student_oid = student[UserFields.ID]

    # Rule 1 — Student must not already belong to a group
    if student.get(Field.GROUP_ID):
        raise ValueError("You are already a member of a group. You must leave your current group before requesting to join another.")

    in_group = mongo.db[COLLECTION].find_one({
        Field.MEMBER_IDS: student_oid,
        Field.STATUS: {"$ne": Status.DELETED},
    })
    if in_group:
        raise ValueError("You are already a member of a group. You must leave your current group before requesting to join another.")

    # Rule 2 — Group existence & status check
    group = mongo.db[COLLECTION].find_one({
        Field.ID: _oid(group_id),
        Field.STATUS: {"$ne": Status.DELETED},
    })
    if group is None:
        raise ValueError("Group not found or has been deleted.")

    if group.get(Field.STATUS) == Status.REJECTED:
        raise ValueError("Cannot send a join request to a group that requires revision. The group leader must update and resubmit the proposal first.")

    # Rule 3 — Course matching
    student_course = (student.get(UserFields.COURSE) or "").strip().upper()
    group_course = (group.get(Field.COURSE) or "").strip().upper()
    if student_course != group_course:
        raise ValueError(f"You can only request to join groups in your enrolled course ('{student.get(UserFields.COURSE)}').")

    # Rule 4 — Capacity guard
    constraints = _get_course_constraints(
        group.get(Field.COURSE, ""), group.get(Field.DEPT, "")
    )
    current_count = len(group.get(Field.MEMBER_IDS, []))
    if current_count >= constraints["max_group"]:
        raise ValueError(f"Group '{group.get(Field.NAME)}' is already at maximum capacity ({constraints['max_group']} members).")

    # Rule 5 — Duplicate pending request check
    existing_req = mongo.db[JOIN_REQUESTS_COLLECTION].find_one({
        JoinRequestField.GROUP_ID: _oid(group_id),
        JoinRequestField.STUDENT_ID: student_oid,
        JoinRequestField.STATUS: JoinRequestStatus.PENDING,
    })
    if existing_req:
        raise ValueError("You already have a pending join request submitted to this group.")

    now = _now()
    doc = {
        JoinRequestField.GROUP_ID: _oid(group_id),
        JoinRequestField.STUDENT_ID: student_oid,
        JoinRequestField.STATUS: JoinRequestStatus.PENDING,
        JoinRequestField.MESSAGE: (message or "").strip(),
        JoinRequestField.CREATED_AT: now,
        JoinRequestField.RESPONDED_AT: None,
    }
    result = mongo.db[JOIN_REQUESTS_COLLECTION].insert_one(doc)
    return {
        "id": str(result.inserted_id),
        "group_id": group_id,
        "group_name": group.get(Field.NAME, ""),
        "status": JoinRequestStatus.PENDING,
        "created_at": now.isoformat(),
    }


def cancel_join_request(student_id: str, request_id: str) -> dict:
    """
    Cancel an outgoing pending join request previously sent by the student.
    """
    student = _get_active_student(student_id)
    student_oid = student[UserFields.ID]
    req_oid = _oid(request_id)

    req = mongo.db[JOIN_REQUESTS_COLLECTION].find_one({
        JoinRequestField.ID: req_oid,
        JoinRequestField.STUDENT_ID: student_oid,
        JoinRequestField.STATUS: JoinRequestStatus.PENDING,
    })
    if req is None:
        raise ValueError("Pending join request not found or has already been processed.")

    now = _now()
    mongo.db[JOIN_REQUESTS_COLLECTION].update_one(
        {JoinRequestField.ID: req_oid},
        {"$set": {
            JoinRequestField.STATUS: JoinRequestStatus.CANCELLED,
            JoinRequestField.RESPONDED_AT: now,
        }}
    )
    return {"message": "Join request cancelled successfully."}


def list_my_sent_join_requests(student_id: str) -> list[dict]:
    """
    List all join requests sent by this student, enriched with group details.
    """
    student = _get_active_student(student_id)
    student_oid = student[UserFields.ID]

    docs = list(
        mongo.db[JOIN_REQUESTS_COLLECTION]
        .find({JoinRequestField.STUDENT_ID: student_oid})
        .sort(JoinRequestField.CREATED_AT, -1)
    )

    results = []
    for d in docs:
        serialized = _serialize_join_request(d)
        group = mongo.db[COLLECTION].find_one(
            {Field.ID: d.get(JoinRequestField.GROUP_ID)},
            {Field.NAME: 1, Field.PROJECT_TITLE: 1, Field.COURSE: 1, Field.DEPT: 1,
             Field.SECTION: 1, Field.LEADER_ID: 1, Field.MEMBER_IDS: 1, Field.STATUS: 1}
        )
        if group:
            serialized["group_name"] = group.get(Field.NAME, "")
            serialized["project_title"] = group.get(Field.PROJECT_TITLE, "")
            serialized["course"] = group.get(Field.COURSE, "")
            serialized["dept"] = group.get(Field.DEPT, "")
            serialized["section"] = group.get(Field.SECTION, "")
            serialized["group_status"] = group.get(Field.STATUS, "")
            member_ids = group.get(Field.MEMBER_IDS, [])
            constraints = _get_course_constraints(group.get(Field.COURSE, ""), group.get(Field.DEPT, ""))
            serialized["member_count"] = len(member_ids)
            serialized["max_group"] = constraints["max_group"]
            serialized["is_full"] = len(member_ids) >= constraints["max_group"]

            leader = mongo.db[UserFields.COLLECTION].find_one(
                {UserFields.ID: group.get(Field.LEADER_ID)},
                {UserFields.NAME: 1, UserFields.ROLL: 1}
            )
            if leader:
                serialized["leader_name"] = leader.get(UserFields.NAME, "")
                serialized["leader_roll"] = leader.get(UserFields.ROLL, "")
        results.append(serialized)
    return results


def list_incoming_join_requests(leader_id: str, group_id: str | None = None) -> list[dict]:
    """
    List all pending join requests targeting the leader's group.
    """
    leader = _get_active_student(leader_id)
    leader_oid = leader[UserFields.ID]

    # Look up group where caller is leader
    query = {Field.LEADER_ID: leader_oid, Field.STATUS: {"$ne": Status.DELETED}}
    if group_id:
        query[Field.ID] = _oid(group_id)

    group = mongo.db[COLLECTION].find_one(query)
    if group is None:
        raise ValueError("You are not the leader of any active project group.")

    reqs = list(
        mongo.db[JOIN_REQUESTS_COLLECTION]
        .find({
            JoinRequestField.GROUP_ID: group[Field.ID],
            JoinRequestField.STATUS: JoinRequestStatus.PENDING,
        })
        .sort(JoinRequestField.CREATED_AT, -1)
    )

    results = []
    for r in reqs:
        serialized = _serialize_join_request(r)
        student_doc = mongo.db[UserFields.COLLECTION].find_one(
            {UserFields.ID: r[JoinRequestField.STUDENT_ID]},
            {UserFields.NAME: 1, UserFields.ROLL: 1, UserFields.EMAIL: 1, UserFields.SECTION: 1, UserFields.COURSE: 1}
        )
        if student_doc:
            serialized["applicant_name"] = student_doc.get(UserFields.NAME, "")
            serialized["applicant_roll"] = student_doc.get(UserFields.ROLL, "")
            serialized["applicant_email"] = student_doc.get(UserFields.EMAIL, "")
            serialized["applicant_section"] = student_doc.get(UserFields.SECTION, "")
            serialized["applicant_course"] = student_doc.get(UserFields.COURSE, "")
        results.append(serialized)
    return results


def accept_join_request(leader_id: str, request_id: str) -> dict:
    """
    Leader accepts an incoming join request.

    Atomically joins applicant to group using optimistic locking, sets group_id on user,
    marks this request accepted, and auto-cancels all other pending join requests and
    invitations for that student.
    """
    from pymongo import ReturnDocument

    _ensure_indexes()
    leader = _get_active_student(leader_id)
    leader_oid = leader[UserFields.ID]
    req_oid = _oid(request_id)

    req = mongo.db[JOIN_REQUESTS_COLLECTION].find_one({
        JoinRequestField.ID: req_oid,
        JoinRequestField.STATUS: JoinRequestStatus.PENDING,
    })
    if req is None:
        raise ValueError("Join request not found or has already been processed.")

    group_oid = req[JoinRequestField.GROUP_ID]
    group = mongo.db[COLLECTION].find_one({
        Field.ID: group_oid,
        Field.STATUS: {"$ne": Status.DELETED},
    })
    if group is None:
        raise ValueError("Group not found or has been deleted.")

    if group.get(Field.LEADER_ID) != leader_oid:
        raise ValueError("Only the group leader can accept join requests.")

    constraints = _get_course_constraints(group.get(Field.COURSE, ""), group.get(Field.DEPT, ""))
    max_group = constraints["max_group"]
    current_members = group.get(Field.MEMBER_IDS, [])
    if len(current_members) >= max_group:
        raise ValueError(f"Group is full (max {max_group} members). Cannot accept new applicants.")

    target_student_oid = req[JoinRequestField.STUDENT_ID]
    target_student = mongo.db[UserFields.COLLECTION].find_one({
        UserFields.ID: target_student_oid,
        UserFields.ROLE: Role.STUDENT,
        UserFields.DELETED: {"$ne": True},
    })
    if target_student is None:
        raise ValueError("Applicant student account no longer exists or is inactive.")

    # Check if student joined another group in the meantime
    if target_student.get(Field.GROUP_ID):
        mongo.db[JOIN_REQUESTS_COLLECTION].update_one(
            {JoinRequestField.ID: req_oid},
            {"$set": {JoinRequestField.STATUS: JoinRequestStatus.CANCELLED, JoinRequestField.RESPONDED_AT: _now()}}
        )
        raise ValueError(f"Applicant {target_student.get(UserFields.NAME, 'Student')} has already joined another group.")

    in_any = mongo.db[COLLECTION].find_one({
        Field.MEMBER_IDS: target_student_oid,
        Field.STATUS: {"$ne": Status.DELETED},
    })
    if in_any:
        mongo.db[JOIN_REQUESTS_COLLECTION].update_one(
            {JoinRequestField.ID: req_oid},
            {"$set": {JoinRequestField.STATUS: JoinRequestStatus.CANCELLED, JoinRequestField.RESPONDED_AT: _now()}}
        )
        raise ValueError(f"Applicant {target_student.get(UserFields.NAME, 'Student')} has already joined another group.")

    now = _now()
    current_version = group.get(Field.VERSION, 1)

    # Atomic optimistic lock update
    updated_group = mongo.db[COLLECTION].find_one_and_update(
        {
            Field.ID: group_oid,
            Field.VERSION: current_version,
            "$expr": {"$lt": [{"$size": f"${Field.MEMBER_IDS}"}, max_group]},
        },
        {
            "$push": {Field.MEMBER_IDS: target_student_oid},
            "$inc":  {Field.VERSION: 1},
            "$set":  {Field.UPDATED_AT: now},
        },
        return_document=ReturnDocument.AFTER,
    )

    if updated_group is None:
        raise ValueError("Group was modified simultaneously by another action or has reached capacity. Please refresh.")

    # Update student's user doc with group_id
    mongo.db[UserFields.COLLECTION].update_one(
        {UserFields.ID: target_student_oid},
        {"$set": {Field.GROUP_ID: group_oid, UserFields.UPDATED_AT: now}},
    )

    # Mark this join request as accepted
    mongo.db[JOIN_REQUESTS_COLLECTION].update_one(
        {JoinRequestField.ID: req_oid},
        {"$set": {JoinRequestField.STATUS: JoinRequestStatus.ACCEPTED, JoinRequestField.RESPONDED_AT: now}},
    )

    # Auto-cancel ALL other pending join requests sent by this student
    mongo.db[JOIN_REQUESTS_COLLECTION].update_many(
        {
            JoinRequestField.STUDENT_ID: target_student_oid,
            JoinRequestField.STATUS: JoinRequestStatus.PENDING,
            JoinRequestField.ID: {"$ne": req_oid},
        },
        {"$set": {JoinRequestField.STATUS: JoinRequestStatus.CANCELLED, JoinRequestField.RESPONDED_AT: now}},
    )

    # Auto-cancel ALL pending invitations addressed to this student
    mongo.db[INVITATIONS_COLLECTION].update_many(
        {
            InvitationField.INVITED_USER: target_student_oid,
            InvitationField.STATUS: InvitationStatus.PENDING,
        },
        {"$set": {InvitationField.STATUS: InvitationStatus.CANCELLED, InvitationField.RESPONDED_AT: now}},
    )

    return {
        "success": True,
        "message": f"Join request accepted. {target_student.get(UserFields.NAME, 'Student')} has been added to your group.",
        "group": _serialize_group(updated_group),
    }


def reject_join_request(leader_id: str, request_id: str) -> dict:
    """
    Leader declines an incoming join request.
    """
    leader = _get_active_student(leader_id)
    leader_oid = leader[UserFields.ID]
    req_oid = _oid(request_id)

    req = mongo.db[JOIN_REQUESTS_COLLECTION].find_one({
        JoinRequestField.ID: req_oid,
        JoinRequestField.STATUS: JoinRequestStatus.PENDING,
    })
    if req is None:
        raise ValueError("Join request not found or has already been processed.")

    group = mongo.db[COLLECTION].find_one({
        Field.ID: req[JoinRequestField.GROUP_ID],
        Field.STATUS: {"$ne": Status.DELETED},
    })
    if group is None or group.get(Field.LEADER_ID) != leader_oid:
        raise ValueError("Only the group leader can reject join requests.")

    now = _now()
    mongo.db[JOIN_REQUESTS_COLLECTION].update_one(
        {JoinRequestField.ID: req_oid},
        {"$set": {JoinRequestField.STATUS: JoinRequestStatus.REJECTED, JoinRequestField.RESPONDED_AT: now}},
    )
    return {"message": "Join request declined."}

