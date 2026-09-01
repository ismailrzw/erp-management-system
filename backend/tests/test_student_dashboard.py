# backend/tests/test_student_dashboard.py
"""
Integration tests for the Student Dashboard endpoint.

Covers
------
GET /api/student/dashboard
"""

DASHBOARD_URL = "/api/student/dashboard/"


def test_dashboard_no_group(client, real_student_headers, student_user):
    """Dashboard returns student profile, group=null, and empty lists when no data exists."""
    r = client.get(DASHBOARD_URL, headers=real_student_headers)
    assert r.status_code == 200, r.get_json()
    data = r.get_json()["data"]

    assert data["group"] is None
    assert data["pending_invitations_count"] == 0
    assert isinstance(data["announcements"], list)
    assert isinstance(data["attachments"], list)
    assert data["student"]["roll"] == student_user["roll"]
    assert "password_hash" not in data["student"]


def test_dashboard_with_group(client, real_student_headers):
    """Dashboard returns the student's group when they are in one."""
    client.post("/api/student/groups/", json={"name": "Team A", "project_title": "Smart System"}, headers=real_student_headers)
    r = client.get(DASHBOARD_URL, headers=real_student_headers)
    assert r.status_code == 200, r.get_json()
    data = r.get_json()["data"]
    assert data["group"] is not None
    assert data["group"]["name"] == "Team A"


def test_dashboard_with_pending_invitation(client, real_student_headers, second_student_headers, second_student_user):
    """pending_invitations_count reflects the actual number of pending invites."""
    group = client.post(
        "/api/student/groups/",
        json={"name": "Team A", "project_title": "Smart System"},
        headers=real_student_headers,
    ).get_json()["data"]
    client.post(
        f"/api/student/groups/{group['id']}/invite",
        json={"roll": second_student_user["roll"]},
        headers=real_student_headers,
    )

    r = client.get(DASHBOARD_URL, headers=second_student_headers)
    assert r.status_code == 200, r.get_json()
    assert r.get_json()["data"]["pending_invitations_count"] == 1


def test_dashboard_shows_announcements(client, real_student_headers, manager_headers):
    """Announcements posted by the manager appear on the student dashboard."""
    client.post(
        "/api/manager/announcements/",
        json={"title": "Welcome", "content": "Welcome to PBL system."},
        headers=manager_headers,
    )
    r = client.get(DASHBOARD_URL, headers=real_student_headers)
    assert r.status_code == 200, r.get_json()
    assert len(r.get_json()["data"]["announcements"]) == 1
    assert r.get_json()["data"]["announcements"][0]["title"] == "Welcome"


def test_dashboard_requires_auth(client):
    """Unauthenticated request returns 401."""
    r = client.get(DASHBOARD_URL)
    assert r.status_code == 401


def test_dashboard_rejects_manager_token(client, manager_headers):
    """Manager JWT is rejected → 403."""
    r = client.get(DASHBOARD_URL, headers=manager_headers)
    assert r.status_code == 403
