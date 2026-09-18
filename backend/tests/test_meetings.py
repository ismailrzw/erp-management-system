# backend/tests/test_meetings.py
"""
Sprint 4 — Supervision Meeting Log Tests.

Tests POST /api/evaluator/meetings and GET /api/evaluator/meetings.
"""


def test_log_meeting_success(client, evaluator_headers, approved_group):
    """Log a meeting with all fields — expect 201 and meeting id."""
    resp = client.post(
        "/api/evaluator/meetings",
        json={
            "group_id": approved_group["id"],
            "title":    "Week 3 Check-In",
            "date":     "2026-10-05",
            "agenda":   "Review SRS draft",
            "minutes":  "Team agreed to revise section 3.",
        },
        headers=evaluator_headers,
    )
    assert resp.status_code == 201, resp.get_json()
    data = resp.get_json()["data"]
    assert "id" in data


def test_log_meeting_minimal_fields(client, evaluator_headers, approved_group):
    """Log a meeting with only required fields (no agenda/minutes) — expect 201."""
    resp = client.post(
        "/api/evaluator/meetings",
        json={
            "group_id": approved_group["id"],
            "title":    "Kickoff Meeting",
            "date":     "2026-09-20",
        },
        headers=evaluator_headers,
    )
    assert resp.status_code == 201, resp.get_json()


def test_log_meeting_iso_datetime(client, evaluator_headers, approved_group):
    """Date can be provided as a full ISO 8601 datetime."""
    resp = client.post(
        "/api/evaluator/meetings",
        json={
            "group_id": approved_group["id"],
            "title":    "Mid-Sprint Review",
            "date":     "2026-10-15T10:30:00Z",
        },
        headers=evaluator_headers,
    )
    assert resp.status_code == 201, resp.get_json()


def test_log_meeting_missing_title_rejected(client, evaluator_headers, approved_group):
    """Missing title — expect 400."""
    resp = client.post(
        "/api/evaluator/meetings",
        json={"group_id": approved_group["id"], "date": "2026-10-01"},
        headers=evaluator_headers,
    )
    assert resp.status_code == 400, resp.get_json()


def test_log_meeting_missing_date_rejected(client, evaluator_headers, approved_group):
    """Missing date — expect 400."""
    resp = client.post(
        "/api/evaluator/meetings",
        json={"group_id": approved_group["id"], "title": "Review"},
        headers=evaluator_headers,
    )
    assert resp.status_code == 400, resp.get_json()


def test_log_meeting_missing_group_id_rejected(client, evaluator_headers):
    """Missing group_id — expect 400."""
    resp = client.post(
        "/api/evaluator/meetings",
        json={"title": "Review", "date": "2026-10-01"},
        headers=evaluator_headers,
    )
    assert resp.status_code == 400, resp.get_json()


def test_log_meeting_unassigned_group_rejected(client, evaluator_headers, unassigned_group):
    """Cannot log meeting for unassigned group — expect 403."""
    resp = client.post(
        "/api/evaluator/meetings",
        json={
            "group_id": unassigned_group["id"],
            "title":    "Review",
            "date":     "2026-10-01",
        },
        headers=evaluator_headers,
    )
    assert resp.status_code == 403, resp.get_json()


def test_log_meeting_invalid_date_rejected(client, evaluator_headers, approved_group):
    """Malformed date string — expect 422."""
    resp = client.post(
        "/api/evaluator/meetings",
        json={
            "group_id": approved_group["id"],
            "title":    "Review",
            "date":     "not-a-date",
        },
        headers=evaluator_headers,
    )
    assert resp.status_code == 422, resp.get_json()


def test_get_meetings_returns_list(client, evaluator_headers, approved_group):
    """GET /api/evaluator/meetings returns list of logged meetings."""
    # Log one meeting first
    client.post(
        "/api/evaluator/meetings",
        json={"group_id": approved_group["id"], "title": "Sprint Review", "date": "2026-10-10"},
        headers=evaluator_headers,
    )
    resp = client.get("/api/evaluator/meetings", headers=evaluator_headers)
    assert resp.status_code == 200, resp.get_json()
    data = resp.get_json()["data"]
    assert "items" in data
    assert data["total"] >= 1


def test_get_meetings_filter_by_group(client, evaluator_headers, approved_group):
    """Filter meetings by group_id returns only that group's meetings."""
    client.post(
        "/api/evaluator/meetings",
        json={"group_id": approved_group["id"], "title": "Sprint Review", "date": "2026-10-10"},
        headers=evaluator_headers,
    )
    resp = client.get(
        f"/api/evaluator/meetings?group_id={approved_group['id']}",
        headers=evaluator_headers,
    )
    assert resp.status_code == 200
    items = resp.get_json()["data"]["items"]
    assert all(item["group_id"] == approved_group["id"] for item in items)


def test_multiple_meetings_can_be_logged(client, evaluator_headers, approved_group):
    """Multiple meetings for the same group are all persisted."""
    for i in range(3):
        r = client.post(
            "/api/evaluator/meetings",
            json={"group_id": approved_group["id"], "title": f"Meeting {i}", "date": f"2026-10-0{i+1}"},
            headers=evaluator_headers,
        )
        assert r.status_code == 201

    resp = client.get(
        f"/api/evaluator/meetings?group_id={approved_group['id']}",
        headers=evaluator_headers,
    )
    assert resp.get_json()["data"]["total"] == 3
