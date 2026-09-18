"""Shared pytest fixtures for the Flask API integration test suite.

These tests intentionally use the same MongoDB server as the application, but
always select ``pbl_system_test``. Never point ``MONGO_URI`` at production.
"""
from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import bcrypt
import pytest

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app import create_app
from app.extensions import mongo
from app.models.user import Role

TEST_DATABASE_NAME = "pbl_system_test"
MANAGER_EMAIL = "zamanaziz@bnu.edu.pk"
MANAGER_PASSWORD = "11223344"


def _test_mongo_uri(uri: str) -> str:
    parsed = urlsplit(uri)
    if not parsed.scheme or not parsed.netloc:
        raise pytest.UsageError("MONGO_URI must be a complete MongoDB connection URI.")
    return urlunsplit((parsed.scheme, parsed.netloc, f"/{TEST_DATABASE_NAME}", parsed.query, parsed.fragment))


@pytest.fixture
def app():
    """Create a fresh Flask app configured for the isolated test database."""
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        raise pytest.UsageError("Set MONGO_URI before running backend tests.")

    class TestConfig:
        TESTING = True
        MONGO_URI = _test_mongo_uri(mongo_uri)
        JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "pytest-only-jwt-secret")
        # Exercise the service's documented >10 MB validation instead of a
        # transport-level 413 response from Flask.
        MAX_CONTENT_LENGTH = 11 * 1024 * 1024

    flask_app = create_app(TestConfig)
    with flask_app.app_context():
        assert mongo.db.name == TEST_DATABASE_NAME, "Tests must never use the application database."
    yield flask_app


@pytest.fixture(autouse=True)
def reset_test_database(app):
    """Clear all test collections and seed the manager before each test."""
    with app.app_context():
        for collection_name in mongo.db.list_collection_names():
            if not collection_name.startswith("system."):
                mongo.db[collection_name].delete_many({})
        try:
            mongo.db.users.drop_index("email_1")
        except Exception:
            pass
        mongo.db.users.create_index("email", unique=True)
        mongo.db.users.replace_one(
            {"email": MANAGER_EMAIL},
            {
                "name": "Zaman Aziz",
                "email": MANAGER_EMAIL,
                "password_hash": bcrypt.hashpw(MANAGER_PASSWORD.encode(), bcrypt.gensalt()).decode(),
                "role": Role.MANAGER,
                "deleted": False,
                "created_at": datetime.now(timezone.utc),
            },
            upsert=True,
        )
    yield
    with app.app_context():
        for collection_name in mongo.db.list_collection_names():
            if not collection_name.startswith("system."):
                mongo.db[collection_name].delete_many({})


@pytest.fixture(autouse=True)
def isolate_attachment_uploads(monkeypatch, tmp_path):
    """Keep attachment test files out of the application's uploads directory."""
    from app.services import attachment_service
    monkeypatch.setattr(attachment_service, "UPLOAD_DIRECTORY", tmp_path / "uploads")


@pytest.fixture
def client(app):
    with app.test_client() as test_client:
        yield test_client


@pytest.fixture
def manager_token(client) -> str:
    response = client.post("/api/auth/login", json={"email": MANAGER_EMAIL, "password": MANAGER_PASSWORD})
    assert response.status_code == 200, response.get_json()
    return response.get_json()["data"]["token"]


@pytest.fixture
def manager_headers(manager_token) -> dict[str, str]:
    return {"Authorization": f"Bearer {manager_token}"}


@pytest.fixture
def student_headers(app, client) -> dict[str, str]:
    """Return a valid non-manager JWT for RBAC authorization tests (existing tests only)."""
    password = "student-password"
    with app.app_context():
        mongo.db.users.insert_one({
            "name": "Test Student", "email": "student.test@bnu.edu.pk",
            "password_hash": bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode(),
            "role": Role.STUDENT, "roll": "TEST-001", "dept": "CS", "section": "A", "deleted": False,
        })
    response = client.post("/api/auth/login", json={"email": "student.test@bnu.edu.pk", "password": password})
    assert response.status_code == 200, response.get_json()
    return {"Authorization": f"Bearer {response.get_json()['data']['token']}"}


