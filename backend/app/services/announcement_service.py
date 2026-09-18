"""Business logic for announcement CRUD operations and user view tracking."""

import re
from datetime import datetime, timezone

from bson import ObjectId

from app.extensions import mongo
from app.models.announcement import AnnouncementFields, AnnouncementScope, AnnouncementViewFields
from app.models.group import Field as GroupField
from app.models.user import Role, UserFields


def _object_id(announcement_id: str) -> ObjectId:
    if not ObjectId.is_valid(announcement_id):
        raise ValueError("Invalid announcement ID.")
    return ObjectId(announcement_id)


def _serialize(document: dict | None) -> dict | None:
    if document is None:
        return None
    result = dict(document)
    result["id"] = str(result.pop(AnnouncementFields.ID))
    for key, value in list(result.items()):
        if isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, list):
            result[key] = [
                str(v) if isinstance(v, ObjectId) else v.isoformat() if isinstance(v, datetime) else v
                for v in value
            ]
    if AnnouncementFields.SCOPE not in result or not result[AnnouncementFields.SCOPE]:
        result[AnnouncementFields.SCOPE] = AnnouncementScope.BROADCAST
    if AnnouncementFields.TARGET_IDS not in result or result[AnnouncementFields.TARGET_IDS] is None:
        result[AnnouncementFields.TARGET_IDS] = []
    return result


def create_announcement(
    title: str,
    content: str,
    posted_by: str,
    date: str | None = None,
    scope: str = AnnouncementScope.BROADCAST,
    target_ids: list[str] | None = None,
) -> dict:
    """Create a new announcement with targeting scope."""
    now = datetime.now(timezone.utc)
    target_ids_clean = [t.strip() for t in (target_ids or []) if t and t.strip()]

    document = {
        AnnouncementFields.TITLE: title.strip(),
        AnnouncementFields.CONTENT: content,
        AnnouncementFields.DATE: date or now.isoformat(),
        AnnouncementFields.POSTED_BY: posted_by,
        AnnouncementFields.SCOPE: scope if scope in AnnouncementScope.ALL else AnnouncementScope.BROADCAST,
        AnnouncementFields.TARGET_IDS: target_ids_clean,
        AnnouncementFields.CREATED_AT: now,
        AnnouncementFields.UPDATED_AT: now,
    }
    result = mongo.db[AnnouncementFields.COLLECTION].insert_one(document)
    document[AnnouncementFields.ID] = result.inserted_id
    return _serialize(document)


def list_announcements() -> list[dict]:
    """List all announcements, newest first."""
    documents = mongo.db[AnnouncementFields.COLLECTION].find().sort(AnnouncementFields.CREATED_AT, -1)
    items = [_serialize(document) for document in documents]
    for item in items:
        item["is_recent"] = False
    return items


def list_announcements_for_user(user_id: str | None = None, role: str | None = None, limit: int | None = None) -> list[dict]:
    """
    List announcements enriched with user-specific `is_recent` boolean flags
    and filtered by targeting scope for students.
    """
    find_filter = {}

    user_doc = None
    user_oid = None
    if user_id:
        try:
            user_oid = _object_id(user_id)
            user_doc = mongo.db.users.find_one({"_id": user_oid})
        except Exception:  # noqa: BLE001
            user_doc = None
            user_oid = None

    # Filter for student role based on targeting scope
    if role == Role.STUDENT and user_doc:
        student_dept = user_doc.get(UserFields.DEPT, "")
        student_group_id = user_doc.get(GroupField.GROUP_ID)
        dept_patterns = [student_dept.upper(), student_dept.lower(), student_dept] if student_dept else []

        or_conditions = [
            {AnnouncementFields.SCOPE: AnnouncementScope.BROADCAST},
            {AnnouncementFields.SCOPE: {"$exists": False}},
            {AnnouncementFields.SCOPE: None},
        ]

        if dept_patterns:
            or_conditions.append({
                AnnouncementFields.SCOPE: AnnouncementScope.DEPARTMENT,
                AnnouncementFields.TARGET_IDS: {"$in": dept_patterns},
            })

        if student_group_id:
            or_conditions.append({
                AnnouncementFields.SCOPE: AnnouncementScope.GROUP,
                AnnouncementFields.TARGET_IDS: {"$in": [str(student_group_id)]},
            })

        find_filter = {"$or": or_conditions}

    query = mongo.db[AnnouncementFields.COLLECTION].find(find_filter).sort(AnnouncementFields.CREATED_AT, -1)
    if limit and limit > 0:
        query = query.limit(limit)
    documents = list(query)
    serialized = [_serialize(doc) for doc in documents]

    # Non-student roles (e.g. manager) should never see 'Recent' tags
    if not user_id or role != Role.STUDENT or not user_doc:
        for item in serialized:
            item["is_recent"] = False
        return serialized

    # 1. Load viewed announcements for this student
    viewed_docs = list(mongo.db[AnnouncementViewFields.COLLECTION].find(
        {AnnouncementViewFields.USER_ID: user_oid},
        {AnnouncementViewFields.ANNOUNCEMENT_ID: 1}
    ))
    viewed_id_strs = {str(v[AnnouncementViewFields.ANNOUNCEMENT_ID]) for v in viewed_docs}

    # 2. Extract recent announcement IDs stored on user doc
    raw_recent = user_doc.get(UserFields.RECENT_ANNOUNCEMENTS, [])
    recent_id_strs = {str(item) for item in raw_recent}

    # 3. Consider creation threshold (last_login_at)
    last_login = user_doc.get(UserFields.LAST_LOGIN_AT)
    last_login_dt = None
    if isinstance(last_login, datetime):
        last_login_dt = last_login if last_login.tzinfo else last_login.replace(tzinfo=timezone.utc)
    elif isinstance(last_login, str):
        try:
            last_login_dt = datetime.fromisoformat(last_login)
        except Exception:  # noqa: BLE001
            last_login_dt = None

    for item in serialized:
        ann_id_str = item["id"]
        # If student has viewed this announcement, it is never recent
        if ann_id_str in viewed_id_strs:
            item["is_recent"] = False
            continue

        # If it's already in the user's recent_announcements array
        if ann_id_str in recent_id_strs:
            item["is_recent"] = True
            continue

        # If created since last login session
        is_after_login = False
        created_val = item.get("created_at") or item.get("date")
        if last_login_dt and created_val:
            try:
                if isinstance(created_val, str):
                    ann_dt = datetime.fromisoformat(created_val)
                elif isinstance(created_val, datetime):
                    ann_dt = created_val
                else:
                    ann_dt = None

                if ann_dt:
                    if not ann_dt.tzinfo:
                        ann_dt = ann_dt.replace(tzinfo=timezone.utc)
                    if ann_dt >= last_login_dt:
                        is_after_login = True
            except Exception:  # noqa: BLE001
                is_after_login = False

        item["is_recent"] = is_after_login

    return serialized


