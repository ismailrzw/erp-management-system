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

    for key, value in list(result.items()):
        if isinstance(value, datetime):
            result[key] = value.isoformat()
    return result


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
        member_oids = doc.get(Field.MEMBER_IDS, [])
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

        # Member list
        members_doc = list(mongo.db[UserFields.COLLECTION].find(
            {UserFields.ID: {"$in": member_oids}},
            {UserFields.NAME: 1, UserFields.ROLL: 1, UserFields.EMAIL: 1, UserFields.SECTION: 1},
        ))
        serialized["members"] = [
            {
                "id": str(m[UserFields.ID]),
                "name": m.get(UserFields.NAME, ""),
                "roll": m.get(UserFields.ROLL, ""),
                "email": m.get(UserFields.EMAIL, ""),
                "section": m.get(UserFields.SECTION, ""),
                "is_leader": m[UserFields.ID] == leader_oid,
            }
            for m in members_doc
        ]
        serialized["member_count"] = len(member_oids)

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
    member_oids = doc.get(Field.MEMBER_IDS, [])
    leader_oid = doc.get(Field.LEADER_ID)

    leader_doc = mongo.db[UserFields.COLLECTION].find_one(
        {UserFields.ID: leader_oid},
        {UserFields.NAME: 1, UserFields.ROLL: 1, UserFields.EMAIL: 1, UserFields.SECTION: 1, UserFields.DEPT: 1},
    )
    if leader_doc:
        serialized["leader_name"] = leader_doc.get(UserFields.NAME, "")
        serialized["leader_roll"] = leader_doc.get(UserFields.ROLL, "")
        serialized["leader_email"] = leader_doc.get(UserFields.EMAIL, "")

    members_doc = list(mongo.db[UserFields.COLLECTION].find(
        {UserFields.ID: {"$in": member_oids}},
        {UserFields.NAME: 1, UserFields.ROLL: 1, UserFields.EMAIL: 1, UserFields.SECTION: 1, UserFields.DEPT: 1},
    ))
    serialized["members"] = [
        {
            "id": str(m[UserFields.ID]),
            "name": m.get(UserFields.NAME, ""),
            "roll": m.get(UserFields.ROLL, ""),
            "email": m.get(UserFields.EMAIL, ""),
            "section": m.get(UserFields.SECTION, ""),
            "dept": m.get(UserFields.DEPT, ""),
            "is_leader": m[UserFields.ID] == leader_oid,
        }
        for m in members_doc
    ]
    serialized["member_count"] = len(member_oids)

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
