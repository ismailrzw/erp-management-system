# backend/app/services/student_profile_service.py
"""
Business logic for a student's own profile management.

Responsibilities
----------------
- get_profile          : return own user document (password_hash stripped).
- update_profile       : update only recovery_email.
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
    result.pop(UserFields.RECENT_ANNOUNCEMENTS, None)
    for key, value in list(result.items()):
        if isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, list):
            result[key] = [
                str(v) if isinstance(v, ObjectId) else v.isoformat() if isinstance(v, datetime) else v
                for v in value
            ]
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
    Return the authenticated student's own profile enriched with active group/supervisor details.
    """
    user_doc = _get_active_student(student_id)
    profile_data = _serialize(user_doc)

    # Resolve group supervisor / evaluator dynamically
    group = mongo.db.groups.find_one({
        "member_ids": ObjectId(student_id),
        "status": {"$ne": "deleted"},
    })
    if group:
        profile_data["group_id"] = str(group["_id"])
        profile_data["group_name"] = group.get("name")
        profile_data["project_title"] = group.get("project_title")
        profile_data["supervisor_name"] = group.get("supervisor_name") or group.get("evaluator_name")
    else:
        profile_data["group_id"] = None
        profile_data["group_name"] = None
        profile_data["project_title"] = None
        profile_data["supervisor_name"] = None

    return profile_data


def update_profile(student_id: str, data: dict) -> dict:
    """
    Update a student's own editable profile fields.

    Only ``recovery_email`` may be changed.
    Identity and enrollment fields are rejected even in mixed payloads.

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
    if any(key != UserFields.RECOVERY_EMAIL for key in data):
        raise ValueError("Only Recovery Email can be changed; student identity and enrollment are read-only.")
    _get_active_student(student_id)
    update_payload = dict(data)

    if not update_payload:
        raise ValueError("No updatable fields provided.")

    update_payload[UserFields.UPDATED_AT] = datetime.now(timezone.utc)

    doc = mongo.db[UserFields.COLLECTION].find_one_and_update(
        {UserFields.ID: ObjectId(student_id), UserFields.ROLE: Role.STUDENT, UserFields.DELETED: {"$ne": True}},
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
