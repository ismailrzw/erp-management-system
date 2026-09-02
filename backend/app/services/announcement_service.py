"""Business logic for announcement CRUD operations and user view tracking."""

from datetime import datetime, timezone

from bson import ObjectId

from app.extensions import mongo
from app.models.announcement import AnnouncementFields, AnnouncementViewFields
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
    return result


def create_announcement(title: str, content: str, posted_by: str, date: str | None = None) -> dict:
    """Create a new announcement."""
    now = datetime.now(timezone.utc)
    document = {
        AnnouncementFields.TITLE: title.strip(),
        AnnouncementFields.CONTENT: content,
        AnnouncementFields.DATE: date or now.isoformat(),
        AnnouncementFields.POSTED_BY: posted_by,
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
    List announcements enriched with user-specific `is_recent` boolean flags.

    - If role != 'student' (e.g. manager): `is_recent` is always False.
    - If role == 'student': `is_recent` is True if the announcement is in user's
      recent_announcements or was created after user's last login, AND has not
      yet been marked as viewed by this student.
    """
    query = mongo.db[AnnouncementFields.COLLECTION].find().sort(AnnouncementFields.CREATED_AT, -1)
    if limit and limit > 0:
        query = query.limit(limit)
    documents = list(query)
    serialized = [_serialize(doc) for doc in documents]

    # Non-student roles (e.g. manager) should never see 'Recent' tags
    if not user_id or role != Role.STUDENT:
        for item in serialized:
            item["is_recent"] = False
        return serialized

    try:
        user_oid = _object_id(user_id)
        user_doc = mongo.db.users.find_one({"_id": user_oid})
    except Exception:  # noqa: BLE001
        user_doc = None

    if not user_doc:
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


def update_announcement(announcement_id: str, title: str | None = None,
                         content: str | None = None, date: str | None = None) -> dict | None:
    """Update an announcement's title, content, and/or date."""
    updates = {AnnouncementFields.UPDATED_AT: datetime.now(timezone.utc)}
    if title is not None:
        updates[AnnouncementFields.TITLE] = title.strip()
    if content is not None:
        updates[AnnouncementFields.CONTENT] = content
    if date is not None:
        updates[AnnouncementFields.DATE] = date

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