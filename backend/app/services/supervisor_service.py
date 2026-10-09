# backend/app/services/supervisor_service.py
"""
Supervisor Service — Business logic for supervisor expertise profiles and request workflow.
"""

import re
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId

from app.extensions import mongo
from app.models.group import (
    COLLECTION as GROUPS_COLLECTION,
)
from app.models.group import (
    Field as GroupField,
)
from app.models.group import (
    Status as GroupStatus,
)
from app.models.supervisor_request import (
    COLLECTION as SUP_REQ_COLLECTION,
)
from app.models.supervisor_request import (
    SupervisorRequestFields,
    SupervisorRequestStatus,
)
from app.models.user import MAX_SUPERVISION_CAP, Role, UserFields
from app.services.academic_write_service import academic_write


def _oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise ValueError(f"Invalid ID: {value!r}")


def _serialize_request(doc: dict | None) -> dict | None:
    if not doc:
        return None
    res = dict(doc)
    res["id"] = str(res.pop(SupervisorRequestFields.ID))
    if res.get(SupervisorRequestFields.GROUP_ID):
        res[SupervisorRequestFields.GROUP_ID] = str(res[SupervisorRequestFields.GROUP_ID])
    if res.get(SupervisorRequestFields.EVALUATOR_ID):
        res[SupervisorRequestFields.EVALUATOR_ID] = str(res[SupervisorRequestFields.EVALUATOR_ID])
    if res.get(SupervisorRequestFields.REQUESTED_BY):
        res[SupervisorRequestFields.REQUESTED_BY] = str(res[SupervisorRequestFields.REQUESTED_BY])
    for k, v in list(res.items()):
        if isinstance(v, datetime):
            res[k] = v.isoformat()
    from app.utils.serialization import json_safe
    return json_safe(res)


def get_evaluator_active_count(evaluator_id: str, course_name: str | None = None) -> int:
    """Compute the number of active groups currently supervised by this evaluator (overall or per course)."""
    filter_q = {
        "supervisor_id": {"$in": [_oid(evaluator_id), evaluator_id]},
        GroupField.STATUS: {"$ne": GroupStatus.DELETED},
    }
    if course_name and course_name.strip() and course_name.strip().lower() != "all":
        filter_q[GroupField.COURSE] = course_name.strip()
    return mongo.db[GROUPS_COLLECTION].count_documents(filter_q)


def list_available_supervisors(
    domain: str | None = None,
    dept: str | None = None,
    course: str | None = None,
    available_only: bool = False,
) -> list[dict]:
    """
    List teachers with expertise, total project count and availability (fewer than four groups).
    """
    query = {
        UserFields.ROLE: Role.TEACHER,
        UserFields.DELETED: {"$ne": True},
    }

    if dept and dept.strip() and dept.lower() != "all":
        query[UserFields.DEPT] = {"$regex": f"^{re.escape(dept.strip())}$", "$options": "i"}

    if domain and domain.strip():
        dom_regex = re.compile(re.escape(domain.strip()), re.IGNORECASE)
        query[UserFields.DOMAINS] = dom_regex

    teachers = list(mongo.db.users.find(query, {UserFields.PASSWORD_HASH: 0}).sort(UserFields.NAME, 1))

    results = []
    for ev in teachers:
        ev_id = str(ev["_id"])
        active_count = get_evaluator_active_count(ev_id)
        is_available = active_count < MAX_SUPERVISION_CAP

        if available_only and not is_available:
            continue

        results.append({
            "id": ev_id,
            "name": ev.get(UserFields.NAME, ""),
            "email": ev.get(UserFields.EMAIL, ""),
            "dept": ev.get(UserFields.DEPT, ""),
            "domains": ev.get(UserFields.DOMAINS) or [],
            "course": course,
            "active_supervision_count": active_count,
            "max_supervision_cap": MAX_SUPERVISION_CAP,
            "is_available": is_available,
        })

    return results


