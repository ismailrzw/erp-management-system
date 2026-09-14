# backend/tests/test_rubric_templates.py
import os
import sys
from urllib.parse import urlsplit, urlunsplit

import bcrypt
import pytest

from app import create_app
from app.extensions import mongo

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _test_mongo_uri(uri: str) -> str:
    p = urlsplit(uri)
    return urlunsplit((p.scheme, p.netloc, "/pbl_system_test_rubrics", p.query, p.fragment))


class TestConfig:
    TESTING = True
    MONGO_URI = _test_mongo_uri(os.getenv("MONGO_URI", "mongodb://mongo:27017/pbl_system"))
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "pytest-only-jwt-secret")


@pytest.fixture
def client():
    app = create_app(TestConfig)

    with app.test_client() as client:
        with app.app_context():
            assert mongo.db.name == "pbl_system_test_rubrics", "Must only use test db"
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
            mongo.db.users.insert_one({
                "name": "Alice Student",
                "email": "alice@bnu.edu.pk",
                "password_hash": hashed,
                "role": "student",
                "course": "FYP 2026",
                "deleted": False
            })
        yield client


def get_manager_token(client):
    resp = client.post("/api/auth/login", json={
        "email": "zamanaziz@bnu.edu.pk",
        "password": "11223344"
    })
    return resp.get_json()["data"]["token"]


def get_student_token(client):
    resp = client.post("/api/auth/login", json={
        "email": "alice@bnu.edu.pk",
        "password": "11223344"
    })
    return resp.get_json()["data"]["token"]


def sample_criteria():
    return [
        {
            "question": "Problem Statement",
            "weight": 40,
            "levels": {str(i): f"Level {i}" for i in range(6)}
        },
        {
            "question": "Methodology",
            "weight": 60,
            "levels": {str(i): f"Level {i}" for i in range(6)}
        }
    ]


def test_create_rubric_template_success(client):
    token = get_manager_token(client)
    resp = client.post("/api/manager/rubric-templates",
        json={
            "name": "Sprint 1 Template",
            "course": "All Courses",
            "criteria": sample_criteria()
        },
        headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 201
    data = resp.get_json()["data"]
    assert data["name"] == "Sprint 1 Template"
    assert len(data["criteria"]) == 2
    assert "_id" in data


def test_create_rubric_template_invalid_weights(client):
    token = get_manager_token(client)
    criteria = [
        {
            "question": "Problem Statement",
            "weight": 0,
            "levels": {str(i): f"Level {i}" for i in range(6)}
        }
    ]
    resp = client.post("/api/manager/rubric-templates",
        json={"name": "Bad Template", "criteria": criteria},
        headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 422
    assert "greater than 0" in resp.get_json()["message"]


def test_list_and_get_rubric_templates(client):
    token = get_manager_token(client)
    create_resp = client.post("/api/manager/rubric-templates",
        json={"name": "Template A", "criteria": sample_criteria()},
        headers={"Authorization": f"Bearer {token}"})
    tid = create_resp.get_json()["data"]["_id"]

    list_resp = client.get("/api/manager/rubric-templates",
        headers={"Authorization": f"Bearer {token}"})
    assert list_resp.status_code == 200
    items = list_resp.get_json()["data"]
    assert len(items) >= 1

    get_resp = client.get(f"/api/manager/rubric-templates/{tid}",
        headers={"Authorization": f"Bearer {token}"})
    assert get_resp.status_code == 200
    assert get_resp.get_json()["data"]["name"] == "Template A"


def test_delete_template_guarded_when_in_use(client):
    token = get_manager_token(client)
    # Create template
    t_resp = client.post("/api/manager/rubric-templates",
        json={"name": "Locked Template", "criteria": sample_criteria()},
        headers={"Authorization": f"Bearer {token}"})
    tid = t_resp.get_json()["data"]["_id"]

    # Create iteration referencing template
    iter_resp = client.post("/api/manager/iterations",
        json={
            "title": "Iteration with Template",
            "course": "All Courses",
            "deadline": "2026-09-30T23:59",
            "rubric_template_id": tid
        },
        headers={"Authorization": f"Bearer {token}"})
    assert iter_resp.status_code == 201
    iter_data = iter_resp.get_json()["data"]
    assert len(iter_data["rubrics"]) == 2

    # Attempt delete should fail (blocked because in use)
    del_resp = client.delete(f"/api/manager/rubric-templates/{tid}",
        headers={"Authorization": f"Bearer {token}"})
    assert del_resp.status_code == 400
    assert "reference it" in del_resp.get_json()["message"]


def test_student_sees_all_courses_iteration(client):
    mgr_token = get_manager_token(client)
    std_token = get_student_token(client)

    # Manager creates an All Courses iteration
    client.post("/api/manager/iterations",
        json={
            "title": "Global Proposal",
            "course": "All Courses",
            "deadline": "2026-10-01"
        },
        headers={"Authorization": f"Bearer {mgr_token}"})

    # Student requests iterations
    resp = client.get("/api/student/iterations",
        headers={"Authorization": f"Bearer {std_token}"})
    assert resp.status_code == 200
    items = resp.get_json()["data"]
    assert any(i["title"] == "Global Proposal" and i["course"] == "All Courses" for i in items)
