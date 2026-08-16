# backend/app/models/join_request.py
"""Field constants for the join_requests collection."""

COLLECTION = "join_requests"


class Status:
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class Field:
    ID = "_id"
    GROUP_ID = "group_id"
    STUDENT_ID = "student_id"
    STATUS = "status"
    MESSAGE = "message"
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"
