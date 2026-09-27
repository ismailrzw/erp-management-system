# backend/app/services/manager_group_service.py
"""
Business logic for manager-facing Project Group approval and management.

Features:
---------
- list_groups: Paginated list of project groups with filters (status, course, dept, search)
  and real-time status count totals (all, pending, approved, rejected).
- get_group_detail: Comprehensive group details including full member list and leader info.
- approve_group: Transition group from pending/rejected to approved status.
- reject_group: Transition group to rejected status with mandatory feedback reason.
"""

import math
import re
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId

from app.extensions import mongo
from app.models.group import (
    COLLECTION,
    Field,
    Status,
)
from app.models.user import UserFields


def _oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise ValueError(f"Invalid ID: {value!r}")


def _serialize_manager_group(doc: dict) -> dict:
    """Convert a raw MongoDB group document to a JSON-safe dict for manager view."""
    if doc is None:
        return None
    result = dict(doc)
    result["id"] = str(result.pop(Field.ID))

    if result.get(Field.LEADER_ID):
        result[Field.LEADER_ID] = str(result[Field.LEADER_ID])
    if result.get(Field.MEMBER_IDS):
        result[Field.MEMBER_IDS] = [str(m) for m in result[Field.MEMBER_IDS]]
    if result.get(Field.APPROVED_BY):
        result[Field.APPROVED_BY] = str(result[Field.APPROVED_BY])
    if result.get(Field.REJECTED_BY):
        result[Field.REJECTED_BY] = str(result[Field.REJECTED_BY])
    if result.get(Field.SUPERVISOR_ID):
        result[Field.SUPERVISOR_ID] = str(result[Field.SUPERVISOR_ID])
    if result.get(Field.PROPOSAL_ATTACHMENT_ID):
        result[Field.PROPOSAL_ATTACHMENT_ID] = str(result[Field.PROPOSAL_ATTACHMENT_ID])
        result["proposal_download_url"] = f"/api/attachments/{result[Field.PROPOSAL_ATTACHMENT_ID]}/download"
    else:
        result["proposal_download_url"] = None

    for key, value in list(result.items()):
        if isinstance(value, datetime):
            result[key] = value.isoformat()
    return result


def _resolve_group_members(doc: dict) -> list[dict]:
    """
    Resolve full, canonical member details for a group, guaranteeing that:
    1. String and ObjectId member_ids are normalized to BSON ObjectId.
    2. The leader is always included as a member (flagged is_leader: True).
    3. The leader is sorted first in the list.
    """
    leader_oid = doc.get(Field.LEADER_ID)
    raw_member_ids = doc.get(Field.MEMBER_IDS, [])

    member_oids = set()
    for m in raw_member_ids:
        if isinstance(m, ObjectId):
            member_oids.add(m)
        elif isinstance(m, str) and ObjectId.is_valid(m):
            member_oids.add(ObjectId(m))
    if leader_oid:
        if isinstance(leader_oid, ObjectId):
            member_oids.add(leader_oid)
        elif isinstance(leader_oid, str) and ObjectId.is_valid(leader_oid):
            member_oids.add(ObjectId(leader_oid))

    users = list(mongo.db[UserFields.COLLECTION].find(
        {UserFields.ID: {"$in": list(member_oids)}},
        {UserFields.NAME: 1, UserFields.ROLL: 1, UserFields.EMAIL: 1, UserFields.SECTION: 1, UserFields.DEPT: 1},
    ))

    leader_str = str(leader_oid) if leader_oid else ""
    members = []
    for u in users:
        uid = str(u[UserFields.ID])
        members.append({
            "id": uid,
            "name": u.get(UserFields.NAME, ""),
            "roll": u.get(UserFields.ROLL, ""),
            "email": u.get(UserFields.EMAIL, ""),
            "section": u.get(UserFields.SECTION, ""),
            "dept": u.get(UserFields.DEPT, ""),
            "is_leader": uid == leader_str,
        })

    members.sort(key=lambda m: (not m["is_leader"], m["name"]))
    return members