# ── Student fixtures for dashboard & group integration tests ───────────────────

@pytest.fixture
def student_user(app, manager_headers, client) -> dict:
    """
    Create a real student via the Manager API and return their credentials.

    Returns the full ``data`` dict from POST /api/manager/students/, including:
      - student_id, email, password (initial), name, roll, dept, section, course, teacher
    """
    import uuid
    uid = uuid.uuid4().hex[:4]
    num = int(uid, 16) % 9000 + 1000
    payload = {
        "name": "Sara Ahmed",
        "roll": f"f2023-{num}",
        "dept": "SE",
        "section": "A",
        "session": "Fall 2023",
        "course": "Final Year Project",
        "teacher": "Dr. Imran",
    }
    response = client.post("/api/manager/students/", json=payload, headers=manager_headers)
    assert response.status_code == 201, response.get_json()
    data = response.get_json()["data"]
    
    from app.services.auth_service import AuthService
    raw_token = AuthService.create_password_set_token(data["student_id"])
    client.post("/api/auth/set-password", json={"token": raw_token, "new_password": "StudentPassword123!"})
    data["password"] = "StudentPassword123!"
    return data


@pytest.fixture
def student_token(client, student_user) -> str:
    """Login as the real student and return their JWT."""
    response = client.post(
        "/api/auth/login",
        json={"email": student_user["email"], "password": student_user["password"]},
    )
    assert response.status_code == 200, response.get_json()
    return response.get_json()["data"]["token"]


@pytest.fixture
def real_student_headers(student_token) -> dict[str, str]:
    """Authorization headers for the real student (for group/profile/dashboard tests)."""
    return {"Authorization": f"Bearer {student_token}"}


@pytest.fixture
def second_student_user(app, manager_headers, client) -> dict:
    """Create a second student in the same dept/section for invitation workflow tests."""
    import uuid
    uid = uuid.uuid4().hex[:4]
    num = int(uid, 16) % 9000 + 10000
    payload = {
        "name": "Ali Hassan",
        "roll": f"f2023-{num}",
        "dept": "SE",
        "section": "A",
        "session": "Fall 2023",
        "course": "Final Year Project",
        "teacher": "Dr. Imran",
    }
    response = client.post("/api/manager/students/", json=payload, headers=manager_headers)
    assert response.status_code == 201, response.get_json()
    data = response.get_json()["data"]
    
    from app.services.auth_service import AuthService
    raw_token = AuthService.create_password_set_token(data["student_id"])
    client.post("/api/auth/set-password", json={"token": raw_token, "new_password": "StudentPassword123!"})
    data["password"] = "StudentPassword123!"
    return data


@pytest.fixture
def second_student_headers(client, second_student_user) -> dict[str, str]:
    """Authorization headers for the second real student."""
    response = client.post(
        "/api/auth/login",
        json={"email": second_student_user["email"], "password": second_student_user["password"]},
    )
    assert response.status_code == 200, response.get_json()
    return {"Authorization": f"Bearer {response.get_json()['data']['token']}"}


# ── Sprint 4: Evaluator Fixtures ─────────────────────────────────────────────

EVALUATOR_EMAIL    = "evaluator.test@bnu.edu.pk"
EVALUATOR_PASSWORD = "eval-password-123"


