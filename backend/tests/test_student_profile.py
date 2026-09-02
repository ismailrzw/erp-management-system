# backend/tests/test_student_profile.py
"""
Integration tests for student profile endpoints.

Covers
------
- GET  /api/student/profile
- PUT  /api/student/profile
- POST /api/student/profile/change-password

All tests run against the isolated ``pbl_system_test`` database.
"""

PROFILE_URL = "/api/student/profile/"
CHANGE_PW_URL = "/api/student/profile/change-password"


# ── GET profile ────────────────────────────────────────────────────────────────

def test_get_profile_returns_student_data(client, real_student_headers, student_user):
    """GET returns name, roll, dept, section — never password_hash."""
    response = client.get(PROFILE_URL, headers=real_student_headers)
    assert response.status_code == 200, response.get_json()
    data = response.get_json()["data"]
    assert data["name"] == student_user["name"]
    assert data["roll"] == student_user["roll"]
    assert "password_hash" not in data


def test_get_profile_requires_auth(client):
    """Unauthenticated request returns 401."""
    response = client.get(PROFILE_URL)
    assert response.status_code == 401


def test_get_profile_rejects_manager_token(client, manager_headers):
    """Manager JWT is forbidden from student profile endpoint."""
    response = client.get(PROFILE_URL, headers=manager_headers)
    assert response.status_code == 403


# ── PUT profile ────────────────────────────────────────────────────────────────

def test_update_profile_name(client, real_student_headers):
    """PUT updates name successfully."""
    response = client.put(PROFILE_URL, json={"name": "Sara Khan"}, headers=real_student_headers)
    assert response.status_code == 200, response.get_json()
    assert response.get_json()["data"]["name"] == "Sara Khan"


def test_update_profile_recovery_email(client, real_student_headers):
    """PUT updates recovery_email to a valid email."""
    response = client.put(
        PROFILE_URL,
        json={"recovery_email": "sara.personal@gmail.com"},
        headers=real_student_headers,
    )
    assert response.status_code == 200, response.get_json()
    assert response.get_json()["data"]["recovery_email"] == "sara.personal@gmail.com"


def test_update_profile_rejects_invalid_email(client, real_student_headers):
    """PUT returns 422 for a malformed recovery_email."""
    response = client.put(
        PROFILE_URL,
        json={"recovery_email": "not-an-email"},
        headers=real_student_headers,
    )
    assert response.status_code == 422, response.get_json()
    assert "recovery_email" in response.get_json()["errors"]


def test_update_profile_empty_body_returns_400(client, real_student_headers):
    """PUT with no fields returns 400 (no updatable fields)."""
    response = client.put(PROFILE_URL, json={}, headers=real_student_headers)
    assert response.status_code == 400, response.get_json()


def test_update_profile_cannot_change_roll(client, real_student_headers, student_user):
    """Roll number must be immutable — the field is silently ignored."""
    response = client.put(PROFILE_URL, json={"roll": "HACKED-ROLL"}, headers=real_student_headers)
    # Either 400 (no updatable fields) or 200 with roll unchanged
    if response.status_code == 200:
        assert response.get_json()["data"]["roll"] == student_user["roll"]


def test_update_profile_name_too_short_returns_422(client, real_student_headers):
    """Names shorter than 2 chars fail schema validation."""
    response = client.put(PROFILE_URL, json={"name": "X"}, headers=real_student_headers)
    assert response.status_code == 422, response.get_json()


# ── POST change-password ───────────────────────────────────────────────────────

def test_change_password_success(client, real_student_headers, student_user):
    """Valid change: correct current password, matching new passwords → 200."""
    response = client.post(
        CHANGE_PW_URL,
        json={
            "current_password": student_user["password"],
            "new_password":     "NewSecure@123",
            "confirm_password": "NewSecure@123",
        },
        headers=real_student_headers,
    )
    assert response.status_code == 200, response.get_json()
    assert response.get_json()["data"]["changed"] is True


def test_change_password_can_login_with_new_password(client, real_student_headers, student_user):
    """After a successful change, the student can log in with the new password."""
    client.post(
        CHANGE_PW_URL,
        json={
            "current_password": student_user["password"],
            "new_password":     "NewSecure@123",
            "confirm_password": "NewSecure@123",
        },
        headers=real_student_headers,
    )
    login = client.post(
        "/api/auth/login",
        json={"email": student_user["email"], "password": "NewSecure@123"},
    )
    assert login.status_code == 200, login.get_json()


def test_change_password_wrong_current(client, real_student_headers):
    """Wrong current password returns 401."""
    response = client.post(
        CHANGE_PW_URL,
        json={
            "current_password": "WrongPassword!",
            "new_password":     "NewSecure@123",
            "confirm_password": "NewSecure@123",
        },
        headers=real_student_headers,
    )
    assert response.status_code == 401, response.get_json()
    assert "incorrect" in response.get_json()["message"].lower()


def test_change_password_mismatch_returns_422(client, real_student_headers, student_user):
    """Mismatched new_password / confirm_password returns 422."""
    response = client.post(
        CHANGE_PW_URL,
        json={
            "current_password": student_user["password"],
            "new_password":     "NewSecure@123",
            "confirm_password": "DifferentPass@456",
        },
        headers=real_student_headers,
    )
    assert response.status_code == 422, response.get_json()
    assert "confirm_password" in response.get_json()["errors"]


def test_change_password_same_as_current_returns_422(client, real_student_headers, student_user):
    """New password identical to current password returns 422."""
    response = client.post(
        CHANGE_PW_URL,
        json={
            "current_password": student_user["password"],
            "new_password":     student_user["password"],
            "confirm_password": student_user["password"],
        },
        headers=real_student_headers,
    )
    assert response.status_code == 422, response.get_json()


def test_change_password_too_short_returns_422(client, real_student_headers, student_user):
    """New password shorter than 8 chars returns 422."""
    response = client.post(
        CHANGE_PW_URL,
        json={
            "current_password": student_user["password"],
            "new_password":     "short",
            "confirm_password": "short",
        },
        headers=real_student_headers,
    )
    assert response.status_code == 422, response.get_json()


def test_change_password_requires_auth(client):
    """Unauthenticated change-password request returns 401."""
    response = client.post(
        CHANGE_PW_URL,
        json={"current_password": "x", "new_password": "y12345678", "confirm_password": "y12345678"},
    )
    assert response.status_code == 401
