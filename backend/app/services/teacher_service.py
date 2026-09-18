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


def _serialize(doc: dict | None) -> dict | None:
    if doc is None:
        return None
    result = dict(doc)
    result["id"] = str(result.pop(UserFields.ID))
    result.pop(UserFields.PASSWORD_HASH, None)
    result["domains"] = result.get(UserFields.DOMAINS) or []

    # Calculate real-time active groups supervised by this teacher
    supervision_by_course = []
    try:
        from app.models.group import COLLECTION as GROUPS_COLLECTION, Status as GroupStatus
        active_cnt = mongo.db[GROUPS_COLLECTION].count_documents({
            "supervisor_id": ObjectId(result["id"]),
            "status": {"$ne": GroupStatus.DELETED},
        })
        pipeline = [
            {"$match": {"supervisor_id": ObjectId(result["id"]), "status": {"$ne": GroupStatus.DELETED}}},
            {"$group": {"_id": "$course", "count": {"$sum": 1}}},
        ]
        course_groups = list(mongo.db[GROUPS_COLLECTION].aggregate(pipeline))
        supervision_by_course = [
            {"course": cg["_id"] or "General", "count": cg["count"], "max_cap": 4}
            for cg in course_groups
        ]
    except Exception:
        active_cnt = result.get(UserFields.ACTIVE_SUPERVISION_COUNT, 0)
    result["active_supervision_count"] = active_cnt
    result["supervision_by_course"] = supervision_by_course
    result["max_supervision_cap"] = 4

    for key, value in list(result.items()):
        if isinstance(value, datetime):
            result[key] = value.isoformat()
    return result


def create_teacher(name: str, email: str, dept: str, type_: str, domains: list[str] | None = None) -> dict:
    if mongo.db[UserFields.COLLECTION].find_one({UserFields.EMAIL: email}):
        raise ValueError(f"A user with email '{email}' already exists.")

    password = generate_initial_password()
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    now = datetime.now(timezone.utc)
    clean_domains = [d.strip() for d in (domains or []) if isinstance(d, str) and d.strip()]

    document = {
        UserFields.NAME: name,
        UserFields.EMAIL: email,
        UserFields.DEPT: dept,
        UserFields.TYPE: type_,
        UserFields.ROLE: Role.EVALUATOR,
        UserFields.DOMAINS: clean_domains,
        UserFields.ACTIVE_SUPERVISION_COUNT: 0,
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
    now = datetime.now(timezone.utc)
    result = mongo.db[UserFields.COLLECTION].find_one_and_update(
        {
            UserFields.ID: oid,
            UserFields.ROLE: Role.EVALUATOR,
            UserFields.DELETED: False,
        },
        {"$set": {UserFields.DELETED: True, UserFields.DELETED_AT: now, UserFields.UPDATED_AT: now}},
        return_document=True,
    )
    return _serialize(result) if result else None


def restore_teacher(teacher_id: str) -> dict | None:
    try:
        oid = ObjectId(teacher_id)
    except InvalidId:
        return None
    now = datetime.now(timezone.utc)
    result = mongo.db[UserFields.COLLECTION].find_one_and_update(
        {
            UserFields.ID: oid,
            UserFields.ROLE: Role.EVALUATOR,
            UserFields.DELETED: True,
        },
        {"$set": {UserFields.DELETED: False, UserFields.DELETED_AT: None, UserFields.UPDATED_AT: now}},
        return_document=True,
    )
    return _serialize(result) if result else None


def permanent_delete_teacher(teacher_id: str) -> dict | None:
    try:
        oid = ObjectId(teacher_id)
    except InvalidId:
        return None
    doc = mongo.db[UserFields.COLLECTION].find_one(
        {
            UserFields.ID: oid,
            UserFields.ROLE: Role.EVALUATOR,
            UserFields.DELETED: True,
        }
    )
    if doc is None:
        return None
    mongo.db[UserFields.COLLECTION].delete_one({UserFields.ID: oid})
    return _serialize(doc)
