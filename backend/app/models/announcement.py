"""Announcement Model - field constants for announcements and announcement views."""


class AnnouncementFields:
    """Field name constants to prevent typos."""
    COLLECTION = "announcements"
    ID = "_id"
    TITLE = "title"
    CONTENT = "content"
    DATE = "date"
    POSTED_BY = "posted_by"
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"


class AnnouncementViewFields:
    """Field name constants for per-user announcement view tracking."""
    COLLECTION = "announcement_views"
    ID = "_id"
    USER_ID = "user_id"
    ANNOUNCEMENT_ID = "announcement_id"
    VIEWED_AT = "viewed_at"