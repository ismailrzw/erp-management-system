"""Business logic for Exhibition-Day Evaluator operations (internal/external)."""

import random
import string
from datetime import datetime, timezone

import bcrypt
from bson import ObjectId
from bson.errors import InvalidId

from app.extensions import mongo
from app.models.teacher import EvaluatorType
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
    result["evaluator_type"] = result.get(UserFields.EVALUATOR_TYPE) or EvaluatorType.INTERNAL

    # Assigned evaluation groups count on exhibition day
    try:
        from app.models.assignment import COLLECTION as ASSIGNMENTS_COLLECTION
        assigned_cnt = mongo.db[ASSIGNMENTS_COLLECTION].count_documents({
            "evaluator_id": ObjectId(result["id"]),
        })
    except Exception:  # noqa: BLE001
        assigned_cnt = 0
    result["assigned_groups_count"] = assigned_cnt

    for key, value in list(result.items()):
        if isinstance(value, datetime):
            result[key] = value.isoformat()
    return result


def create_evaluator(name: str, email: str, dept: str, evaluator_type: str, domains: list[str] | None = None) -> dict:
    clean_email = email.strip().lower()
    if mongo.db[UserFields.COLLECTION].find_one({UserFields.EMAIL: clean_email}):
        raise ValueError(f"A user with email '{clean_email}' already exists.")

    if evaluator_type not in EvaluatorType.ALL:
        raise ValueError(f"Invalid evaluator_type '{evaluator_type}'. Must be one of: {EvaluatorType.ALL}")

    password = generate_initial_password()
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    now = datetime.now(timezone.utc)
    clean_domains = [d.strip() for d in (domains or []) if isinstance(d, str) and d.strip()]

    document = {
        UserFields.NAME: name.strip(),
        UserFields.EMAIL: clean_email,
        UserFields.DEPT: dept.strip(),
        UserFields.ROLE: Role.EVALUATOR,
        UserFields.EVALUATOR_TYPE: evaluator_type,
        UserFields.DOMAINS: clean_domains,
        UserFields.PASSWORD_HASH: password_hash,
        UserFields.DELETED: False,
        UserFields.CREATED_AT: now,
        UserFields.UPDATED_AT: now,
    }
    result = mongo.db[UserFields.COLLECTION].insert_one(document)
    document[UserFields.ID] = result.inserted_id

    send_mock_credentials_email(clean_email, password)

    serialized = _serialize(document)
    serialized["initial_password"] = password
    return serialized


def list_evaluators(deleted: bool = False, dept: str | None = None, evaluator_type: str | None = None) -> list[dict]:
    query = {UserFields.ROLE: Role.EVALUATOR, UserFields.DELETED: deleted}
    if dept:
        query[UserFields.DEPT] = dept
    if evaluator_type and evaluator_type in EvaluatorType.ALL:
        query[UserFields.EVALUATOR_TYPE] = evaluator_type
    evaluators = mongo.db[UserFields.COLLECTION].find(query).sort(UserFields.NAME, 1)
    return [_serialize(e) for e in evaluators]


def get_evaluator_by_id(evaluator_id: str) -> dict | None:
    try:
        oid = ObjectId(evaluator_id)
    except InvalidId:
        return None
    doc = mongo.db[UserFields.COLLECTION].find_one(
        {UserFields.ID: oid, UserFields.ROLE: Role.EVALUATOR}
    )
    return _serialize(doc) if doc else None


def update_evaluator(
    evaluator_id: str,
    name: str | None = None,
    dept: str | None = None,
    evaluator_type: str | None = None,
    domains: list[str] | None = None,
) -> dict | None:
    try:
        oid = ObjectId(evaluator_id)
    except InvalidId:
        return None

    updates = {}
    if name is not None:
        updates[UserFields.NAME] = name.strip()
    if dept is not None:
        updates[UserFields.DEPT] = dept.strip()
    if evaluator_type is not None:
        if evaluator_type not in EvaluatorType.ALL:
            raise ValueError(f"Invalid evaluator_type. Must be one of: {EvaluatorType.ALL}")
        updates[UserFields.EVALUATOR_TYPE] = evaluator_type
    if domains is not None:
        updates[UserFields.DOMAINS] = [d.strip() for d in domains if isinstance(d, str) and d.strip()]

    if not updates:
        return get_evaluator_by_id(evaluator_id)

    updates[UserFields.UPDATED_AT] = datetime.now(timezone.utc)

    result = mongo.db[UserFields.COLLECTION].find_one_and_update(
        {UserFields.ID: oid, UserFields.ROLE: Role.EVALUATOR},
        {"$set": updates},
        return_document=True,
    )
    return _serialize(result) if result else None


def update_evaluator_domains(evaluator_id: str, domains: list[str]) -> dict:
    try:
        oid = ObjectId(evaluator_id)
    except InvalidId:
        raise ValueError(f"Invalid ID: {evaluator_id}")

    clean_domains = [d.strip() for d in domains if isinstance(d, str) and d.strip()]
    now = datetime.now(timezone.utc)

    res = mongo.db[UserFields.COLLECTION].update_one(
        {UserFields.ID: oid, UserFields.ROLE: Role.EVALUATOR},
        {"$set": {UserFields.DOMAINS: clean_domains, UserFields.UPDATED_AT: now}},
    )
    if res.matched_count == 0:
        raise ValueError("Evaluator not found.")

    return {"updated": True, "evaluator_id": evaluator_id, "domains": clean_domains}


def soft_delete_evaluator(evaluator_id: str) -> dict | None:
    try:
        oid = ObjectId(evaluator_id)
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


def restore_evaluator(evaluator_id: str) -> dict | None:
    try:
        oid = ObjectId(evaluator_id)
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


def permanent_delete_evaluator(evaluator_id: str) -> dict | None:
    try:
        oid = ObjectId(evaluator_id)
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
