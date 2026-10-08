"""Business logic for Project Evaluator operations (internal/external)."""

import random
import string
from datetime import datetime, timezone

import bcrypt
from bson import ObjectId
from bson.errors import InvalidId

from app.extensions import mongo
from app.models.teacher import EvaluatorType
from app.models.user import Role, UserFields
from app.services.academic_integrity_service import assert_deletable
from app.services.academic_write_service import academic_write


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

    result["assigned_groups_count"] = mongo.db.assignments.count_documents({"evaluator_id": ObjectId(result["id"])})

    for key, value in list(result.items()):
        if isinstance(value, datetime):
            result[key] = value.isoformat()
    return result


@academic_write
def create_evaluator(name: str, email: str, dept: str, evaluator_type: str, domains: list[str] | None = None, company_name: str = "", post: str = "") -> dict:
    clean_email = email.strip().lower()
    if mongo.db[UserFields.COLLECTION].find_one({UserFields.EMAIL: clean_email}):
        raise ValueError(f"A user with email '{clean_email}' already exists.")

    if evaluator_type not in EvaluatorType.ALL:
        raise ValueError(f"Invalid evaluator_type '{evaluator_type}'. Must be one of: {EvaluatorType.ALL}")

    validate_evaluator({"email": clean_email, "dept": dept, "evaluator_type": evaluator_type,
                        "domains": domains or [], "company_name": company_name, "post": post})
    password = generate_initial_password()
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    now = datetime.now(timezone.utc)
    clean_domains = [d.strip() for d in (domains or []) if isinstance(d, str) and d.strip()]

    document = {
        UserFields.NAME: name.strip(),
        UserFields.EMAIL: clean_email,
        UserFields.DEPT: dept.strip().upper() if evaluator_type == EvaluatorType.INTERNAL else "",
        "company_name": company_name.strip() if evaluator_type == EvaluatorType.EXTERNAL else "",
        "post": post.strip() if evaluator_type == EvaluatorType.EXTERNAL else "",
        "email_verified": evaluator_type != EvaluatorType.INTERNAL,
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

    email_sent = False
    if evaluator_type == EvaluatorType.INTERNAL:
        email_sent = send_activation(str(result.inserted_id))
    else:
        from app.services.email_service import send_student_credentials_email
        email_sent = send_student_credentials_email(clean_email, name, "External Evaluator", password)

    serialized = _serialize(document)
    if evaluator_type == EvaluatorType.EXTERNAL:
        serialized["initial_password"] = password
    serialized["activation_required"] = evaluator_type == EvaluatorType.INTERNAL
    serialized["activation_email_sent"] = email_sent
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


@academic_write
def update_evaluator(
    evaluator_id: str,
    name: str | None = None,
    dept: str | None = None,
    evaluator_type: str | None = None,
    domains: list[str] | None = None,
    company_name: str | None = None, post: str | None = None,
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

    if company_name is not None:
        updates["company_name"] = company_name.strip()
    if post is not None:
        updates["post"] = post.strip()
    current = mongo.db.users.find_one({"_id": oid, "role": Role.EVALUATOR})
    if not current:
        return None
    validate_evaluator({**current, **updates})
    if not updates:
        return get_evaluator_by_id(evaluator_id)

    if evaluator_type == EvaluatorType.INTERNAL and current.get("evaluator_type") != EvaluatorType.INTERNAL:
        updates["email_verified"] = False
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


@academic_write
def soft_delete_evaluator(evaluator_id: str) -> dict | None:
    try:
        oid = ObjectId(evaluator_id)
    except InvalidId:
        return None
    document = mongo.db.users.find_one({"_id": oid, "role": Role.EVALUATOR, "deleted": {"$ne": True}})
    if document is None:
        return None
    assert_deletable("evaluator", document)
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


@academic_write
def restore_evaluator(evaluator_id: str) -> dict | None:
    try:
        oid = ObjectId(evaluator_id)
    except InvalidId:
        return None
    from app.services.academic_integrity_service import (
        assert_restorable,
        validate_enrollment,
    )
    record = mongo.db.users.find_one({"_id": ObjectId(evaluator_id)})
    if record:
        assert_restorable("evaluator", record)
    if record and record.get("evaluator_type", "internal") == "internal":
        validate_enrollment(record.get("dept", ""), "")

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


@academic_write
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
    assert_deletable("evaluator", doc)
    mongo.db[UserFields.COLLECTION].delete_one({UserFields.ID: oid})
    return _serialize(doc)


def validate_evaluator(data):
    from app.services.academic_integrity_service import validate_enrollment
    kind = data.get("evaluator_type")
    if kind == EvaluatorType.INTERNAL:
        if data.get("email", "").strip().lower().rsplit("@", 1)[-1] != "bnu.edu.pk":
            raise ValueError("Internal Faculty email must have the exact @bnu.edu.pk domain.")
        validate_enrollment(data.get("dept", ""))
        if not any(isinstance(domain, str) and domain.strip() for domain in data.get("domains", [])):
            raise ValueError("Relevant Expertise is required for Internal Faculty.")
    elif kind == EvaluatorType.EXTERNAL:
        if not data.get("company_name", "").strip() or not data.get("post", "").strip():
            raise ValueError("Company Name and Relevant Post are required for External Industry Experts.")
    else:
        raise ValueError("Select Internal Faculty or External Industry Expert.")


def send_activation(evaluator_id):
    from app.config import Config
    from app.services.auth_service import AuthService
    from app.services.email_service import send_password_set_email
    evaluator = mongo.db.users.find_one({"_id": ObjectId(evaluator_id), "role": Role.EVALUATOR, "deleted": {"$ne": True}})
    if not evaluator:
        raise ValueError("Evaluator not found.")
    token = AuthService.create_password_set_token(evaluator_id)
    sent = send_password_set_email(evaluator["email"], evaluator["name"], f"{Config.FRONTEND_URL}/set-password?token={token}")
    mongo.db.users.update_one({"_id": evaluator["_id"]}, {"$set": {"activation_email_sent": sent}})
    return sent