@pytest.fixture
def evaluator_user(app) -> dict:
    """Insert an evaluator user directly and return id + credentials."""
    import bcrypt as _bcrypt
    from datetime import datetime, timezone
    with app.app_context():
        pw_hash = _bcrypt.hashpw(EVALUATOR_PASSWORD.encode(), _bcrypt.gensalt()).decode()
        doc = {
            "name":          "Test Evaluator",
            "email":         EVALUATOR_EMAIL,
            "password_hash": pw_hash,
            "role":          Role.EVALUATOR,
            "dept":          "SE",
            "deleted":       False,
            "created_at":    datetime.now(timezone.utc),
        }
        mongo.db.users.replace_one({"email": EVALUATOR_EMAIL}, doc, upsert=True)
        inserted = mongo.db.users.find_one({"email": EVALUATOR_EMAIL})
        return {"id": str(inserted["_id"]), "email": EVALUATOR_EMAIL, "password": EVALUATOR_PASSWORD}


@pytest.fixture
def evaluator_token(client, evaluator_user) -> str:
    """Login as the evaluator and return a JWT."""
    resp = client.post(
        "/api/auth/login",
        json={"email": evaluator_user["email"], "password": evaluator_user["password"]},
    )
    assert resp.status_code == 200, resp.get_json()
    return resp.get_json()["data"]["token"]


@pytest.fixture
def evaluator_headers(evaluator_token) -> dict[str, str]:
    return {"Authorization": f"Bearer {evaluator_token}"}


@pytest.fixture
def approved_group(app, evaluator_user) -> dict:
    """Insert an approved group assigned to the evaluator."""
    from bson import ObjectId as OID
    from datetime import datetime, timezone
    with app.app_context():
        gid = mongo.db.groups.insert_one({
            "name":    "Alpha Team",
            "course":  "Final Year Project",
            "dept":    "SE",
            "status":  "approved",
            "members": [],
        }).inserted_id
        mongo.db.assignments.insert_one({
            "evaluator_id": OID(evaluator_user["id"]),
            "group_id":     gid,
            "assigned_at":  datetime.now(timezone.utc),
        })
        return {"id": str(gid), "course": "Final Year Project"}


@pytest.fixture
def iteration_with_rubrics(app, approved_group) -> dict:
    """Insert an iteration for the group's course that has two rubric criteria."""
    from datetime import datetime, timezone
    with app.app_context():
        iid = mongo.db.iterations.insert_one({
            "title":    "Proposal Submission",
            "course":   approved_group["course"],
            "deadline": datetime(2026, 11, 1, tzinfo=timezone.utc),
            "rubrics": [
                {"id": 1, "question": "Problem Statement", "weight": 60,
                 "levels": {"0": "Missing", "5": "Excellent"}},
                {"id": 2, "question": "Literature Review",  "weight": 40,
                 "levels": {"0": "Missing", "5": "Excellent"}},
            ],
        }).inserted_id
        return {"id": str(iid)}


@pytest.fixture
def submitted_evaluation(app, evaluator_user, approved_group, iteration_with_rubrics) -> dict:
    """Insert a pre-existing locked evaluation (for duplicate / lock tests)."""
    from bson import ObjectId as OID
    from datetime import datetime, timezone
    with app.app_context():
        eid = mongo.db.evaluations.insert_one({
            "group_id":             OID(approved_group["id"]),
            "iteration_id":         OID(iteration_with_rubrics["id"]),
            "evaluator_id":         OID(evaluator_user["id"]),
            "scores":               {"1": 4, "2": 3},
            "total_weighted_score": 72.0,
            "comment":              "Good work.",
            "locked":               True,
            "submitted_at":         datetime.now(timezone.utc),
        }).inserted_id
        return {
            "id":           str(eid),
            "group_id":     approved_group["id"],
            "iteration_id": iteration_with_rubrics["id"],
        }


@pytest.fixture
def unassigned_group(app) -> dict:
    """Insert a group NOT assigned to the test evaluator."""
    with app.app_context():
        gid = mongo.db.groups.insert_one({
            "name":    "Beta Team",
            "course":  "Final Year Project",
            "dept":    "CS",
            "status":  "approved",
            "members": [],
        }).inserted_id
        return {"id": str(gid)}

