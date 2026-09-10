"""Announcement API contract tests."""


def test_create_announcement(client, manager_headers):
    response = client.post(
        "/api/manager/announcements/",
        json={"title": "Deadline", "content": "Submit by Friday."},
        headers=manager_headers,
    )
    assert response.status_code == 201, response.get_json()
    data = response.get_json()["data"]
    assert data["title"] == "Deadline"
    assert data["content"] == "Submit by Friday."
    assert "id" in data


def test_list_announcements(client, manager_headers):
    client.post(
        "/api/manager/announcements/",
        json={"title": "Notice", "content": "General notice."},
        headers=manager_headers,
    )
    response = client.get("/api/manager/announcements/", headers=manager_headers)
    assert response.status_code == 200, response.get_json()
    data = response.get_json()["data"]
    assert "items" in data
    assert data["total"] >= 1


def test_update_announcement(client, manager_headers):
    created = client.post(
        "/api/manager/announcements/",
        json={"title": "Original", "content": "Original content."},
        headers=manager_headers,
    )
    announcement_id = created.get_json()["data"]["id"]

    response = client.put(
        f"/api/manager/announcements/{announcement_id}",
        json={"title": "Updated"},
        headers=manager_headers,
    )
    assert response.status_code == 200, response.get_json()
    assert response.get_json()["data"]["title"] == "Updated"


def test_delete_announcement(client, manager_headers):
    created = client.post(
        "/api/manager/announcements/",
        json={"title": "To Delete", "content": "Will be deleted."},
        headers=manager_headers,
    )
    announcement_id = created.get_json()["data"]["id"]

    response = client.delete(
        f"/api/manager/announcements/{announcement_id}",
        headers=manager_headers,
    )
    assert response.status_code == 200, response.get_json()

    # Confirm it's actually gone
    fetch = client.get(f"/api/manager/announcements/{announcement_id}", headers=manager_headers)
    assert fetch.status_code == 404