# backend/app/services/course_service.py
"""Business logic for course CRUD operations."""

from datetime import date, datetime, timezone

from bson import ObjectId

from app.extensions import mongo
from app.models import course as course_model
from app.models import group as group_model


def _object_id(course_id: str) -> ObjectId:
    if not ObjectId.is_valid(course_id):
        raise ValueError("Invalid course ID.")
    return ObjectId(course_id)


def _parse_deadline(value: str) -> str:
    """Validate the deadline is an ISO date string and return it normalized."""
    try:
        return date.fromisoformat(value).isoformat()
    except (TypeError, ValueError):
        raise ValueError("deadline must be an ISO-format date, e.g. '2026-08-15'.")


def _serialize(document: dict | None) -> dict | None:
    if document is None:
        return None
    result = dict(document)
    result["id"] = str(result.pop(course_model.Field.ID))
    for key, value in list(result.items()):
        if isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
    return result


def _department_exists(dept_code: str) -> bool:
    from app.models.department import DepartmentFields
    return mongo.db[DepartmentFields.COLLECTION].find_one({
        DepartmentFields.CODE: dept_code,
        DepartmentFields.DELETED: {"$ne": True},
    }) is not None


def _has_active_groups(course_name: str) -> bool:
    """A group is 'active' if it exists for this course and isn't itself deleted."""
    return mongo.db[group_model.COLLECTION].find_one({
        group_model.Field.COURSE: course_name,
        group_model.Field.STATUS: {"$ne": group_model.Status.DELETED},
    }) is not None


def create_course(name: str, dept: str, min_group: int, max_group: int, deadline: str) -> dict:
    """Create a new course. Raises ValueError on bad group sizes, unknown dept, or duplicate name."""
    name = name.strip()
    dept = dept.strip().upper()

    if max_group < min_group:
        raise ValueError("max_group must be greater than or equal to min_group.")
    if min_group < 1:
        raise ValueError("min_group must be at least 1.")
    if not _department_exists(dept):
        raise ValueError(f"No active department with code '{dept}' exists.")

    deadline = _parse_deadline(deadline)

    existing = mongo.db[course_model.COLLECTION].find_one({
        course_model.Field.NAME: name,
        course_model.Field.DELETED: {"$ne": True},
    })
    if existing:
        raise ValueError(f"A course named '{name}' already exists.")

    now = datetime.now(timezone.utc)
    document = {
        course_model.Field.NAME: name,
        course_model.Field.DEPT: dept,
        course_model.Field.MIN_GROUP: min_group,
        course_model.Field.MAX_GROUP: max_group,
        course_model.Field.DEADLINE: deadline,
        course_model.Field.DELETED: False,
        course_model.Field.DELETED_AT: None,
        course_model.Field.CREATED_AT: now,
        course_model.Field.UPDATED_AT: now,
    }
    result = mongo.db[course_model.COLLECTION].insert_one(document)
    document[course_model.Field.ID] = result.inserted_id
    return _serialize(document)


def list_courses(deleted: bool = False, dept: str | None = None, search: str | None = None) -> list[dict]:
    """List courses, optionally filtered by deleted status, department, and search term."""
    query = {course_model.Field.DELETED: True if deleted else {"$ne": True}}
    if dept:
        query[course_model.Field.DEPT] = dept.strip().upper()
    if search:
        query[course_model.Field.NAME] = {"$regex": search, "$options": "i"}
    documents = mongo.db[course_model.COLLECTION].find(query).sort(course_model.Field.NAME, 1)
    return [_serialize(document) for document in documents]


def get_course_by_id(course_id: str) -> dict | None:
    """Fetch a single course by its ID."""
    document = mongo.db[course_model.COLLECTION].find_one({course_model.Field.ID: _object_id(course_id)})
    return _serialize(document)


def update_course(
    course_id: str,
    name: str | None = None,
    dept: str | None = None,
    min_group: int | None = None,
    max_group: int | None = None,
    deadline: str | None = None,
) -> dict | None:
    """Update a course's fields. Raises ValueError on bad group sizes, unknown dept, or duplicate name."""
    current = mongo.db[course_model.COLLECTION].find_one({course_model.Field.ID: _object_id(course_id)})
    if current is None:
        return None

    effective_min = min_group if min_group is not None else current[course_model.Field.MIN_GROUP]
    effective_max = max_group if max_group is not None else current[course_model.Field.MAX_GROUP]
    if effective_min < 1:
        raise ValueError("min_group must be at least 1.")
    if effective_max < effective_min:
        raise ValueError("max_group must be greater than or equal to min_group.")

    updates = {course_model.Field.UPDATED_AT: datetime.now(timezone.utc)}

    if name is not None:
        name = name.strip()
        existing = mongo.db[course_model.COLLECTION].find_one({
            course_model.Field.NAME: name,
            course_model.Field.ID: {"$ne": _object_id(course_id)},
            course_model.Field.DELETED: {"$ne": True},
        })
        if existing:
            raise ValueError(f"A course named '{name}' already exists.")
        updates[course_model.Field.NAME] = name

    if dept is not None:
        dept = dept.strip().upper()
        if not _department_exists(dept):
            raise ValueError(f"No active department with code '{dept}' exists.")
        updates[course_model.Field.DEPT] = dept

    if min_group is not None:
        updates[course_model.Field.MIN_GROUP] = min_group
    if max_group is not None:
        updates[course_model.Field.MAX_GROUP] = max_group
    if deadline is not None:
        updates[course_model.Field.DEADLINE] = _parse_deadline(deadline)

    result = mongo.db[course_model.COLLECTION].find_one_and_update(
        {course_model.Field.ID: _object_id(course_id)},
        {"$set": updates},
        return_document=True,
    )
    return _serialize(result)


def soft_delete_course(course_id: str) -> dict | None:
    """Soft-delete a course (moves it to the recycle bin). Blocked if active groups reference it."""
    document = mongo.db[course_model.COLLECTION].find_one({course_model.Field.ID: _object_id(course_id)})
    if document is None:
        return None

    if _has_active_groups(document[course_model.Field.NAME]):
        raise ValueError("Cannot delete a course that has active groups. Resolve or remove those groups first.")

    result = mongo.db[course_model.COLLECTION].find_one_and_update(
        {course_model.Field.ID: _object_id(course_id)},
        {"$set": {
            course_model.Field.DELETED: True,
            course_model.Field.DELETED_AT: datetime.now(timezone.utc),
            course_model.Field.UPDATED_AT: datetime.now(timezone.utc),
        }},
        return_document=True,
    )
    return _serialize(result)


def restore_course(course_id: str) -> dict | None:
    """Restore a soft-deleted course from the recycle bin."""
    result = mongo.db[course_model.COLLECTION].find_one_and_update(
        {course_model.Field.ID: _object_id(course_id)},
        {"$set": {
            course_model.Field.DELETED: False,
            course_model.Field.DELETED_AT: None,
            course_model.Field.UPDATED_AT: datetime.now(timezone.utc),
        }},
        return_document=True,
    )
    return _serialize(result)


def permanent_delete_course(course_id: str) -> dict | None:
    """Permanently remove a soft-deleted course. Only allowed if already soft-deleted."""
    document = mongo.db[course_model.COLLECTION].find_one({course_model.Field.ID: _object_id(course_id)})
    if document is None:
        return None
    if not document.get(course_model.Field.DELETED):
        raise ValueError("Course must be soft-deleted before it can be permanently deleted.")
    mongo.db[course_model.COLLECTION].delete_one({course_model.Field.ID: _object_id(course_id)})
    return _serialize(document)