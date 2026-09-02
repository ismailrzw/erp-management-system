# backend/tests/test_announcement_tracking.py
"""Tests for per-user announcement recent tagging and auto-untagging lifecycle."""


def test_manager_announcements_never_have_recent_tag(client, manager_headers):
    """Manager should never see 'is_recent: True' for announcements."""
    # 1. Create an announcement as manager
    res = client.post(
        "/api/manager/announcements/",
        json={"title": "Manager Post", "content": "Guidelines posted by manager."},
        headers=manager_headers,
    )
    assert res.status_code == 201

    # 2. Check manager dashboard
    dash_res = client.get("/api/manager/dashboard/", headers=manager_headers)
    assert dash_res.status_code == 200
    announcements = dash_res.get_json()["data"]["announcements"]
    assert len(announcements) >= 1
    for ann in announcements:
        assert ann.get("is_recent") is False

    # 3. Check manager announcements list
    list_res = client.get("/api/manager/announcements/", headers=manager_headers)
    assert list_res.status_code == 200
    items = list_res.get_json()["data"]["items"]
    assert len(items) >= 1
    for ann in items:
        assert ann.get("is_recent") is False


def test_student_sees_recent_tag_for_new_announcement(client, manager_headers, real_student_headers):
    """Student sees is_recent: True on announcements created since their last login."""
    # 1. Manager posts an announcement
    create_res = client.post(
        "/api/manager/announcements/",
        json={"title": "Sprint 3 Kickoff", "content": "Iterations have begun."},
        headers=manager_headers,
    )
    assert create_res.status_code == 201
    ann_id = create_res.get_json()["data"]["id"]

    # 2. Student fetches announcements
    ann_res = client.get("/api/student/announcements/", headers=real_student_headers)
    assert ann_res.status_code == 200
    items = ann_res.get_json()["data"]["items"]
    target = next((a for a in items if a["id"] == ann_id), None)
    assert target is not None
    assert target["is_recent"] is True

    # 3. Student dashboard also reflects recent announcements
    dash_res = client.get("/api/student/dashboard/", headers=real_student_headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.get_json()["data"]
    assert dash_data["recent_announcements_count"] >= 1
    dash_ann = next((a for a in dash_data["announcements"] if a["id"] == ann_id), None)
    assert dash_ann is not None
    assert dash_ann["is_recent"] is True


def test_student_mark_announcement_viewed_untags_recent(client, manager_headers, real_student_headers):
    """Calling /view marks the announcement viewed and untags is_recent."""
    create_res = client.post(
        "/api/manager/announcements/",
        json={"title": "Important Notice", "content": "Please review this immediately."},
        headers=manager_headers,
    )
    ann_id = create_res.get_json()["data"]["id"]

    # Verify initially recent
    r1 = client.get("/api/student/announcements/", headers=real_student_headers)
    target = next(a for a in r1.get_json()["data"]["items"] if a["id"] == ann_id)
    assert target["is_recent"] is True

    # Student views the announcement
    view_res = client.post(f"/api/student/announcements/{ann_id}/view", headers=real_student_headers)
    assert view_res.status_code == 200
    assert view_res.get_json()["success"] is True

    # Verify is_recent is now False
    r2 = client.get("/api/student/announcements/", headers=real_student_headers)
    target_after = next(a for a in r2.get_json()["data"]["items"] if a["id"] == ann_id)
    assert target_after["is_recent"] is False


def test_student_mark_all_viewed(client, manager_headers, real_student_headers):
    """POST /view-all marks all announcements viewed."""
    client.post(
        "/api/manager/announcements/",
        json={"title": "Ann 1", "content": "Content 1"},
        headers=manager_headers,
    )
    client.post(
        "/api/manager/announcements/",
        json={"title": "Ann 2", "content": "Content 2"},
        headers=manager_headers,
    )

    view_all_res = client.post("/api/student/announcements/view-all", headers=real_student_headers)
    assert view_all_res.status_code == 200

    r = client.get("/api/student/announcements/", headers=real_student_headers)
    assert r.status_code == 200
    for ann in r.get_json()["data"]["items"]:
        assert ann["is_recent"] is False


def test_viewed_announcement_remains_untagged_on_subsequent_login(
    client, manager_headers, student_user, student_token, real_student_headers
):
    """Once an announcement is viewed, it should not be re-tagged as recent on subsequent login."""
    create_res = client.post(
        "/api/manager/announcements/",
        json={"title": "Persistent Tag Test", "content": "Content."},
        headers=manager_headers,
    )
    ann_id = create_res.get_json()["data"]["id"]

    # Student views it
    client.post(f"/api/student/announcements/{ann_id}/view", headers=real_student_headers)

    # Student logs in again to get fresh session
    login_res = client.post(
        "/api/auth/login",
        json={"email": student_user["email"], "password": student_user["password"]},
    )
    assert login_res.status_code == 200
    new_token = login_res.get_json()["data"]["token"]
    new_headers = {"Authorization": f"Bearer {new_token}"}

    # Verify announcement is STILL not recent
    ann_res = client.get("/api/student/announcements/", headers=new_headers)
    target = next(a for a in ann_res.get_json()["data"]["items"] if a["id"] == ann_id)
    assert target["is_recent"] is False