def list_manager_groups(
    page: int = 1,
    limit: int = 10,
    status: str | None = None,
    course: str | None = None,
    dept: str | None = None,
    search: str | None = None,
) -> dict:
    """
    List all groups with pagination and status counters for manager dashboard.
    """
    page = max(1, int(page))
    limit = max(1, min(100, int(limit)))
    skip = (page - 1) * limit

    base_query = {Field.STATUS: {"$ne": Status.DELETED}}

    # Calculate real-time counts across all active groups
    count_all = mongo.db[COLLECTION].count_documents(base_query)
    count_pending = mongo.db[COLLECTION].count_documents({**base_query, Field.STATUS: Status.PENDING})
    count_approved = mongo.db[COLLECTION].count_documents({**base_query, Field.STATUS: Status.APPROVED})
    count_rejected = mongo.db[COLLECTION].count_documents({**base_query, Field.STATUS: Status.REJECTED})

    filter_query = dict(base_query)

    if status and status.lower() != "all":
        filter_query[Field.STATUS] = status.lower()

    if course and course.strip() and course.lower() != "all":
        filter_query[Field.COURSE] = {"$regex": f"^{re.escape(course.strip())}$", "$options": "i"}

    if dept and dept.strip() and dept.lower() != "all":
        filter_query[Field.DEPT] = {"$regex": f"^{re.escape(dept.strip())}$", "$options": "i"}

    if search and search.strip():
        term = re.compile(re.escape(search.strip()), re.IGNORECASE)
        filter_query["$or"] = [
            {Field.NAME: term},
            {Field.PROJECT_TITLE: term},
            {Field.COURSE: term},
            {Field.SECTION: term},
        ]

    total = mongo.db[COLLECTION].count_documents(filter_query)
    pages = max(1, math.ceil(total / limit))

    docs = list(
        mongo.db[COLLECTION]
        .find(filter_query)
        .sort(Field.CREATED_AT, -1)
        .skip(skip)
        .limit(limit)
    )

    items = []
    for doc in docs:
        serialized = _serialize_manager_group(doc)
        resolved_members = _resolve_group_members(doc)
        leader_oid = doc.get(Field.LEADER_ID)

        # Leader details
        leader_doc = mongo.db[UserFields.COLLECTION].find_one(
            {UserFields.ID: leader_oid},
            {UserFields.NAME: 1, UserFields.ROLL: 1, UserFields.EMAIL: 1, UserFields.SECTION: 1},
        )
        if leader_doc:
            serialized["leader_name"] = leader_doc.get(UserFields.NAME, "")
            serialized["leader_roll"] = leader_doc.get(UserFields.ROLL, "")
            serialized["leader_email"] = leader_doc.get(UserFields.EMAIL, "")
            serialized["leader_section"] = leader_doc.get(UserFields.SECTION, "")

        serialized["members"] = resolved_members
        serialized["member_count"] = len(resolved_members)

        # Course constraints
        course_doc = mongo.db.courses.find_one({
            "name": doc.get(Field.COURSE, ""),
            "dept": (doc.get(Field.DEPT, "")).upper(),
            "deleted": {"$ne": True},
        })
        serialized["min_group"] = course_doc.get("min_group", 2) if course_doc else 2
        serialized["max_group"] = course_doc.get("max_group", 4) if course_doc else 4

        items.append(serialized)

    return {
        "items": items,
        "total": total,
        "page": page,
        "pages": pages,
        "limit": limit,
        "counts": {
            "all": count_all,
            "pending": count_pending,
            "approved": count_approved,
            "rejected": count_rejected,
        },
    }


def get_manager_group_detail(group_id: str) -> dict:
    """Fetch complete group information for manager inspection."""
    doc = mongo.db[COLLECTION].find_one({
        Field.ID: _oid(group_id),
        Field.STATUS: {"$ne": Status.DELETED},
    })
    if doc is None:
        raise ValueError("Group not found.")

    serialized = _serialize_manager_group(doc)
    resolved_members = _resolve_group_members(doc)
    leader_oid = doc.get(Field.LEADER_ID)

    leader_doc = mongo.db[UserFields.COLLECTION].find_one(
        {UserFields.ID: leader_oid},
        {UserFields.NAME: 1, UserFields.ROLL: 1, UserFields.EMAIL: 1, UserFields.SECTION: 1, UserFields.DEPT: 1},
    )
    if leader_doc:
        serialized["leader_name"] = leader_doc.get(UserFields.NAME, "")
        serialized["leader_roll"] = leader_doc.get(UserFields.ROLL, "")
        serialized["leader_email"] = leader_doc.get(UserFields.EMAIL, "")

    serialized["members"] = resolved_members
    serialized["member_count"] = len(resolved_members)

    # Approver or Rejecter info if present
    if doc.get(Field.APPROVED_BY):
        approver = mongo.db[UserFields.COLLECTION].find_one(
            {UserFields.ID: doc[Field.APPROVED_BY]},
            {UserFields.NAME: 1, UserFields.EMAIL: 1},
        )
        if approver:
            serialized["approver_name"] = approver.get(UserFields.NAME, "")

    if doc.get(Field.REJECTED_BY):
        rejecter = mongo.db[UserFields.COLLECTION].find_one(
            {UserFields.ID: doc[Field.REJECTED_BY]},
            {UserFields.NAME: 1, UserFields.EMAIL: 1},
        )
        if rejecter:
            serialized["rejecter_name"] = rejecter.get(UserFields.NAME, "")

    return serialized


