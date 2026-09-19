# backend/app/models/course.py
"""Field constants for the courses collection."""

COLLECTION = "courses"

class Field:
    ID                       = "_id"
    NAME                     = "name"
    DEPT                     = "dept"
    MIN_GROUP                = "min_group"
    MAX_GROUP                = "max_group"
    GROUP_FORMATION_DEADLINE = "group_formation_deadline"
    DEADLINE                 = "group_formation_deadline"  # backward compatibility alias
    DELETED                  = "deleted"
    DELETED_AT               = "deleted_at"
    CREATED_AT               = "created_at"
    UPDATED_AT               = "updated_at"
