# backend/app/models/sprint.py
"""Sprint entity model and collection constants."""

COLLECTION_SPRINTS = "sprints"

class SprintField:
    ID = "_id"
    NAME = "name"
    DESCRIPTION = "description"
    COURSE = "course"
    ORDER = "order"
    DELETED = "deleted"
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"