def update_evaluator_domains(evaluator_id: str, domains: list[str]) -> dict:
    """Update domain tags / expertise for a teacher/supervisor."""
    clean_domains = [d.strip() for d in domains if isinstance(d, str) and d.strip()]
    now = datetime.now(timezone.utc)

    res = mongo.db.users.update_one(
        {"_id": _oid(evaluator_id), UserFields.ROLE: Role.TEACHER, UserFields.DELETED: {"$ne": True}},
        {"$set": {UserFields.DOMAINS: clean_domains, UserFields.UPDATED_AT: now}},
    )
    if res.matched_count == 0:
        raise ValueError("Teacher/Supervisor not found.")

    return {"updated": True, "evaluator_id": evaluator_id, "domains": clean_domains}


@academic_write
def create_supervisor_request(
    group_id: str,
    student_id: str,
    evaluator_id: str,
    request_message: str | None = None,
) -> dict:
    """
    Submit a supervisor request on behalf of a group (Team Lead only).
    """
    g_oid = _oid(group_id)
    s_oid = _oid(student_id)
    e_oid = _oid(evaluator_id)

    # 1. Validate Group
    group = mongo.db[GROUPS_COLLECTION].find_one({
        GroupField.ID: g_oid,
        GroupField.STATUS: {"$ne": GroupStatus.DELETED},
    })
    if not group:
        raise ValueError("Group not found.")

    if group.get(GroupField.LEADER_ID) != s_oid:
        raise ValueError("Only the Group Team Lead can submit a supervisor request.")

    if group.get("supervisor_id") and str(group["supervisor_id"]) != evaluator_id:
        raise ValueError("Your assigned Supervisor must review a revised proposal.")
    if group.get("status") in ("approved", "evaluated"):
        raise ValueError("This project is already approved.")
    from app.services.academic_integrity_service import validate_enrollment
    from app.services.group_service import _get_course_constraints, proposal_metadata
    from app.services.manager_group_service import _resolve_group_members
    validate_enrollment(group.get("dept", ""), group.get("course", ""))
    proposal = proposal_metadata(group)
    if not proposal.get("attachment"):
        raise ValueError("Attach a valid proposal before requesting supervision.")
    constraints = _get_course_constraints(group.get("course", ""), group.get("dept", ""))
    if not constraints["min_group"] <= len(group.get("member_ids", [])) <= constraints["max_group"]:
        raise ValueError("Accepted group membership must meet the Course's group-size rules before review.")

    # 2. Check for existing pending request
    pending = mongo.db[SUP_REQ_COLLECTION].find_one({
        SupervisorRequestFields.GROUP_ID: g_oid,
        SupervisorRequestFields.STATUS: SupervisorRequestStatus.PENDING,
    })
    if pending:
        raise ValueError("Your group already has a pending supervisor request. Please cancel it before sending a new one.")

    # 3. Validate Teacher / Supervisor
    evaluator = mongo.db.users.find_one({
        UserFields.ID: e_oid,
        UserFields.ROLE: Role.TEACHER,
        UserFields.DELETED: {"$ne": True},
    })
    if not evaluator:
        raise ValueError("Selected supervisor not found.")
    if evaluator.get("dept", "").upper() != group.get("dept", "").upper():
        raise ValueError("The Supervisor must belong to the group's Department.")

    group_course = group.get(GroupField.COURSE)
    active_count = get_evaluator_active_count(evaluator_id)
    if active_count >= MAX_SUPERVISION_CAP and str(group.get("supervisor_id", "")) != evaluator_id:
        course_msg = f" for course '{group_course}'" if group_course else ""
        raise ValueError(f"This supervisor has reached their maximum capacity of {MAX_SUPERVISION_CAP} projects{course_msg}.")

    now = datetime.now(timezone.utc)
    doc = {
        SupervisorRequestFields.GROUP_ID: g_oid,
        SupervisorRequestFields.EVALUATOR_ID: e_oid,
        SupervisorRequestFields.REQUESTED_BY: s_oid,
        SupervisorRequestFields.STATUS: SupervisorRequestStatus.PENDING,
        SupervisorRequestFields.REQUEST_MESSAGE: (request_message or "").strip() or None,
        SupervisorRequestFields.REJECTION_REASON: None,
        SupervisorRequestFields.CREATED_AT: now,
        SupervisorRequestFields.RESPONDED_AT: None,
        "proposal_version": group.get("proposal_version", 1),
        "proposal": proposal,
        "members": _resolve_group_members(group),
        "project_title": group.get("project_title"),
    }

    res = mongo.db[SUP_REQ_COLLECTION].insert_one(doc)
    doc[SupervisorRequestFields.ID] = res.inserted_id
    mongo.db.groups.update_one({"_id": g_oid}, {"$set": {"review_stage": "supervisor_review"}})

    serialized = _serialize_request(doc)
    serialized["evaluator_name"] = evaluator.get(UserFields.NAME, "")
    serialized["evaluator_dept"] = evaluator.get(UserFields.DEPT, "")
    serialized["evaluator_domains"] = evaluator.get(UserFields.DOMAINS) or []
    return serialized