def get_manager_group_workspace(group_id: str) -> dict:
    """
    Fetch comprehensive project workspace dossier including:
    - Group overview & metadata
    - Members (with leader indicator)
    - Proposal attachment details
    - Sprints and Milestones chronological activity timeline
    - Submissions and grades
    """
    g_oid = _oid(group_id)
    doc = mongo.db[COLLECTION].find_one({
        Field.ID: g_oid,
        Field.STATUS: {"$ne": Status.DELETED},
    })
    if doc is None:
        raise ValueError("Group not found.")

    serialized = _serialize_manager_group(doc)
    resolved_members = _resolve_group_members(doc)
    leader_oid = doc.get(Field.LEADER_ID)

    leader_doc = mongo.db[UserFields.COLLECTION].find_one(
        {UserFields.ID: leader_oid},
        {UserFields.NAME: 1, UserFields.ROLL: 1, UserFields.EMAIL: 1, UserFields.SECTION: 1, UserFields.DEPT: 1},
    )
    if leader_doc:
        serialized["leader_name"] = leader_doc.get(UserFields.NAME, "")
        serialized["leader_roll"] = leader_doc.get(UserFields.ROLL, "")
        serialized["leader_email"] = leader_doc.get(UserFields.EMAIL, "")
        serialized["leader_section"] = leader_doc.get(UserFields.SECTION, "")

    serialized["members"] = resolved_members
    serialized["member_count"] = len(resolved_members)

    # Course constraints
    course_name = doc.get(Field.COURSE, "")
    course_doc = mongo.db.courses.find_one({
        "name": course_name,
        "deleted": {"$ne": True},
    })
    serialized["min_group"] = course_doc.get("min_group", 2) if course_doc else 2
    serialized["max_group"] = course_doc.get("max_group", 4) if course_doc else 4

    # Build chronological timeline of sprints & milestones
    course_filter = {"$or": [{"course": course_name}, {"course": "All Courses"}]}
    iterations = list(mongo.db.iterations.find(course_filter).sort([
        ("sprint_name", 1),
        ("milestone_order", 1),
        ("createdAt", 1)
    ]))

    # Submissions lookup for this group
    submissions_by_iter = {}
    subs = list(mongo.db.submissions.find({"group_id": g_oid}))
    for s in subs:
        submissions_by_iter[str(s.get("iteration_id"))] = s

    # Evaluations lookup for members of this group
    member_id_strs = [m["id"] for m in resolved_members]
    member_oids = [ObjectId(uid) for uid in member_id_strs if ObjectId.is_valid(uid)]

    evals_by_iter = {}
    evals = list(mongo.db.student_evaluations.find({
        "$or": [
            {"group_id": g_oid},
            {"student_id": {"$in": member_oids}}
        ]
    }))
    for ev in evals:
        iter_str = str(ev.get("iteration_id"))
        if iter_str not in evals_by_iter:
            evals_by_iter[iter_str] = []
        evals_by_iter[iter_str].append(ev)

    sprints_dict = {}
    for it in iterations:
        it_id = str(it["_id"])
        sprint_name = it.get("sprint_name") or "Sprint 1 — Requirement Engineering"
        sprint_desc = it.get("sprint_description") or ""

        if sprint_name not in sprints_dict:
            sprints_dict[sprint_name] = {
                "sprint_name": sprint_name,
                "sprint_description": sprint_desc,
                "milestones": []
            }

        sub = submissions_by_iter.get(it_id)
        sub_info = None
        if sub:
            sub_at = sub.get("submitted_at")
            sub_info = {
                "id": str(sub["_id"]),
                "file_name": sub.get("file_name"),
                "file_url": sub.get("file_url"),
                "file_size": sub.get("file_size"),
                "note": sub.get("note"),
                "is_late": sub.get("is_late", False),
                "submitted_at": sub_at.isoformat() if isinstance(sub_at, datetime) else str(sub_at) if sub_at else None,
            }

        # Calculate evaluation marks for milestone
        ev_list = evals_by_iter.get(it_id, [])
        evaluation_info = None
        if ev_list:
            avg_score = sum(e.get("total_weighted_score", 0) for e in ev_list) / len(ev_list)
            max_score = ev_list[0].get("max_possible_score", 100)
            feedback = "; ".join(filter(None, [e.get("feedback") for e in ev_list]))
            evaluation_info = {
                "marks_awarded": round(avg_score, 1),
                "max_marks": max_score,
                "feedback": feedback,
            }

        rubrics = it.get("rubrics", [])
        total_rubric_weight = sum(r.get("weight", 0) for r in rubrics) if rubrics else 100

        deadline_val = it.get("deadline")
        deadline_str = deadline_val.isoformat() if isinstance(deadline_val, datetime) else str(deadline_val) if deadline_val else None

        milestone_data = {
            "milestone_id": it_id,
            "title": it.get("title", ""),
            "details": it.get("details", ""),
            "deadline": deadline_str,
            "weight": total_rubric_weight,
            "milestone_order": it.get("milestone_order", 1),
            "milestone_type": it.get("milestone_type", "deliverable"),
            "rubrics_count": len(rubrics),
            "submission": sub_info,
            "evaluation": evaluation_info,
        }
        sprints_dict[sprint_name]["milestones"].append(milestone_data)

    timeline = list(sprints_dict.values())

    return {
        "group": serialized,
        "members": resolved_members,
        "timeline": timeline,
    }


