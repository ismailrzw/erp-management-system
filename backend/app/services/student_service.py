import random
import re
import string
from datetime import datetime, timezone

import bcrypt
from bson import ObjectId
from bson.errors import InvalidId
from marshmallow import ValidationError

from app.config import Config
from app.extensions import mongo
from app.models.group import COLLECTION as GROUPS_COLLECTION
from app.models.group import Field as GroupField
from app.models.group import Status as GroupStatus
from app.models.user import Role, UserFields
from app.schemas.student_schema import CreateStudentSchema, UpdateStudentSchema
from app.services.academic_integrity_service import (
    AcademicConflict,
    assert_deletable,
    student_group,
    validate_enrollment,
)
from app.services.academic_write_service import academic_write
from app.services.auth_service import AuthService
from app.services.email_service import (
    send_password_set_email,
    send_student_credentials_email,
    send_ungrouped_notification,
)


def generate_student_email(roll: str, domain: str = "bnu.edu.pk") -> str:
    """Generate an email from the normalized, uppercase roll number."""
    return f"{roll.strip().upper()}@{domain}"


def generate_initial_password(roll: str) -> str:
    """Generate a readable initial fallback password."""
    suffix = "".join(random.choices(string.digits, k=4))
    return f"BNU@{roll.lower()[:8]}{suffix}"


def _serialize_doc(document: dict | None) -> dict | None:
    """Convert any ObjectId and datetime fields in a document to JSON-safe types."""
    if not document:
        return document
    result = dict(document)
    if "_id" in result:
        result["id"] = str(result.pop("_id"))
    result.pop(UserFields.PASSWORD_HASH, None)
    result.pop("teacher", None)
    result.pop("assigned_teacher_id", None)
    result.pop("assigned_evaluator_id", None)
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


@academic_write
def create_student(data: dict) -> dict:
    """Create a new student account and dispatch password-set link."""
    try:
        data = CreateStudentSchema().load(data)
    except ValidationError as exc:
        raise ValueError(f"Invalid student fields: {exc.messages}") from exc
    validate_enrollment(data["dept"], data.get("course", ""))
    roll = data.get("roll", "").strip().lower()

    if not roll:
        raise ValueError("Roll number is required.")

    existing = mongo.db.users.find_one({
        UserFields.ROLL: {"$regex": f"^{re.escape(roll)}$", "$options": "i"},
    })
    if existing:
        raise ValueError(f"A student with roll '{roll}' already exists.")

    email = generate_student_email(roll)
    raw_temp_password = generate_initial_password(roll)
    password_hash = bcrypt.hashpw(raw_temp_password.encode("utf-8"), bcrypt.gensalt()).decode()

    now = datetime.now(timezone.utc)
    student_doc = {
        UserFields.NAME: data.get("name", "").strip(),
        UserFields.EMAIL: email,
        UserFields.PASSWORD_HASH: password_hash,
        UserFields.ROLE: Role.STUDENT,
        UserFields.DEPT: data.get("dept", "").strip().upper(),
        "dept_id": mongo.db.departments.find_one({"code": data["dept"].upper(), "deleted": {"$ne": True}})["_id"],
        "course_id": (mongo.db.courses.find_one({"name": data.get("course"), "deleted": {"$ne": True}}) or {}).get("_id"),
        UserFields.SECTION: data.get("section", "").strip().upper(),
        UserFields.COURSE: data.get("course", "").strip(),
        UserFields.ROLL: roll,
        "session": data.get("session", "").strip(),
        UserFields.RECOVERY_EMAIL: (data.get("recovery_email") or "").strip().lower() or None,
        "password_set": False,
        "password_set_at": None,
        UserFields.DELETED: False,
        UserFields.DELETED_AT: None,
        UserFields.CREATED_AT: now,
        UserFields.UPDATED_AT: now,
    }

    result = mongo.db.users.insert_one(student_doc)
    student_id = str(result.inserted_id)

    # Generate one-time setup token and dispatch email with credentials + setup link
    email_sent = False
    try:
        raw_token = AuthService.create_password_set_token(student_id)
        setup_link = f"{Config.FRONTEND_URL}/set-password?token={raw_token}"
        email_sent = send_student_credentials_email(
            to_email=email,
            student_name=student_doc[UserFields.NAME],
            roll=student_doc[UserFields.ROLL],
            temporary_password=raw_temp_password,
            setup_link=setup_link,
        )
    except Exception as email_err:  # noqa: BLE001
        mongo.db.users.update_one({"_id": result.inserted_id}, {"$set": {"email_error": str(email_err)}})

    return {
        "student_id": student_id,
        "id": student_id,
        "name": student_doc[UserFields.NAME],
        "roll": student_doc[UserFields.ROLL],
        "dept": student_doc[UserFields.DEPT],
        "section": student_doc[UserFields.SECTION],
        "course": student_doc[UserFields.COURSE],
        "email": email,
        "temporary_password": raw_temp_password,
        "password_set_email_sent": email_sent,
    }


