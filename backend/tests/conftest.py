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
    """Drop all test data and seed the manager before each test."""
    with app.app_context():
        mongo.cx.drop_database(TEST_DATABASE_NAME)
        mongo.db.users.create_index("email", unique=True)
        mongo.db.users.insert_one({
            "name": "Zaman Aziz", "email": MANAGER_EMAIL,
            "password_hash": bcrypt.hashpw(MANAGER_PASSWORD.encode(), bcrypt.gensalt()).decode(),
            "role": Role.MANAGER, "deleted": False,
            "created_at": datetime.now(timezone.utc),
        })
    yield
    with app.app_context():
        mongo.cx.drop_database(TEST_DATABASE_NAME)


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
    """Return a valid non-manager JWT for authorization tests."""
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