def get_my_group_supervisor_request(group_id: str) -> dict | None:
    """Fetch the latest pending supervisor request for a group."""
    doc = mongo.db[SUP_REQ_COLLECTION].find_one(
        {
            SupervisorRequestFields.GROUP_ID: _oid(group_id),
        },
        sort=[(SupervisorRequestFields.CREATED_AT, -1)],
    )
    if not doc:
        return None

    serialized = _serialize_request(doc)
    ev = mongo.db.users.find_one({"_id": doc[SupervisorRequestFields.EVALUATOR_ID]}, {UserFields.NAME: 1, UserFields.DEPT: 1, UserFields.DOMAINS: 1, UserFields.EMAIL: 1})
    if ev:
        serialized["evaluator_name"] = ev.get(UserFields.NAME, "")
        serialized["evaluator_dept"] = ev.get(UserFields.DEPT, "")
        serialized["evaluator_email"] = ev.get(UserFields.EMAIL, "")
        serialized["evaluator_domains"] = ev.get(UserFields.DOMAINS) or []
    return serialized


@academic_write
def cancel_supervisor_request(request_id: str, student_id: str) -> dict:
    """Cancel a pending supervisor request (Team Lead only)."""
    r_oid = _oid(request_id)
    s_oid = _oid(student_id)

    req = mongo.db[SUP_REQ_COLLECTION].find_one({SupervisorRequestFields.ID: r_oid})
    if not req:
        raise ValueError("Supervisor request not found.")

    if req.get(SupervisorRequestFields.STATUS) != SupervisorRequestStatus.PENDING:
        raise ValueError(f"Cannot cancel request in '{req.get(SupervisorRequestFields.STATUS)}' status.")

    # Check if student is group leader
    group = mongo.db[GROUPS_COLLECTION].find_one({GroupField.ID: req[SupervisorRequestFields.GROUP_ID]})
    if not group or group.get(GroupField.LEADER_ID) != s_oid:
        raise ValueError("Only the team lead who created the request can cancel it.")

    now = datetime.now(timezone.utc)
    mongo.db[SUP_REQ_COLLECTION].update_one(
        {"_id": r_oid},
        {"$set": {
            SupervisorRequestFields.STATUS: SupervisorRequestStatus.CANCELLED,
            SupervisorRequestFields.RESPONDED_AT: now,
        }},
    )

    mongo.db.groups.update_one({"_id": group["_id"]}, {"$set": {"review_stage": "forming"}})
    return {"cancelled": True, "request_id": request_id}


