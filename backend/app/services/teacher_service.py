"""Business logic for teacher/evaluator operations."""

import random
import string
from datetime import datetime, timezone

import bcrypt
from bson import ObjectId
from bson.errors import InvalidId

from app.extensions import mongo
from app.models.user import Role, UserFields


def generate_initial_password(length: int = 10) -> str:
    """Generate a random initial password for a new evaluator."""
    alphabet = string.ascii_letters + string.digits
    return "".join(random.choice(alphabet) for _ in range(length))


def send_mock_credentials_email(email: str, password: str) -> None:
    """Mocked in dev — logs instead of actually sending mail."""
    print(f"[MOCK EMAIL] To: {email} | Temporary password: {password}")


def _serialize(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop(UserFields.ID))
    doc.pop(UserFields.PASSWORD_HASH, None)
    if isinstance(doc.get(UserFields.CREATED_AT), datetime):
        doc[UserFields.CREATED_AT] = doc[UserFields.CREATED_AT].isoformat()
    if isinstance(doc.get(UserFields.UPDATED_AT), datetime):
        doc[UserFields.UPDATED_AT] = doc[UserFields.UPDATED_AT].isoformat()
    return doc


def create_teacher(name: str, email: str, dept: str, type_: str) -> dict:
    if mongo.db[UserFields.COLLECTION].find_one({UserFields.EMAIL: email}):
        raise ValueError(f"A user with email '{email}' already exists.")

    password = generate_initial_password()
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    now = datetime.now(timezone.utc)

    document = {
        UserFields.NAME: name,
        UserFields.EMAIL: email,
        UserFields.DEPT: dept,
        UserFields.TYPE: type_,
        UserFields.ROLE: Role.EVALUATOR,
        UserFields.PASSWORD_HASH: password_hash,
        UserFields.DELETED: False,
        UserFields.CREATED_AT: now,
        UserFields.UPDATED_AT: now,
    }
    result = mongo.db[UserFields.COLLECTION].insert_one(document)
    document[UserFields.ID] = result.inserted_id

    send_mock_credentials_email(email, password)

    serialized = _serialize(document)
    serialized["initial_password"] = password  # returned once, for the manager to relay if needed
    return serialized


def list_teachers(deleted: bool = False, dept: str | None = None) -> list[dict]:
    query = {UserFields.ROLE: Role.EVALUATOR, UserFields.DELETED: deleted}
    if dept:
        query[UserFields.DEPT] = dept
    teachers = mongo.db[UserFields.COLLECTION].find(query)
    return [_serialize(t) for t in teachers]


def get_teacher_by_id(teacher_id: str) -> dict | None:
    try:
        oid = ObjectId(teacher_id)
    except InvalidId:
        return None
    doc = mongo.db[UserFields.COLLECTION].find_one(
        {UserFields.ID: oid, UserFields.ROLE: Role.EVALUATOR}
    )
    return _serialize(doc) if doc else None


def update_teacher(teacher_id: str, name: str | None, dept: str | None, type_: str | None) -> dict | None:
    try:
        oid = ObjectId(teacher_id)
    except InvalidId:
        return None

    updates = {}
    if name is not None:
        updates[UserFields.NAME] = name
    if dept is not None:
        updates[UserFields.DEPT] = dept
    if type_ is not None:
        updates[UserFields.TYPE] = type_
    if not updates:
        return get_teacher_by_id(teacher_id)

    updates[UserFields.UPDATED_AT] = datetime.now(timezone.utc)

    result = mongo.db[UserFields.COLLECTION].find_one_and_update(
        {UserFields.ID: oid, UserFields.ROLE: Role.EVALUATOR},
        {"$set": updates},
        return_document=True,
    )
    return _serialize(result) if result else None


def soft_delete_teacher(teacher_id: str) -> dict | None:
    try:
        oid = ObjectId(teacher_id)
    except InvalidId:
        return None
    result = mongo.db[UserFields.COLLECTION].find_one_and_update(
        {UserFields.ID: oid, UserFields.ROLE: Role.EVALUATOR, UserFields.DELETED: False},
        {"$set": {UserFields.DELETED: True}},
        return_document=True,
    )
    return _serialize(result) if result else None


def restore_teacher(teacher_id: str) -> dict | None:
    try:
        oid = ObjectId(teacher_id)
    except InvalidId:
        return None
    result = mongo.db[UserFields.COLLECTION].find_one_and_update(
        {UserFields.ID: oid, UserFields.ROLE: Role.EVALUATOR, UserFields.DELETED: True},
        {"$set": {UserFields.DELETED: False}},
        return_document=True,
    )
    return _serialize(result) if result else None


def permanent_delete_teacher(teacher_id: str) -> dict | None:
    try:
        oid = ObjectId(teacher_id)
    except InvalidId:
        return None
    doc = mongo.db[UserFields.COLLECTION].find_one(
        {UserFields.ID: oid, UserFields.ROLE: Role.EVALUATOR, UserFields.DELETED: True}
    )
    if doc is None:
        return None
    mongo.db[UserFields.COLLECTION].delete_one({UserFields.ID: oid})
    return _serialize(doc)