def get_student_by_id(student_id: str) -> dict | None:
    """Get a student by ID."""
    try:
        student = mongo.db.users.find_one({
            "_id": ObjectId(student_id),
            UserFields.ROLE: Role.STUDENT
        })
        result = _serialize_doc(student)
        if result:
            result["academic_locked"] = bool(student.get("group_id") or student_group(student))
        return result
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
    page_refs = [ref for student in items for ref in (student["_id"], str(student["_id"]))]
    groups = mongo.db.groups.find({"$or": [
        {"member_ids": {"$in": page_refs}}, {"leader_id": {"$in": page_refs}},
    ]}, {"member_ids": 1, "leader_id": 1})
    grouped_ids = set()
    for group in groups:
        grouped_ids.update(str(member) for member in group.get("member_ids", []))
        if group.get("leader_id"):
            grouped_ids.add(str(group["leader_id"]))
    for item, student in zip(serialized_items, items):
        item["academic_locked"] = bool(student.get("group_id") or str(student["_id"]) in grouped_ids)

    return {
        "items": serialized_items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": -(-total // limit)
    }


@academic_write
def update_student(student_id: str, data: dict) -> dict:
    """Correct academic enrollment without changing identity or grouped placement."""
    try:
        data = UpdateStudentSchema().load(data)
    except ValidationError as exc:
        raise ValueError(f"Invalid student fields: {exc.messages}") from exc
    if not data:
        raise ValueError("No updatable fields provided.")
    if not ObjectId.is_valid(student_id):
        raise ValueError("Invalid student ID.")
    student = mongo.db.users.find_one({"_id": ObjectId(student_id), "role": Role.STUDENT, "deleted": {"$ne": True}})
    if not student:
        raise ValueError("Student not found.")
    if "dept" in data:
        data["dept"] = data["dept"].upper()
    changed_enrollment = any(data[key] != student.get(key, "") for key in ("dept", "course") if key in data)
    if changed_enrollment:
        if student.get("group_id") or student_group(student):
            raise AcademicConflict("Department and Course cannot be changed while this student belongs to a group.")
        validate_enrollment(data.get("dept", student.get("dept", "")), data.get("course", student.get("course", "")))
    if changed_enrollment:
        data["dept_id"] = mongo.db.departments.find_one({"code": data.get("dept", student.get("dept")), "deleted": {"$ne": True}})["_id"]
        data["course_id"] = (mongo.db.courses.find_one({"name": data.get("course", student.get("course")), "deleted": {"$ne": True}}) or {}).get("_id")
    data[UserFields.UPDATED_AT] = datetime.now(timezone.utc)

    result = mongo.db.users.update_one(
        {"_id": ObjectId(student_id), UserFields.ROLE: Role.STUDENT, "deleted": {"$ne": True}},
        {"$set": data}
    )

    if result.matched_count == 0:
        raise ValueError("Student not found.")

    return {"updated": True, "student_id": student_id}


@academic_write
def soft_delete_student(student_id: str) -> dict:
    """Soft delete a student."""
    if not ObjectId.is_valid(student_id):
        raise ValueError("Invalid student ID.")
    student = mongo.db.users.find_one({"_id": ObjectId(student_id), "role": Role.STUDENT, "deleted": {"$ne": True}})
    if not student:
        raise ValueError("Student not found or already deleted.")
    assert_deletable("student", student)
    now = datetime.now(timezone.utc)

    result = mongo.db.users.update_one(
        {"_id": ObjectId(student_id), UserFields.ROLE: Role.STUDENT, UserFields.DELETED: {"$ne": True}},
        {"$set": {UserFields.DELETED: True, UserFields.DELETED_AT: now, UserFields.UPDATED_AT: now}}
    )

    if result.matched_count == 0:
        raise ValueError("Student not found or already deleted.")

    return {"deleted": True, "student_id": student_id}


@academic_write
def restore_student(student_id: str) -> dict:
    """Restore a soft-deleted student."""
    from app.services.academic_integrity_service import (
        assert_restorable,
        validate_enrollment,
    )
    record = mongo.db.users.find_one({"_id": ObjectId(student_id)})
    if record:
        assert_restorable("student", record)
    if record:
        validate_enrollment(record.get("dept", ""), record.get("course", ""))

    result = mongo.db.users.update_one(
        {"_id": ObjectId(student_id), UserFields.ROLE: Role.STUDENT, UserFields.DELETED: True},
        {"$set": {UserFields.DELETED: False, UserFields.DELETED_AT: None, UserFields.UPDATED_AT: datetime.now(timezone.utc)}}
    )

    if result.matched_count == 0:
        raise ValueError("Student not found or not deleted.")

    return {"restored": True, "student_id": student_id}


@academic_write
def permanent_delete_student(student_id: str) -> dict:
    """Permanently delete a student (only if already soft-deleted)."""
    student = mongo.db.users.find_one({
        "_id": ObjectId(student_id),
        UserFields.ROLE: Role.STUDENT,
        UserFields.DELETED: True
    })

    if not student:
        raise ValueError("Student not found or must be soft-deleted first.")

    assert_deletable("student", student)
    mongo.db.users.delete_one({"_id": ObjectId(student_id)})

    return {"deleted": True, "student_id": student_id}


