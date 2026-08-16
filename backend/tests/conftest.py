"""
Pytest fixtures shared across all test files.
"""
import os
import sys

# Ensure backend directory is on Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import bcrypt
import pytest
from app import create_app
from app.config import Config
from app.extensions import mongo
from app.utils.decorators import role_required


class TestConfig(Config):
    TESTING = True
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/pbl_test")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "test-jwt-secret-key-32-chars-long-secure-key")


@pytest.fixture(scope="session")
def app():
    """Create a test Flask application."""
    flask_app = create_app(TestConfig)

    # Register test route for role_required decorator testing
    @flask_app.route("/api/test-role-protected", methods=["GET"])
    @role_required("pbl_manager")
    def test_role_protected_route():
        return {"success": True, "message": "Manager access granted"}, 200

    return flask_app


@pytest.fixture(scope="session")
def client(app):
    """Create a test client."""
    return app.test_client()


@pytest.fixture(autouse=True)
def clean_db(app):
    """Clean the test database before each test."""
    with app.app_context():
        # Drop all collections before each test
        try:
            for collection in mongo.db.list_collection_names():
                mongo.db[collection].drop()
        except Exception:
            pass
    yield


@pytest.fixture
def manager_user(app):
    """Insert a test manager and return credentials."""
    with app.app_context():
        password = "Test@Manager2026"
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        mongo.db.users.insert_one({
            "name": "Test Manager",
            "email": "manager@bnu.edu.pk",
            "password_hash": hashed,
            "role": "pbl_manager",
            "dept": None,
            "deleted": False,
        })
        return {"email": "manager@bnu.edu.pk", "password": password}


@pytest.fixture
def student_user(app):
    """Insert a test student and return credentials."""
    with app.app_context():
        password = "Test@Student2026"
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        mongo.db.users.insert_one({
            "name": "Test Student",
            "email": "bcsm-f23-001@bnu.edu.pk",
            "password_hash": hashed,
            "role": "student",
            "dept": "SE",
            "section": "A",
            "roll": "BCSM-F23-001",
            "deleted": False,
        })
        return {"email": "bcsm-f23-001@bnu.edu.pk", "password": password}
