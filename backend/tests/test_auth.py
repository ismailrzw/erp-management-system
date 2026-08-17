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
    assert response.get_json()["message"] == "Invalid email or password."


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