def resend_password_set_email(student_id: str) -> dict:
    """Regenerate a one-time password setup token and re-send the activation email."""
    student = mongo.db.users.find_one({
        "_id": ObjectId(student_id),
        UserFields.ROLE: Role.STUDENT,
        UserFields.DELETED: {"$ne": True},
    })
    if not student:
        raise ValueError("Student not found.")

    email = student.get(UserFields.EMAIL)
    name = student.get(UserFields.NAME, "Student")

    raw_token = AuthService.create_password_set_token(student_id)
    setup_link = f"{Config.FRONTEND_URL}/set-password?token={raw_token}"
    sent = send_password_set_email(email, name, setup_link)

    return {
        "success": True,
        "student_id": student_id,
        "email": email,
        "email_sent": sent,
    }


def list_ungrouped_students(dept: str | None = None, course: str | None = None) -> list[dict]:
    """
    List all active students who do not belong to any active project group.
    Supports filtering by department and course.
    """
    # 1. Gather all student IDs currently belonging to non-deleted groups
    active_groups = list(mongo.db[GROUPS_COLLECTION].find(
        {GroupField.STATUS: {"$ne": GroupStatus.DELETED}},
        {GroupField.MEMBER_IDS: 1},
    ))
    grouped_student_oids = set()
    for g in active_groups:
        for m in g.get(GroupField.MEMBER_IDS, []):
            if isinstance(m, ObjectId):
                grouped_student_oids.add(m)
            elif isinstance(m, str) and ObjectId.is_valid(m):
                grouped_student_oids.add(ObjectId(m))

    # 2. Query active students not in the grouped set
    query = {
        UserFields.ROLE: Role.STUDENT,
        UserFields.DELETED: {"$ne": True},
        "_id": {"$nin": list(grouped_student_oids)},
        "$or": [
            {GroupField.GROUP_ID: None},
            {GroupField.GROUP_ID: {"$exists": False}},
            {GroupField.GROUP_ID: ""},
        ],
    }

    if dept and dept.strip() and dept.lower() != "all":
        query[UserFields.DEPT] = {"$regex": f"^{re.escape(dept.strip())}$", "$options": "i"}

    if course and course.strip() and course.lower() != "all":
        query[UserFields.COURSE] = {"$regex": f"^{re.escape(course.strip())}$", "$options": "i"}

    cursor = mongo.db.users.find(query, {UserFields.PASSWORD_HASH: 0}).sort(UserFields.ROLL, 1)

    ungrouped = []
    for doc in cursor:
        ungrouped.append({
            "id": str(doc["_id"]),
            "roll": doc.get(UserFields.ROLL, ""),
            "name": doc.get(UserFields.NAME, ""),
            "dept": doc.get(UserFields.DEPT, ""),
            "section": doc.get(UserFields.SECTION, ""),
            "course": doc.get(UserFields.COURSE, ""),
            "session": doc.get("session", ""),
            "email": doc.get(UserFields.EMAIL, ""),
            "recovery_email": doc.get(UserFields.RECOVERY_EMAIL, ""),
            "created_at": doc.get(UserFields.CREATED_AT).isoformat() if isinstance(doc.get(UserFields.CREATED_AT), datetime) else None,
        })

    return ungrouped


def notify_ungrouped_students(dept: str | None = None, course: str | None = None, custom_message: str | None = None) -> dict:
    """
    Send reminder emails to all ungrouped students matching optional department/course filters.
    """
    students = list_ungrouped_students(dept=dept, course=course)
    sent_count = 0

    # Cache course deadlines to avoid redundant queries
    course_deadlines = {}

    for s in students:
        course_name = s.get("course", "")
        student_dept = s.get("dept", "")
        cache_key = f"{student_dept}:{course_name}"

        if cache_key not in course_deadlines:
            cdoc = mongo.db.courses.find_one({
                "name": course_name,
                "dept": student_dept.upper(),
                "deleted": {"$ne": True},
            })
            deadline_val = ""
            if cdoc:
                deadline_val = cdoc.get("group_formation_deadline") or cdoc.get("deadline") or ""
            if not deadline_val:
                from app.models.iteration import COLLECTION_ITERATIONS
                from app.models.iteration import Field as IterField
                it_doc = mongo.db[COLLECTION_ITERATIONS].find_one(
                    {"course": course_name, IterField.IS_GROUP_FORMATION: True}
                )
                if not it_doc:
                    it_doc = mongo.db[COLLECTION_ITERATIONS].find_one(
                        {"course": "All Courses", IterField.IS_GROUP_FORMATION: True}
                    )
                if it_doc:
                    deadline_val = it_doc.get(IterField.DEADLINE, "")
            course_deadlines[cache_key] = deadline_val

        deadline_str = course_deadlines[cache_key]
        email = s.get("email")
        name = s.get("name") or "Student"

        if email:
            success = send_ungrouped_notification(
                to_email=email,
                student_name=name,
                deadline=deadline_str,
                custom_message=custom_message,
            )
            if success:
                sent_count += 1

    return {
        "sent_count": sent_count,
        "total_ungrouped": len(students),
    }
