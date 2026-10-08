"""Business logic for announcement CRUD operations and user view tracking."""

from datetime import datetime, timezone

from bson import ObjectId

from app.extensions import mongo
from app.models.announcement import (
    AnnouncementFields,
    AnnouncementScope,
    AnnouncementViewFields,
)
from app.models.user import UserFields


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
    """Reuse persistent audience and read state across dashboards and history."""
    if not user_id:
        return []
    from app.blueprints.notifications import history
    return history(user_id, limit=limit or 50)["items"]


def mark_announcement_viewed(announcement_id: str, user_id: str) -> bool:
    """Record that a user has viewed an announcement, untagging it as recent."""
    ann_oid = _object_id(announcement_id)
    user_oid = _object_id(user_id)
    from app.blueprints.notifications import audience_query
    from app.services.milestone_service import current_user
    if not mongo.db.announcements.find_one({"$and": [{"_id": ann_oid}, audience_query(current_user(user_id))]}):
        raise ValueError("Announcement not found for your account.")
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

    from app.blueprints.notifications import audience_query
    from app.services.milestone_service import current_user
    all_announcements = list(mongo.db[AnnouncementFields.COLLECTION].find(audience_query(current_user(user_id)), {AnnouncementFields.ID: 1}))
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
