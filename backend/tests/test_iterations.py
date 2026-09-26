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


def test_create_iteration_with_sprint_and_milestones(client):
    token = get_manager_token(client)
    # 1. Create Sprint 1 Milestone 1 (Group Formation)
    resp1 = client.post("/api/manager/iterations",
        json={
            "title": "Group Formation Cutoff",
            "course": "FYP 2025",
            "deadline": "2026-08-01",
            "sprint_name": "Sprint 1",
            "milestone_order": 1,
            "milestone_type": "group_formation",
            "is_group_formation": True,
            "late_penalty_percent": 15,
        },
        headers={"Authorization": f"Bearer {token}"})
    assert resp1.status_code == 201
    d1 = resp1.get_json()["data"]
    assert d1["sprint_name"] == "Sprint 1"
    assert d1["milestone_order"] == 1
    assert d1["milestone_type"] == "group_formation"
    assert d1["is_group_formation"] is True

    # 2. Create Sprint 1 Milestone 2 (Deliverable)
    resp2 = client.post("/api/manager/iterations",
        json={
            "title": "SRS Document Submission",
            "course": "FYP 2025",
            "deadline": "2026-08-15",
            "sprint_name": "Sprint 1",
            "milestone_order": 2,
            "milestone_type": "deliverable",
        },
        headers={"Authorization": f"Bearer {token}"})
    assert resp2.status_code == 201
    d2 = resp2.get_json()["data"]
    assert d2["sprint_name"] == "Sprint 1"
    assert d2["milestone_order"] == 2

    # 3. Create Sprint 2 Milestone 1 (Presentation)
    resp3 = client.post("/api/manager/iterations",
        json={
            "title": "Sprint 2 Demo & Presentation",
            "course": "FYP 2025",
            "deadline": "2026-09-01",
            "sprint_name": "Sprint 2",
            "milestone_order": 1,
            "milestone_type": "presentation",
        },
        headers={"Authorization": f"Bearer {token}"})
    assert resp3.status_code == 201

    # Verify listing returns milestones sorted by sprint and order
    list_resp = client.get("/api/manager/iterations?course=FYP+2025",
        headers={"Authorization": f"Bearer {token}"})
    assert list_resp.status_code == 200
    items = list_resp.get_json()["data"]
    assert len(items) == 3
    assert items[0]["sprint_name"] == "Sprint 1"
    assert items[0]["milestone_order"] == 1
    assert items[1]["sprint_name"] == "Sprint 1"
    assert items[1]["milestone_order"] == 2
    assert items[2]["sprint_name"] == "Sprint 2"
    assert items[2]["milestone_order"] == 1


def test_grade_student_defaulter_with_rubrics(client):
    from bson import ObjectId
    token = get_manager_token(client)

    # 1. Create a student user
    student_id = mongo.db.users.insert_one({
        "name": "Ali Raza",
        "email": "ali.raza@bnu.edu.pk",
        "roll": "F2024-999",
        "role": "student",
        "course": "FYP 2025",
        "dept": "SE",
        "section": "A",
        "deleted": False,
    }).inserted_id

    # 2. Create milestone and configure rubrics (Criterion 1: 20 pts, Criterion 2: 30 pts)
    iter_resp = client.post("/api/manager/iterations",
        json={
            "title": "Sprint 1 Group Formation Cutoff",
            "course": "FYP 2025",
            "deadline": "2026-08-01",
            "sprint_name": "Sprint 1",
            "milestone_order": 1,
            "milestone_type": "group_formation",
            "is_group_formation": True,
        },
        headers={"Authorization": f"Bearer {token}"})
    iter_id = iter_resp.get_json()["data"]["_id"]

    rubrics = [
        {"id": 1, "question": "Timely Group Formation", "weight": 20, "levels": {"0": "Defaulter", "5": "Excellent"}},
        {"id": 2, "question": "Initial Proposal Clarity", "weight": 30, "levels": {"0": "None", "5": "Excellent"}},
    ]
    client.post(f"/api/manager/iterations/{iter_id}/rubrics",
        json={"rubrics": rubrics},
        headers={"Authorization": f"Bearer {token}"})

    # 3. Manager evaluates the student: Q1=0 (0/5*20 = 0), Q2=5 (5/5*30 = 30) => total 30/50 (60%)
    grade_resp = client.post(f"/api/manager/iterations/{iter_id}/student-evaluations",
        json={
            "student_id": str(student_id),
            "scores": {"1": 0, "2": 5},
            "feedback": "Failed to form a group by the cutoff deadline.",
            "is_defaulter": True,
        },
        headers={"Authorization": f"Bearer {token}"})
    assert grade_resp.status_code == 200
    grade_data = grade_resp.get_json()["data"]
    assert grade_data["total_weighted_score"] == 30.0
    assert grade_data["max_possible_score"] == 50
    assert grade_data["percentage"] == 60.0
    assert grade_data["is_defaulter"] is True
    assert grade_data["feedback"] == "Failed to form a group by the cutoff deadline."

    # 4. GET /student-evaluations returns the record
    get_evals = client.get(f"/api/manager/iterations/{iter_id}/student-evaluations",
        headers={"Authorization": f"Bearer {token}"})
    assert get_evals.status_code == 200
    eval_list = get_evals.get_json()["data"]
    assert len(eval_list) == 1
    assert eval_list[0]["student_id"] == str(student_id)
    assert eval_list[0]["total_weighted_score"] == 30.0

    # 5. GET /submissions enriches the ungrouped student with the evaluation
    subs_resp = client.get(f"/api/manager/iterations/{iter_id}/submissions",
        headers={"Authorization": f"Bearer {token}"})
    assert subs_resp.status_code == 200
    subs_data = subs_resp.get_json()["data"]
    ungrouped = subs_data["ungrouped_students"]
    matching_student = next((s for s in ungrouped if str(s.get("id")) == str(student_id)), None)
    assert matching_student is not None
    assert matching_student["evaluation"] is not None
    assert matching_student["evaluation"]["total_weighted_score"] == 30.0

