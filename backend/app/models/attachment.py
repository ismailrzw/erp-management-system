# backend/app/models/attachment.py
"""Field constants for the attachments collection."""

COLLECTION = "attachments"


class Field:
    ID = "_id"
    TITLE = "title"
    FILE_NAME = "file_name"
    FILE_URL = "file_url"
    FILE_SIZE = "file_size"
    MIME_TYPE = "mime_type"
    UPLOADED_BY = "uploaded_by"
    UPLOADED_AT = "uploaded_at"