def list_evaluator_supervisor_requests(evaluator_id: str) -> list[dict]:
    """List all pending incoming supervisor requests directed to this evaluator."""
    e_oid = _oid(evaluator_id)
    docs = list(mongo.db[SUP_REQ_COLLECTION].find({
        SupervisorRequestFields.EVALUATOR_ID: e_oid,
        SupervisorRequestFields.STATUS: SupervisorRequestStatus.PENDING,
    }).sort(SupervisorRequestFields.CREATED_AT, -1))

    items = []
    for d in docs:
        s = _serialize_request(d)
        group = mongo.db[GROUPS_COLLECTION].find_one({GroupField.ID: d[SupervisorRequestFields.GROUP_ID]})
        if group:
            s["group_name"] = group.get(GroupField.NAME, "")
            s["project_title"] = group.get(GroupField.PROJECT_TITLE, "")
            s["dept"] = group.get(GroupField.DEPT, "")
            s["section"] = group.get(GroupField.SECTION, "")
            s["course"] = group.get(GroupField.COURSE, "")
            s["member_count"] = len(group.get(GroupField.MEMBER_IDS, []))
            from app.services.group_service import proposal_metadata
            from app.services.manager_group_service import _resolve_group_members
            s["proposal"] = s.get("proposal") or proposal_metadata(group)
            s["members"] = s.get("members") or _resolve_group_members(group)

        lead = mongo.db.users.find_one({"_id": d[SupervisorRequestFields.REQUESTED_BY]}, {UserFields.NAME: 1, UserFields.ROLL: 1, UserFields.EMAIL: 1})
        if lead:
            s["leader_name"] = lead.get(UserFields.NAME, "")
            s["leader_roll"] = lead.get(UserFields.ROLL, "")
            s["leader_email"] = lead.get(UserFields.EMAIL, "")

        items.append(s)

    return items


@academic_write
def accept_supervisor_request(evaluator_id: str, request_id: str) -> dict:
    """
    Accept a supervisor request.
    Verifies project cap <= 4, assigns evaluator to group, and cancels residual pending requests.
    """
    e_oid = _oid(evaluator_id)
    r_oid = _oid(request_id)

    req = mongo.db[SUP_REQ_COLLECTION].find_one({
        SupervisorRequestFields.ID: r_oid,
        SupervisorRequestFields.EVALUATOR_ID: e_oid,
    })
    if not req:
        raise ValueError("Supervisor request not found.")

    if req.get(SupervisorRequestFields.STATUS) != SupervisorRequestStatus.PENDING:
        raise ValueError(f"Request is already resolved ({req.get(SupervisorRequestFields.STATUS)}).")

    # Enforce the total active supervision capacity
    group_oid = req[SupervisorRequestFields.GROUP_ID]
    group_doc = mongo.db[GROUPS_COLLECTION].find_one({"_id": group_oid})
    group_course = group_doc.get(GroupField.COURSE) if group_doc else None
    if not group_doc or group_doc.get("status") in ("deleted", "approved", "evaluated"):
        raise ValueError("This group is unavailable for proposal review.")
    if req.get("proposal_version", 1) != group_doc.get("proposal_version", 1):
        raise ValueError("The proposal was revised. Review the current request instead.")

    active_count = get_evaluator_active_count(evaluator_id)
    if active_count >= MAX_SUPERVISION_CAP and str(group_doc.get("supervisor_id", "")) != evaluator_id:
        course_msg = f" for course '{group_course}'" if group_course else ""
        raise ValueError(f"You have reached your maximum supervision limit ({MAX_SUPERVISION_CAP} groups{course_msg}). Cannot accept more.")

    evaluator = mongo.db.users.find_one({"_id": e_oid, "role": Role.TEACHER, "deleted": {"$ne": True}})
    if not evaluator or evaluator.get("dept", "").upper() != group_doc.get("dept", "").upper():
        raise ValueError("The active Supervisor must belong to the group's Department.")
    from app.services.academic_integrity_service import validate_enrollment
    from app.services.group_service import _get_course_constraints, proposal_metadata
    validate_enrollment(group_doc.get("dept", ""), group_doc.get("course", ""))
    constraints = _get_course_constraints(group_doc.get("course", ""), group_doc.get("dept", ""))
    if not constraints["min_group"] <= len(group_doc.get("member_ids", [])) <= constraints["max_group"] or not proposal_metadata(group_doc).get("attachment"):
        raise ValueError("Current accepted membership and attached proposal must meet the Course review requirements.")
    for member_id in group_doc.get("member_ids", []):
        member = mongo.db.users.find_one({"_id": _oid(str(member_id)), "deleted": {"$ne": True}, "role": Role.STUDENT})
        if not member or member.get("course") != group_doc.get("course") or member.get("dept") != group_doc.get("dept"):
            raise ValueError("A group member's academic assignment needs Manager correction before review.")
    evaluator_name = evaluator.get(UserFields.NAME, "Supervisor") if evaluator else "Supervisor"

    now = datetime.now(timezone.utc)

    # 1. Update Group Document
    mongo.db[GROUPS_COLLECTION].update_one(
        {"_id": group_oid},
        {"$set": {
            "supervisor_id": e_oid,
            "supervisor_name": evaluator_name,
            "supervisor_accepted_version": group_doc.get("proposal_version", 1),
            "review_stage": "manager_review",
            GroupField.UPDATED_AT: now,
        }},
    )

    # 2. Mark this request as accepted
    mongo.db[SUP_REQ_COLLECTION].update_one(
        {"_id": r_oid},
        {"$set": {
            SupervisorRequestFields.STATUS: SupervisorRequestStatus.ACCEPTED,
            SupervisorRequestFields.RESPONDED_AT: now,
        }},
    )

    # 3. Cancel any other pending requests for this group
    mongo.db[SUP_REQ_COLLECTION].update_many(
        {
            SupervisorRequestFields.GROUP_ID: group_oid,
            SupervisorRequestFields.ID: {"$ne": r_oid},
            SupervisorRequestFields.STATUS: SupervisorRequestStatus.PENDING,
        },
        {"$set": {
            SupervisorRequestFields.STATUS: SupervisorRequestStatus.CANCELLED,
            SupervisorRequestFields.RESPONDED_AT: now,
        }},
    )

    # 4. Create / Update Assignment record
    mongo.db.assignments.update_one(
        {"group_id": group_oid, "evaluator_id": e_oid},
        {"$set": {
            "group_id": group_oid,
            "evaluator_id": e_oid,
            "assigned_at": now,
            "type": "supervisor",
        }},
        upsert=True,
    )

    # Update denormalised count on user
    new_count = get_evaluator_active_count(evaluator_id)
    mongo.db.users.update_one({"_id": e_oid}, {"$set": {UserFields.ACTIVE_SUPERVISION_COUNT: new_count}})

    return {
        "success": True,
        "message": "Supervisor request accepted successfully.",
        "group_id": str(group_oid),
        "evaluator_id": evaluator_id,
        "active_supervision_count": new_count,
    }


