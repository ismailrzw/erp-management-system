# backend/app/models/department.py
"""Field constants for the departments collection."""

COLLECTION = "departments"


class Field:
    ID = "_id"
    NAME = "name"
    CODE = "code"
    DELETED = "deleted"
    DELETED_AT = "deleted_at"
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"
