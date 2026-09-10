# backend/app/models/iteration.py
"""Constants for the 'iterations' and 'submissions' collections."""

COLLECTION_ITERATIONS = "iterations"
COLLECTION_SUBMISSIONS = "submissions"

class Field:
    ID           = "_id"
    TITLE        = "title"
    DETAILS      = "details"
    COURSE       = "course"
    DEADLINE     = "deadline"
    RUBRICS      = "rubrics"
    CREATED_AT   = "createdAt"
    UPDATED_AT   = "updatedAt"

class SubmissionField:
    ID           = "_id"
    GROUP_ID     = "group_id"
    ITERATION_ID = "iteration_id"
    SUBMITTED_BY = "submitted_by"
    FILE_URL     = "file_url"
    FILE_NAME    = "file_name"
    FILE_SIZE    = "file_size"
    NOTE         = "note"
    IS_LATE      = "is_late"
    SUBMITTED_AT = "submitted_at"
