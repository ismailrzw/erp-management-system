"""Field constants for attachment documents."""


COLLECTION = "attachments"


class AttachmentFields:
    ID = "_id"
    TITLE = "title"
    ORIGINAL_FILENAME = "original_filename"
    STORED_FILENAME = "stored_filename"
    FILE_PATH = "file_path"
    FILE_URL = "file_url"
    MIME_TYPE = "mime_type"
    SIZE = "size"
    UPLOADED_BY = "uploaded_by"
    UPLOADED_AT = "uploaded_at"
    UPDATED_AT = "updated_at"
