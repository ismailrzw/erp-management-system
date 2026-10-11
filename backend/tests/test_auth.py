from conftest import MANAGER_EMAIL


def test_login_success_returns_token(client):
    response = client.post("/api/auth/login", json={"email": MANAGER_EMAIL, "password": "11223344"})
    assert response.status_code == 200, response.get_json()
    assert response.get_json()["success"] is True
    assert response.get_json()["data"]["token"]
    assert response.get_json()["data"]["user"]["email"] == MANAGER_EMAIL


def test_login_rejects_wrong_password(client):
    response = client.post("/api/auth/login", json={"email": MANAGER_EMAIL, "password": "incorrect"})
    assert response.status_code == 401, response.get_json()
    assert "Invalid" in response.get_json()["message"]


def test_login_rejects_unknown_email(client):
    response = client.post("/api/auth/login", json={"email": "missing@bnu.edu.pk", "password": "anything"})
    assert response.status_code == 401, response.get_json()


def test_me_returns_claims_for_valid_token(client, manager_headers):
    response = client.get("/api/auth/me", headers=manager_headers)
    assert response.status_code == 200, response.get_json()
    user = response.get_json()["data"]
    assert user["email"] == MANAGER_EMAIL
    assert user["role"] == "pbl_manager"
    assert user["name"] == "Zaman Aziz"


def test_me_requires_token(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401, response.get_json()


def test_student_must_change_password_lifecycle(client, manager_headers):
    # 1. Create a student
    from app.extensions import mongo
    with client.application.app_context():
        mongo.db.departments.update_one({"code": "CS"}, {"$set": {"name": "Computer Science", "deleted": False}}, upsert=True)
        mongo.db.courses.update_one({"name": "PBL"}, {"$set": {"dept": "CS", "min_group": 2, "max_group": 4, "deleted": False}}, upsert=True)

    create_res = client.post(
        "/api/manager/students/",
        json={"name": "Temporary User", "roll": "f2025-500", "dept": "CS", "section": "A", "session": "2025", "course": "PBL"},
        headers=manager_headers,
    )
    assert create_res.status_code == 201, create_res.get_json()

    # 2. Login as the student with temporary password 11223344
    login_res = client.post("/api/auth/login", json={"email_or_roll": "f2025-500", "password": "11223344"})
    assert login_res.status_code == 200, login_res.get_json()
    student_token = login_res.get_json()["data"]["token"]
    assert login_res.get_json()["data"]["user"]["must_change_password"] is True

    # 3. /api/auth/me shows must_change_password is True
    student_headers = {"Authorization": f"Bearer {student_token}"}
    me_res = client.get("/api/auth/me", headers=student_headers)
    assert me_res.status_code == 200, me_res.get_json()
    assert me_res.get_json()["data"]["must_change_password"] is True

    # 4. Change password
    change_res = client.post(
        "/api/auth/change-password",
        json={"currentPassword": "11223344", "newPassword": "newSecretPassword123"},
        headers=student_headers,
    )
    assert change_res.status_code == 200, change_res.get_json()

    # 5. /api/auth/me now shows must_change_password is False
    me_after = client.get("/api/auth/me", headers=student_headers)
    assert me_after.status_code == 200, me_after.get_json()
    assert me_after.get_json()["data"]["must_change_password"] is False

    # 6. Next login returns must_change_password is False
    next_login = client.post("/api/auth/login", json={"email_or_roll": "f2025-500", "password": "newSecretPassword123"})
    assert next_login.status_code == 200, next_login.get_json()
    assert next_login.get_json()["data"]["user"]["must_change_password"] is False
