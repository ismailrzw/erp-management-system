# backend/app/models/iteration.py
"""Field constants for the iterations collection."""

COLLECTION = "iterations"


class Field:
    ID = "_id"
    TITLE = "title"
    DETAILS = "details"
    COURSE = "course"
    DEADLINE = "deadline"
    RUBRICS = "rubrics"
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"
