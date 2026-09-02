# backend/app/services/student_service.py
"""Business logic for student operations."""

import random
import string
from datetime import datetime, timezone

import bcrypt
from bson import ObjectId
from bson.errors import InvalidId

from app.extensions import mongo
from app.models.user import Role, UserFields


def generate_student_email(roll: str, domain: str = "bnu.edu.pk") -> str:
    """Generate email from roll number."""
    return f"{roll.strip().upper()}@{domain}"


def generate_initial_password(roll: str) -> str:
    """Generate a readable initial password."""
    suffix = "".join(random.choices(string.digits, k=4))
    return f"BNU@{roll.upper()[:8]}{suffix}"


def _serialize_doc(document: dict | None) -> dict | None:
    """Convert any ObjectId and datetime fields in a document to JSON-safe types."""
    if not document:
        return document
    result = dict(document)
    if "_id" in result:
        result["id"] = str(result.pop("_id"))
    result.pop(UserFields.PASSWORD_HASH, None)
    for key, value in list(result.items()):
        if isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, list):
            result[key] = [str(v) if isinstance(v, ObjectId) else v for v in value]
        elif isinstance(value, dict):
            result[key] = _serialize_doc(value)
    return result


def create_student(data: dict) -> dict:
    """Create a new student account."""
    roll = data.get("roll", "").strip()
    
    existing = mongo.db.users.find_one({UserFields.ROLL: roll})
    if existing:
        raise ValueError(f"A student with roll '{roll}' already exists.")
    
    email = generate_student_email(roll)
    password = generate_initial_password(roll)
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode()
    
    student_doc = {
        UserFields.NAME: data.get("name", "").strip(),
        UserFields.EMAIL: email,
        UserFields.PASSWORD_HASH: password_hash,
        UserFields.ROLE: Role.STUDENT,
        UserFields.DEPT: data.get("dept", "").strip().upper(),
        UserFields.SECTION: data.get("section", "").strip().upper(),
        UserFields.COURSE: data.get("course", "").strip(),
        UserFields.ROLL: roll,
        "session": data.get("session", "").strip(),
        "teacher": data.get("teacher", "").strip(),
        UserFields.RECOVERY_EMAIL: data.get("recovery_email") or None,
        UserFields.DELETED: False,
        UserFields.DELETED_AT: None,
        UserFields.CREATED_AT: datetime.now(timezone.utc),
        UserFields.UPDATED_AT: datetime.now(timezone.utc),
    }
    
    result = mongo.db.users.insert_one(student_doc)
    
    return {
        "student_id": str(result.inserted_id),
        "id": str(result.inserted_id),
        "name": student_doc[UserFields.NAME],
        "roll": student_doc[UserFields.ROLL],
        "dept": student_doc[UserFields.DEPT],
        "section": student_doc[UserFields.SECTION],
        "course": student_doc[UserFields.COURSE],
        "teacher": student_doc["teacher"],
        "email": email,
        "password": password,
        "initial_password": password,
    }


def get_student_by_id(student_id: str) -> dict | None:
    """Get a student by ID."""
    try:
        student = mongo.db.users.find_one({
            "_id": ObjectId(student_id),
            UserFields.ROLE: Role.STUDENT
        })
        return _serialize_doc(student)
    except InvalidId:
        return None


def list_students(filters: dict | None = None, page: int = 1, limit: int = 20) -> dict:
    """List students with pagination and filters."""
    if filters is None:
        filters = {}
    
    query = {UserFields.ROLE: Role.STUDENT}
    
    if filters.get("dept"):
        query[UserFields.DEPT] = filters["dept"].upper()
    if filters.get("section"):
        query[UserFields.SECTION] = filters["section"].upper()
    if filters.get("deleted") is not None:
        query[UserFields.DELETED] = True if filters["deleted"] else {"$ne": True}
    else:
        query[UserFields.DELETED] = {"$ne": True}
    if filters.get("search"):
        import re
        pattern = re.compile(filters["search"], re.IGNORECASE)
        query["$or"] = [
            {UserFields.NAME: pattern},
            {UserFields.ROLL: pattern}
        ]
    
    skip = (page - 1) * limit
    total = mongo.db.users.count_documents(query)
    
    items = list(mongo.db.users.find(
        query,
        {UserFields.PASSWORD_HASH: 0}
    ).skip(skip).limit(limit))
    
    serialized_items = [_serialize_doc(item) for item in items]
    
    return {
        "items": serialized_items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": -(-total // limit)
    }


def update_student(student_id: str, data: dict) -> dict:
    """Update a student."""
    protected = [UserFields.EMAIL, UserFields.ROLL, UserFields.PASSWORD_HASH, UserFields.ROLE]
    for field in protected:
        data.pop(field, None)
    
    if not data:
        raise ValueError("No updatable fields provided.")
    
    data[UserFields.UPDATED_AT] = datetime.now(timezone.utc)
    
    result = mongo.db.users.update_one(
        {"_id": ObjectId(student_id), UserFields.ROLE: Role.STUDENT},
        {"$set": data}
    )
    
    if result.matched_count == 0:
        raise ValueError("Student not found.")
    
    return {"updated": True, "student_id": student_id}


def soft_delete_student(student_id: str) -> dict:
    """Soft delete a student."""
    now = datetime.now(timezone.utc)
    
    result = mongo.db.users.update_one(
        {"_id": ObjectId(student_id), UserFields.ROLE: Role.STUDENT, UserFields.DELETED: {"$ne": True}},
        {"$set": {UserFields.DELETED: True, UserFields.DELETED_AT: now, UserFields.UPDATED_AT: now}}
    )
    
    if result.matched_count == 0:
        raise ValueError("Student not found or already deleted.")
    
    mongo.db.groups.update_many(
        {"member_ids": ObjectId(student_id)},
        {"$pull": {"member_ids": ObjectId(student_id)}}
    )
    
    return {"deleted": True, "student_id": student_id}


def restore_student(student_id: str) -> dict:
    """Restore a soft-deleted student."""
    result = mongo.db.users.update_one(
        {"_id": ObjectId(student_id), UserFields.ROLE: Role.STUDENT, UserFields.DELETED: True},
        {"$set": {UserFields.DELETED: False, UserFields.DELETED_AT: None, UserFields.UPDATED_AT: datetime.now(timezone.utc)}}
    )
    
    if result.matched_count == 0:
        raise ValueError("Student not found or not deleted.")
    
    return {"restored": True, "student_id": student_id}


def permanent_delete_student(student_id: str) -> dict:
    """Permanently delete a student (only if already soft-deleted)."""
    student = mongo.db.users.find_one({
        "_id": ObjectId(student_id),
        UserFields.ROLE: Role.STUDENT,
        UserFields.DELETED: True
    })
    
    if not student:
        raise ValueError("Student not found or must be soft-deleted first.")
    
    mongo.db.users.delete_one({"_id": ObjectId(student_id)})
    
    return {"deleted": True, "student_id": student_id}
