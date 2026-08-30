"""Business logic for announcement CRUD operations."""

from datetime import datetime, timezone

from bson import ObjectId

from app.extensions import mongo
from app.models.announcement import AnnouncementFields


def _object_id(announcement_id: str) -> ObjectId:
    if not ObjectId.is_valid(announcement_id):
        raise ValueError("Invalid announcement ID.")
    return ObjectId(announcement_id)


def _serialize(document: dict | None) -> dict | None:
    if document is None:
        return None
    result = dict(document)
    result["id"] = str(result.pop(AnnouncementFields.ID))
    for key, value in result.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
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
    return [_serialize(document) for document in documents]


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
    """Permanently delete an announcement."""
    document = mongo.db[AnnouncementFields.COLLECTION].find_one_and_delete(
        {AnnouncementFields.ID: _object_id(announcement_id)}
    )
    return _serialize(document)