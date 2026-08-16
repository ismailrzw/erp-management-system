# backend/app/models/audit_log.py
"""Field constants for the audit_log collection."""

COLLECTION = "audit_log"


class Action:
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    RESTORE = "restore"
    LOGIN = "login"
    CHANGE_PASSWORD = "change_password"


class Field:
    ID = "_id"
    TIMESTAMP = "timestamp"
    ACTOR_ID = "actor_id"
    ACTOR_ROLE = "actor_role"
    ENTITY = "entity"
    ACTION = "action"
    TARGET_ID = "target_id"
    OLD_VALUE = "old_value"
    NEW_VALUE = "new_value"
    IP_ADDRESS = "ip_address"
