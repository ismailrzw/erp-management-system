# backend/tests/test_iterations.py
import os
import sys

import bcrypt
import pytest

from app import create_app
from app.extensions import mongo

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from urllib.parse import urlsplit, urlunsplit


def _test_mongo_uri(uri: str) -> str:
    p = urlsplit(uri)
    return urlunsplit((p.scheme, p.netloc, "/pbl_system_test", p.query, p.fragment))

class TestConfig:
    TESTING = True
    MONGO_URI = _test_mongo_uri(os.getenv("MONGO_URI", "mongodb://mongo:27017/pbl_system"))
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "pytest-only-jwt-secret")

@pytest.fixture
def client():
    app = create_app(TestConfig)

    with app.test_client() as client:
        with app.app_context():
            assert mongo.db.name == "pbl_system_test", "Must only use test db"
            for collection in mongo.db.list_collection_names():
                mongo.db[collection].drop()

            password = "11223344"
            hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
            mongo.db.users.insert_one({
                "name": "Zaman Aziz",
                "email": "zamanaziz@bnu.edu.pk",
                "password_hash": hashed,
                "role": "pbl_manager",
                "deleted": False
            })
        yield client

def get_manager_token(client):
    resp = client.post("/api/auth/login", json={
        "email": "zamanaziz@bnu.edu.pk",
        "password": "11223344"
    })
    return resp.get_json()["data"]["token"]

def test_create_iteration(client):
    token = get_manager_token(client)
    resp = client.post("/api/manager/iterations",
        json={
            "title": "Project Proposal",
            "details": "Submit a proposal.",
            "course": "Final Year Project - Fall 2025",
            "deadline": "2026-07-10"
        },
        headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 201
    data = resp.get_json()["data"]
    assert data["title"] == "Project Proposal"
    assert data["course"] == "Final Year Project - Fall 2025"

def test_set_rubrics_weight_sum_100_success(client):
    token = get_manager_token(client)
    # Create iteration first
    create_resp = client.post("/api/manager/iterations",
        json={
            "title": "Iteration 1",
            "course": "FYP 2025",
            "deadline": "2026-08-01"
        },
        headers={"Authorization": f"Bearer {token}"})
    iteration_id = create_resp.get_json()["data"]["_id"]

    # Set valid rubrics summing to 100
    rubrics = [
        {"question": "Q1", "weight": 60, "levels": {"0":"a","1":"b","2":"c","3":"d","4":"e","5":"f"}},
        {"question": "Q2", "weight": 40, "levels": {"0":"a","1":"b","2":"c","3":"d","4":"e","5":"f"}}
    ]
    resp = client.post(f"/api/manager/iterations/{iteration_id}/rubrics",
        json={"rubrics": rubrics},
        headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.get_json()["success"] is True

def test_set_rubrics_invalid_weight_fails(client):
    token = get_manager_token(client)
    create_resp = client.post("/api/manager/iterations",
        json={"title": "Iteration 2", "course": "FYP 2025", "deadline": "2026-08-01"},
        headers={"Authorization": f"Bearer {token}"})
    iteration_id = create_resp.get_json()["data"]["_id"]

    rubrics = [
        {"question": "Q1", "weight": 0, "levels": {"0":"a","1":"b","2":"c","3":"d","4":"e","5":"f"}}
    ]
    resp = client.post(f"/api/manager/iterations/{iteration_id}/rubrics",
        json={"rubrics": rubrics},
        headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 422
    assert "greater than 0" in resp.get_json()["message"]