@academic_write
def reject_supervisor_request(evaluator_id: str, request_id: str, reason: str | None = None) -> dict:
    """Reject a supervisor request with optional reason."""
    e_oid = _oid(evaluator_id)
    r_oid = _oid(request_id)

    req = mongo.db[SUP_REQ_COLLECTION].find_one({
        SupervisorRequestFields.ID: r_oid,
        SupervisorRequestFields.EVALUATOR_ID: e_oid,
    })
    if not req:
        raise ValueError("Supervisor request not found.")

    if req.get(SupervisorRequestFields.STATUS) != SupervisorRequestStatus.PENDING:
        raise ValueError(f"Request is already resolved ({req.get(SupervisorRequestFields.STATUS)}).")

    now = datetime.now(timezone.utc)
    mongo.db[SUP_REQ_COLLECTION].update_one(
        {"_id": r_oid},
        {"$set": {
            SupervisorRequestFields.STATUS: SupervisorRequestStatus.REJECTED,
            SupervisorRequestFields.REJECTION_REASON: (reason or "").strip() or None,
            SupervisorRequestFields.RESPONDED_AT: now,
        }},
    )

    mongo.db.groups.update_one({"_id": req[SupervisorRequestFields.GROUP_ID]}, {"$set": {
        "review_stage": "revision_required", "rejection_reason": (reason or "Revision requested").strip(),
    }})

    return {
        "success": True,
        "message": "Supervisor request rejected.",
        "request_id": request_id,
    }
