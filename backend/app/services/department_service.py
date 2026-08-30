"""Business logic for department CRUD operations."""

from datetime import datetime, timezone

from bson import ObjectId

from app.extensions import mongo
from app.models.department import DepartmentFields


def _object_id(department_id: str) -> ObjectId:
    if not ObjectId.is_valid(department_id):
        raise ValueError("Invalid department ID.")
    return ObjectId(department_id)


def _serialize(document: dict | None) -> dict | None:
    if document is None:
        return None
    result = dict(document)
    result["id"] = str(result.pop(DepartmentFields.ID))
    for key, value in result.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
    return result


def create_department(name: str, code: str) -> dict:
    """Create a new department. Raises ValueError if the code already exists."""
    code = code.strip().upper()
    name = name.strip()

    existing = mongo.db[DepartmentFields.COLLECTION].find_one({
        DepartmentFields.CODE: code,
        DepartmentFields.DELETED: {"$ne": True},
    })
    if existing:
        raise ValueError(f"A department with code '{code}' already exists.")

    now = datetime.now(timezone.utc)
    document = {
        DepartmentFields.NAME: name,
        DepartmentFields.CODE: code,
        DepartmentFields.DELETED: False,
        DepartmentFields.DELETED_AT: None,
        DepartmentFields.CREATED_AT: now,
        DepartmentFields.UPDATED_AT: now,
    }
    result = mongo.db[DepartmentFields.COLLECTION].insert_one(document)
    document[DepartmentFields.ID] = result.inserted_id
    return _serialize(document)


def list_departments(deleted: bool = False, search: str | None = None) -> list[dict]:
    """List departments, optionally filtered by deleted status and search term."""
    query = {DepartmentFields.DELETED: True if deleted else {"$ne": True}}
    if search:
        query["$or"] = [
            {DepartmentFields.NAME: {"$regex": search, "$options": "i"}},
            {DepartmentFields.CODE: {"$regex": search, "$options": "i"}},
        ]
    documents = mongo.db[DepartmentFields.COLLECTION].find(query).sort(DepartmentFields.NAME, 1)
    return [_serialize(document) for document in documents]


def get_department_by_id(department_id: str) -> dict | None:
    """Fetch a single department by its ID."""
    document = mongo.db[DepartmentFields.COLLECTION].find_one({DepartmentFields.ID: _object_id(department_id)})
    return _serialize(document)


def update_department(department_id: str, name: str | None = None, code: str | None = None) -> dict | None:
    """Update a department's name and/or code. Raises ValueError on duplicate code."""
    updates = {DepartmentFields.UPDATED_AT: datetime.now(timezone.utc)}
    if name is not None:
        updates[DepartmentFields.NAME] = name.strip()
    if code is not None:
        code = code.strip().upper()
        existing = mongo.db[DepartmentFields.COLLECTION].find_one({
            DepartmentFields.CODE: code,
            DepartmentFields.ID: {"$ne": _object_id(department_id)},
            DepartmentFields.DELETED: {"$ne": True},
        })
        if existing:
            raise ValueError(f"A department with code '{code}' already exists.")
        updates[DepartmentFields.CODE] = code

    result = mongo.db[DepartmentFields.COLLECTION].find_one_and_update(
        {DepartmentFields.ID: _object_id(department_id)},
        {"$set": updates},
        return_document=True,
    )
    return _serialize(result)


def soft_delete_department(department_id: str) -> dict | None:
    """Soft-delete a department (moves it to the recycle bin)."""
    result = mongo.db[DepartmentFields.COLLECTION].find_one_and_update(
        {DepartmentFields.ID: _object_id(department_id)},
        {"$set": {
            DepartmentFields.DELETED: True,
            DepartmentFields.DELETED_AT: datetime.now(timezone.utc),
            DepartmentFields.UPDATED_AT: datetime.now(timezone.utc),
        }},
        return_document=True,
    )
    return _serialize(result)


def restore_department(department_id: str) -> dict | None:
    """Restore a soft-deleted department from the recycle bin."""
    result = mongo.db[DepartmentFields.COLLECTION].find_one_and_update(
        {DepartmentFields.ID: _object_id(department_id)},
        {"$set": {
            DepartmentFields.DELETED: False,
            DepartmentFields.DELETED_AT: None,
            DepartmentFields.UPDATED_AT: datetime.now(timezone.utc),
        }},
        return_document=True,
    )
    return _serialize(result)


def permanent_delete_department(department_id: str) -> dict | None:
    """Permanently remove a soft-deleted department. Only allowed if already soft-deleted."""
    document = mongo.db[DepartmentFields.COLLECTION].find_one({DepartmentFields.ID: _object_id(department_id)})
    if document is None:
        return None
    if not document.get(DepartmentFields.DELETED):
        raise ValueError("Department must be soft-deleted before it can be permanently deleted.")
    mongo.db[DepartmentFields.COLLECTION].delete_one({DepartmentFields.ID: _object_id(department_id)})
    return _serialize(document)