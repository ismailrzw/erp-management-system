"""
Tests for POST /api/auth/login and authentication operations.
"""


def test_login_success(client, manager_user):
    """Manager can log in with correct credentials."""
    resp = client.post("/api/auth/login", json={
        "email": manager_user["email"],
        "password": manager_user["password"]
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True
    assert "token" in data["data"]
    assert data["data"]["user"]["role"] == "pbl_manager"


def test_login_wrong_password(client, manager_user):
    """Wrong password returns 401."""
    resp = client.post("/api/auth/login", json={
        "email": manager_user["email"],
        "password": "wrong-password"
    })
    assert resp.status_code == 401
    data = resp.get_json()
    assert data["success"] is False


def test_login_unknown_email(client):
    """Unknown email returns 401."""
    resp = client.post("/api/auth/login", json={
        "email": "nobody@bnu.edu.pk",
        "password": "anything"
    })
    assert resp.status_code == 401
    assert resp.get_json()["success"] is False


def test_login_missing_fields(client):
    """Missing email or password returns 400."""
    resp = client.post("/api/auth/login", json={"password": "only-password"})
    assert resp.status_code == 400
    assert resp.get_json()["success"] is False


def test_me_endpoint(client, manager_user):
    """Authenticated user can fetch their profile."""
    # Login first
    login_resp = client.post("/api/auth/login", json=manager_user)
    token = login_resp.get_json()["data"]["token"]

    # Test /me
    resp = client.get("/api/auth/me", headers={
        "Authorization": f"Bearer {token}"
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True
    assert data["data"]["email"] == manager_user["email"]
    assert data["data"]["role"] == "pbl_manager"


def test_no_token_returns_401(client):
    """Protected routes return 401 without a token."""
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_role_required_blocks_wrong_role(client, student_user, manager_user):
    """A student token cannot access a manager-protected endpoint (returns 403), while manager token succeeds (200)."""
    # Login as student
    login_resp = client.post("/api/auth/login", json=student_user)
    student_token = login_resp.get_json()["data"]["token"]

    # Try to access manager route as student -> expect 403 Forbidden
    resp = client.get("/api/test-role-protected", headers={
        "Authorization": f"Bearer {student_token}"
    })
    assert resp.status_code == 403
    assert resp.get_json()["success"] is False

    # Login as manager
    login_resp_mgr = client.post("/api/auth/login", json=manager_user)
    manager_token = login_resp_mgr.get_json()["data"]["token"]

    # Try to access manager route as manager -> expect 200 OK
    resp_mgr = client.get("/api/test-role-protected", headers={
        "Authorization": f"Bearer {manager_token}"
    })
    assert resp_mgr.status_code == 200
    assert resp_mgr.get_json()["success"] is True