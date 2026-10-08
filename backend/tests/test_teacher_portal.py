"""Teacher Portal API contract tests."""

import pytest

from app.models.user import Role


@pytest.fixture
def teacher_user(client, app):
    import bcrypt

    from app.extensions import mongo

    email = "teacher.portal.test@bnu.edu.pk"
    mongo.db.users.delete_one({"email": email})
    hashed = bcrypt.hashpw(b"11223344", bcrypt.gensalt()).decode("utf-8")
    res = mongo.db.users.insert_one({
        "name": "Dr. Portal Test Teacher",
        "email": email,
        "password_hash": hashed,
        "role": Role.TEACHER,
        "dept": "CS",
        "domains": ["AI", "Robotics"],
        "deleted": False,
    })
    return {"id": str(res.inserted_id), "email": email}


@pytest.fixture
def teacher_headers(client, teacher_user):
    res = client.post("/api/auth/login", json={"email": teacher_user["email"], "password": "11223344"})
    assert res.status_code == 200, res.get_json()
    token = res.get_json()["data"]["token"]
    return {"Authorization": f"Bearer {token}"}


def test_get_teacher_dashboard(client, teacher_headers):
    res = client.get("/api/teacher/dashboard", headers=teacher_headers)
    assert res.status_code == 200, res.get_json()
    data = res.get_json()["data"]
    assert data["stats"]["max_supervision_cap"] == 4
    assert data["stats"]["active_groups_count"] == 0
    assert data["stats"]["pending_requests_count"] == 0
    assert data["groups"] == []
    assert data["incoming_requests"] == []


def test_get_teacher_groups(client, teacher_headers):
    res = client.get("/api/teacher/groups", headers=teacher_headers)
    assert res.status_code == 200, res.get_json()
    data = res.get_json()["data"]
    assert "items" in data


def test_get_teacher_students(client, teacher_headers):
    res = client.get("/api/teacher/students", headers=teacher_headers)
    assert res.status_code == 200, res.get_json()
    data = res.get_json()["data"]
    assert "items" in data


def test_get_and_update_teacher_profile_domains(client, teacher_headers):
    res = client.get("/api/teacher/profile", headers=teacher_headers)
    assert res.status_code == 200, res.get_json()
    data = res.get_json()["data"]
    assert data["name"] == "Dr. Portal Test Teacher"

    # Update domains
    update_res = client.put(
        "/api/teacher/profile/domains",
        json={"domains": ["Quantum Computing", "Deep Learning"]},
        headers=teacher_headers,
    )
    assert update_res.status_code == 200, update_res.get_json()
    assert update_res.get_json()["data"]["domains"] == ["Quantum Computing", "Deep Learning"]