def approve_group(manager_id: str, group_id: str) -> dict:
    """
    Approve a group proposal.
    """
    now = datetime.now(timezone.utc)
    result = mongo.db[COLLECTION].find_one_and_update(
        {
            Field.ID: _oid(group_id),
            Field.STATUS: {"$in": [Status.PENDING, Status.REJECTED]},
        },
        {
            "$set": {
                Field.STATUS: Status.APPROVED,
                Field.APPROVED_BY: _oid(manager_id),
                Field.APPROVED_AT: now,
                Field.REJECTION_REASON: None,
                Field.UPDATED_AT: now,
            },
            "$inc": {Field.VERSION: 1},
        },
        return_document=True,
    )
    if result is None:
        group = mongo.db[COLLECTION].find_one({Field.ID: _oid(group_id)})
        if group is None:
            raise ValueError("Group not found.")
        if group.get(Field.STATUS) == Status.APPROVED:
            raise ValueError("Group is already approved.")
        raise ValueError(f"Cannot approve group in '{group.get(Field.STATUS)}' status.")

    return _serialize_manager_group(result)


def reject_group(manager_id: str, group_id: str, reason: str) -> dict:
    """
    Reject a group proposal with mandatory constructive feedback reason.
    """
    clean_reason = reason.strip()
    if not clean_reason:
        raise ValueError("A clear rejection reason / feedback is required for students.")

    now = datetime.now(timezone.utc)
    result = mongo.db[COLLECTION].find_one_and_update(
        {
            Field.ID: _oid(group_id),
            Field.STATUS: {"$in": [Status.PENDING, Status.APPROVED]},
        },
        {
            "$set": {
                Field.STATUS: Status.REJECTED,
                Field.REJECTED_BY: _oid(manager_id),
                Field.REJECTED_AT: now,
                Field.REJECTION_REASON: clean_reason,
                Field.UPDATED_AT: now,
            },
            "$inc": {Field.VERSION: 1},
        },
        return_document=True,
    )
    if result is None:
        group = mongo.db[COLLECTION].find_one({Field.ID: _oid(group_id)})
        if group is None:
            raise ValueError("Group not found.")
        raise ValueError(f"Cannot reject group in '{group.get(Field.STATUS)}' status.")

    return _serialize_manager_group(result)
