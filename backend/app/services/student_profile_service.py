# backend/app/services/student_profile_service.py
"""
Business logic for a student's own profile management.

Responsibilities
----------------
- get_profile          : return own user document (password_hash stripped).
- update_profile       : update only name / recovery_email.
- change_password      : verify current bcrypt hash, set new one.

All functions accept a ``student_id`` string (the JWT identity), look up
the document in ``users``, and raise ``ValueError`` for every constraint
violation.  The blueprint maps ``ValueError`` → HTTP 4xx responses.
"""

from datetime import datetime, timezone

import bcrypt
from bson import ObjectId
from bson.errors import InvalidId

from app.extensions import mongo
from app.models.user import Role, UserFields

# ── Helpers ────────────────────────────────────────────────────────────────────

def _serialize(document: dict) -> dict:
    """Strip sensitive fields and convert ObjectId / datetime to JSON-safe types."""
    result = dict(document)
    result["id"] = str(result.pop(UserFields.ID))
    result.pop(UserFields.PASSWORD_HASH, None)
    for key, value in result.items():
        if isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
    return result


def _get_active_student(student_id: str) -> dict:
    """
    Fetch a non-deleted student by their ObjectId string.

    Raises
    ------
    ValueError
        If the ID is not a valid ObjectId, the student does not exist,
        is not a student, or has been soft-deleted.
    """
    try:
        oid = ObjectId(student_id)
    except InvalidId:
        raise ValueError("Invalid student ID.")

    doc = mongo.db[UserFields.COLLECTION].find_one({
        UserFields.ID:      oid,
        UserFields.ROLE:    Role.STUDENT,
        UserFields.DELETED: {"$ne": True},
    })
    if doc is None:
        raise ValueError("Student account not found.")
    return doc


# ── Public API ─────────────────────────────────────────────────────────────────

def get_profile(student_id: str) -> dict:
    """
    Return the authenticated student's own profile.

    Parameters
    ----------
    student_id:
        The ``sub`` claim from the JWT (string ObjectId).

    Returns
    -------
    dict
        Serialized user document without ``password_hash``.
    """
    return _serialize(_get_active_student(student_id))


def update_profile(student_id: str, data: dict) -> dict:
    """
    Update a student's own editable profile fields.

    Only ``name`` and ``recovery_email`` may be changed.
    Immutable fields (roll, email, dept, section, role, password_hash)
    are silently ignored even if present in *data*.

    Parameters
    ----------
    student_id:
        The JWT identity string.
    data:
        Dict produced by ``UpdateProfileSchema().load()``.

    Returns
    -------
    dict
        Updated serialized profile.

    Raises
    ------
    ValueError
        If no editable fields are supplied.
    """
    # Silently drop any immutable fields that slipped through
    immutable = {
        UserFields.EMAIL, UserFields.ROLL, UserFields.DEPT,
        UserFields.SECTION, UserFields.ROLE, UserFields.PASSWORD_HASH,
    }
    update_payload = {k: v for k, v in data.items() if k not in immutable and v is not None}

    if not update_payload:
        raise ValueError("No updatable fields provided.")

    update_payload[UserFields.UPDATED_AT] = datetime.now(timezone.utc)

    doc = mongo.db[UserFields.COLLECTION].find_one_and_update(
        {UserFields.ID: ObjectId(student_id), UserFields.ROLE: Role.STUDENT},
        {"$set": update_payload},
        return_document=True,
    )
    if doc is None:
        raise ValueError("Student account not found.")
    return _serialize(doc)


def change_password(student_id: str, current_password: str, new_password: str) -> dict:
    """
    Verify the current password and replace it with a new bcrypt hash.

    Parameters
    ----------
    student_id:
        The JWT identity string.
    current_password:
        Plaintext current password supplied by the student.
    new_password:
        New plaintext password (already validated for length by the schema).

    Returns
    -------
    dict
        ``{"changed": True, "student_id": str}``

    Raises
    ------
    ValueError
        - If the current password does not match the stored hash (401-level).
        - If the student account is not found.
    """
    doc = _get_active_student(student_id)

    stored_hash: str = doc.get(UserFields.PASSWORD_HASH, "")
    try:
        match = bcrypt.checkpw(
            current_password.encode("utf-8"),
            stored_hash.encode("utf-8"),
        )
    except Exception:  # noqa: BLE001 — malformed hashes must not raise 500
        match = False

    if not match:
        raise ValueError("Current password is incorrect.")

    new_hash = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    mongo.db[UserFields.COLLECTION].update_one(
        {UserFields.ID: ObjectId(student_id)},
        {"$set": {
            UserFields.PASSWORD_HASH: new_hash,
            UserFields.UPDATED_AT:   datetime.now(timezone.utc),
        }},
    )
    return {"changed": True, "student_id": student_id}
