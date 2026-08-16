# backend/app/models/announcement.py
"""Field constants for the announcements collection."""

COLLECTION = "announcements"


class Field:
    ID = "_id"
    TITLE = "title"
    CONTENT = "content"
    POSTED_BY = "posted_by"
    DATE = "date"
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"
