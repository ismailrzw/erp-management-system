# backend/tests/test_exhibition.py
"""
Sprint 4 — Exhibition Evaluation Tests.

Tests POST /api/evaluator/exhibition and immutability guards.
"""


def test_submit_exhibition_eval_success(client, evaluator_headers, approved_group):
    """Submit an exhibition evaluation — expect 201 with id."""
    resp = client.post(
        "/api/evaluator/exhibition",
        json={
            "group_id":    approved_group["id"],
            "scores":      {"presentation": 4, "demo": 5},
            "total_marks": 90,
            "comment":     "Impressive demo.",
        },
        headers=evaluator_headers,
    )
    assert resp.status_code == 201, resp.get_json()
    data = resp.get_json()["data"]
    assert "id" in data


def test_submit_exhibition_eval_without_comment(client, evaluator_headers, approved_group):
    """Comment is optional — submission should succeed."""
    resp = client.post(
        "/api/evaluator/exhibition",
        json={
            "group_id":    approved_group["id"],
            "total_marks": 80,
        },
        headers=evaluator_headers,
    )
    assert resp.status_code == 201, resp.get_json()


def test_duplicate_exhibition_eval_returns_409(client, evaluator_headers, approved_group):
    """Second exhibition eval for the same group returns 409."""
    payload = {"group_id": approved_group["id"], "total_marks": 85}
    r1 = client.post("/api/evaluator/exhibition", json=payload, headers=evaluator_headers)
    assert r1.status_code == 201, r1.get_json()

    r2 = client.post("/api/evaluator/exhibition", json=payload, headers=evaluator_headers)
    assert r2.status_code == 409, r2.get_json()


def test_exhibition_eval_locked_cannot_update(client, evaluator_headers, approved_group):
    """PUT on an exhibition evaluation must return 405."""
    # First submit
    resp = client.post(
        "/api/evaluator/exhibition",
        json={"group_id": approved_group["id"], "total_marks": 75},
        headers=evaluator_headers,
    )
    assert resp.status_code == 201
    eval_id = resp.get_json()["data"]["id"]

    # Attempt update
    put_resp = client.put(
        f"/api/evaluator/exhibition/{eval_id}",
        json={"total_marks": 90},
        headers=evaluator_headers,
    )
    assert put_resp.status_code == 405, put_resp.get_json()


def test_exhibition_eval_locked_cannot_delete(client, evaluator_headers, approved_group):
    """DELETE on an exhibition evaluation must return 405."""
    resp = client.post(
        "/api/evaluator/exhibition",
        json={"group_id": approved_group["id"], "total_marks": 70},
        headers=evaluator_headers,
    )
    assert resp.status_code == 201
    eval_id = resp.get_json()["data"]["id"]

    del_resp = client.delete(
        f"/api/evaluator/exhibition/{eval_id}",
        headers=evaluator_headers,
    )
    assert del_resp.status_code == 405, del_resp.get_json()


def test_exhibition_eval_unassigned_group_rejected(client, evaluator_headers, unassigned_group):
    """Evaluator cannot submit exhibition eval for an unassigned group — 403."""
    resp = client.post(
        "/api/evaluator/exhibition",
        json={"group_id": unassigned_group["id"], "total_marks": 80},
        headers=evaluator_headers,
    )
    assert resp.status_code == 403, resp.get_json()


def test_exhibition_eval_missing_group_id(client, evaluator_headers):
    """Missing group_id — expect 400."""
    resp = client.post(
        "/api/evaluator/exhibition",
        json={"total_marks": 80},
        headers=evaluator_headers,
    )
    assert resp.status_code == 400, resp.get_json()


def test_get_exhibition_list(client, evaluator_headers, approved_group):
    """GET /api/evaluator/exhibition returns assigned groups with eval status."""
    resp = client.get("/api/evaluator/exhibition", headers=evaluator_headers)
    assert resp.status_code == 200, resp.get_json()
    data = resp.get_json()["data"]
    assert "items" in data
    assert data["total"] >= 1
    # The assigned group should be in the list
    ids = [item["id"] for item in data["items"]]
    assert approved_group["id"] in ids


def test_get_exhibition_list_shows_eval_status(client, evaluator_headers, approved_group):
    """After submitting, exhibition list should show evaluated=True for that group."""
    # Submit
    client.post(
        "/api/evaluator/exhibition",
        json={"group_id": approved_group["id"], "total_marks": 88},
        headers=evaluator_headers,
    )
    # Check list
    resp = client.get("/api/evaluator/exhibition", headers=evaluator_headers)
    items = resp.get_json()["data"]["items"]
    group_item = next((i for i in items if i["id"] == approved_group["id"]), None)
    assert group_item is not None
    assert group_item["evaluated"] is True
