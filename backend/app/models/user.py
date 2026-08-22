# backend/app/models/user.py
"""
User Model — field constants, role constants, and password helpers.

Stack: Flask-PyMongo (raw PyMongo driver) + Marshmallow for validation.
There is intentionally NO ORM model class here; the database layer
uses plain Python dicts inserted directly via PyMongo.

Database integrity notes
------------------------
To enforce uniqueness at the MongoDB layer (defence-in-depth beyond the
service-level checks), the following indexes MUST exist on the ``users``
collection.  The seed script creates them automatically; if you reset the
database manually, recreate them:

  db.users.create_index("email", unique=True)
  db.users.create_index("roll",  unique=True, sparse=True)
  # sparse=True so that non-student users (no roll field) are not rejected.
"""
from datetime import datetime, timezone
from typing import ClassVar

import bcrypt

# ==================== FIELD CONSTANTS ====================

class UserFields:
    """MongoDB field-name constants — prevents typos across the codebase."""
    COLLECTION    = "users"
    ID            = "_id"
    NAME          = "name"
    EMAIL         = "email"
    PASSWORD_HASH = "password_hash"
    ROLE          = "role"
    DEPT          = "dept"
    SECTION       = "section"
    COURSE        = "course"
    ROLL          = "roll"
    RECOVERY_EMAIL = "recovery_email"
    TYPE          = "type"
    DELETED       = "deleted"
    DELETED_AT    = "deleted_at"
    CREATED_AT    = "created_at"
    UPDATED_AT    = "updated_at"


# ==================== ROLE CONSTANTS ====================

class Role:
    """User role string constants."""
    MANAGER   = "pbl_manager"
    STUDENT   = "student"
    EVALUATOR = "evaluator"
    HOD       = "hod"
    HODIC     = "hodic"
    DEAN      = "dean"

    # Use tuples (immutable) instead of lists
    ALL:      ClassVar[tuple] = (MANAGER, STUDENT, EVALUATOR, HOD, HODIC, DEAN)
    OVERSIGHT: ClassVar[tuple] = (HOD, HODIC, DEAN)


# ==================== PASSWORD HELPERS ====================

def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt and return the decoded string."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plaintext: str, hashed: str) -> bool:
    """Return True if *plaintext* matches the stored bcrypt *hashed* string."""
    try:
        return bcrypt.checkpw(plaintext.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:  # noqa: BLE001 — malformed hashes must not raise
        return False


# ==================== TIMESTAMP HELPER ====================

def utcnow() -> datetime:
    """Return the current UTC datetime (timezone-aware)."""
    return datetime.now(timezone.utc)