def mark_announcement_viewed(announcement_id: str, user_id: str) -> bool:
    """Record that a user has viewed an announcement, untagging it as recent."""
    ann_oid = _object_id(announcement_id)
    user_oid = _object_id(user_id)
    now = datetime.now(timezone.utc)

    # 1. Upsert into announcement_views collection
    mongo.db[AnnouncementViewFields.COLLECTION].update_one(
        {
            AnnouncementViewFields.USER_ID: user_oid,
            AnnouncementViewFields.ANNOUNCEMENT_ID: ann_oid,
        },
        {"$setOnInsert": {AnnouncementViewFields.VIEWED_AT: now}},
        upsert=True,
    )

    # 2. Remove from user's recent_announcements array
    mongo.db.users.update_one(
        {"_id": user_oid},
        {"$pull": {UserFields.RECENT_ANNOUNCEMENTS: {"$in": [ann_oid, str(ann_oid)]}}}
    )
    return True


def mark_all_announcements_viewed(user_id: str) -> int:
    """Mark all announcements as viewed for the given student."""
    user_oid = _object_id(user_id)
    now = datetime.now(timezone.utc)

    all_announcements = list(mongo.db[AnnouncementFields.COLLECTION].find({}, {AnnouncementFields.ID: 1}))
    count = 0
    for ann in all_announcements:
        ann_oid = ann[AnnouncementFields.ID]
        mongo.db[AnnouncementViewFields.COLLECTION].update_one(
            {
                AnnouncementViewFields.USER_ID: user_oid,
                AnnouncementViewFields.ANNOUNCEMENT_ID: ann_oid,
            },
            {"$setOnInsert": {AnnouncementViewFields.VIEWED_AT: now}},
            upsert=True,
        )
        count += 1

    # Clear recent_announcements
    mongo.db.users.update_one(
        {"_id": user_oid},
        {"$set": {UserFields.RECENT_ANNOUNCEMENTS: []}}
    )
    return count


def get_announcement_by_id(announcement_id: str) -> dict | None:
    """Fetch a single announcement by its ID."""
    document = mongo.db[AnnouncementFields.COLLECTION].find_one({AnnouncementFields.ID: _object_id(announcement_id)})
    return _serialize(document)


def update_announcement(
    announcement_id: str,
    title: str | None = None,
    content: str | None = None,
    date: str | None = None,
    scope: str | None = None,
    target_ids: list[str] | None = None,
) -> dict | None:
    """Update an announcement's title, content, date, scope, and/or target_ids."""
    updates = {AnnouncementFields.UPDATED_AT: datetime.now(timezone.utc)}
    if title is not None:
        updates[AnnouncementFields.TITLE] = title.strip()
    if content is not None:
        updates[AnnouncementFields.CONTENT] = content
    if date is not None:
        updates[AnnouncementFields.DATE] = date
    if scope is not None and scope in AnnouncementScope.ALL:
        updates[AnnouncementFields.SCOPE] = scope
    if target_ids is not None:
        updates[AnnouncementFields.TARGET_IDS] = [t.strip() for t in target_ids if t and t.strip()]

    result = mongo.db[AnnouncementFields.COLLECTION].find_one_and_update(
        {AnnouncementFields.ID: _object_id(announcement_id)},
        {"$set": updates},
        return_document=True,
    )
    return _serialize(result)


def delete_announcement(announcement_id: str) -> dict | None:
    """Permanently delete an announcement and its associated view records."""
    ann_oid = _object_id(announcement_id)
    document = mongo.db[AnnouncementFields.COLLECTION].find_one_and_delete(
        {AnnouncementFields.ID: ann_oid}
    )
    if document:
        # Clean up view tracking records and user recent_announcements
        mongo.db[AnnouncementViewFields.COLLECTION].delete_many({AnnouncementViewFields.ANNOUNCEMENT_ID: ann_oid})
        mongo.db.users.update_many(
            {UserFields.RECENT_ANNOUNCEMENTS: {"$in": [ann_oid, str(ann_oid)]}},
            {"$pull": {UserFields.RECENT_ANNOUNCEMENTS: {"$in": [ann_oid, str(ann_oid)]}}}
        )
    return _serialize(document)