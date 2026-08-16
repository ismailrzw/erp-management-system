# backend/app/models/survey.py
"""Field constants for the surveys collection."""

COLLECTION = "surveys"


class Status:
    DRAFT = "draft"
    PUBLISHED = "published"
    CLOSED = "closed"


class Field:
    ID = "_id"
    TITLE = "title"
    COURSE = "course"
    STATUS = "status"
    QUESTIONS = "questions"
    PUBLISHED_AT = "published_at"
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"
