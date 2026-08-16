# backend/app/models/submission.py
"""Field constants for the submissions collection."""

COLLECTION = "submissions"


class Field:
    ID = "_id"
    GROUP_ID = "group_id"
    ITERATION_ID = "iteration_id"
    SUBMITTED_BY = "submitted_by"
    FILE_URL = "file_url"
    FILE_NAME = "file_name"
    FILE_SIZE = "file_size"
    NOTE = "note"
    IS_LATE = "is_late"
    SUBMITTED_AT = "submitted_at"
