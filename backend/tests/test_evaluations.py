# backend/tests/test_evaluations.py
"""
Sprint 4 — Evaluator Iteration Scoring Tests.

Tests the POST /api/evaluator/evaluations endpoint and immutability guards.
"""
import pytest


# ── Unit test (no HTTP) ───────────────────────────────────────────────────────

def test_total_weighted_score_computed_correctly():
    """Unit test for the scoring formula — no HTTP call needed."""
    from app.blueprints.evaluator.evaluations import compute_total_weighted_score
    rubrics = [{"id": 1, "weight": 60}, {"id": 2, "weight": 40}]
    scores  = {"1": 5, "2": 3}
    # (5/5 × 60) + (3/5 × 40) = 60 + 24 = 84
    assert compute_total_weighted_score(scores, rubrics) == 84.0


def test_total_weighted_score_all_zero():
    from app.blueprints.evaluator.evaluations import compute_total_weighted_score
    rubrics = [{"id": 1, "weight": 60}, {"id": 2, "weight": 40}]
    scores  = {"1": 0, "2": 0}
    assert compute_total_weighted_score(scores, rubrics) == 0.0


# ── Integration tests ─────────────────────────────────────────────────────────

def test_submit_evaluation_success(client, evaluator_headers, approved_group, iteration_with_rubrics):
    """Evaluator submits valid scores — expect 201 with total_weighted_score."""
    resp = client.post(
        "/api/evaluator/evaluations",
        json={
            "group_id":     approved_group["id"],
            "iteration_id": iteration_with_rubrics["id"],
            "scores":       {"1": 5, "2": 3},
            "comment":      "Good proposal.",
        },
        headers=evaluator_headers,
    )
    assert resp.status_code == 201, resp.get_json()
    data = resp.get_json()["data"]
    assert "id" in data
    assert "total_weighted_score" in data
    # (5/5 × 60) + (3/5 × 40) = 60 + 24 = 84
    assert data["total_weighted_score"] == 84.0


def test_submit_evaluation_without_comment(client, evaluator_headers, approved_group, iteration_with_rubrics):
    """Comment is optional — submission should still succeed."""
    resp = client.post(
        "/api/evaluator/evaluations",
        json={
            "group_id":     approved_group["id"],
            "iteration_id": iteration_with_rubrics["id"],
            "scores":       {"1": 4, "2": 4},
        },
        headers=evaluator_headers,
    )
    assert resp.status_code == 201, resp.get_json()


def test_duplicate_evaluation_returns_409(client, evaluator_headers, submitted_evaluation, approved_group, iteration_with_rubrics):
    """Second submit for the same group+iteration returns 409 Conflict."""
    resp = client.post(
        "/api/evaluator/evaluations",
        json={
            "group_id":     submitted_evaluation["group_id"],
            "iteration_id": submitted_evaluation["iteration_id"],
            "scores":       {"1": 5, "2": 5},
        },
        headers=evaluator_headers,
    )
    assert resp.status_code == 409, resp.get_json()


def test_evaluation_locked_cannot_update(client, evaluator_headers, submitted_evaluation):
    """PUT on an evaluation must return 405 Method Not Allowed."""
    resp = client.put(
        f"/api/evaluator/evaluations/{submitted_evaluation['id']}",
        json={"scores": {"1": 5}},
        headers=evaluator_headers,
    )
    assert resp.status_code == 405, resp.get_json()


def test_evaluation_locked_cannot_delete(client, evaluator_headers, submitted_evaluation):
    """DELETE on an evaluation must return 405 Method Not Allowed."""
    resp = client.delete(
        f"/api/evaluator/evaluations/{submitted_evaluation['id']}",
        headers=evaluator_headers,
    )
    assert resp.status_code == 405, resp.get_json()


def test_evaluator_cannot_evaluate_unassigned_group(client, evaluator_headers, unassigned_group, iteration_with_rubrics):
    """Evaluator must not score a group they are not assigned to — expect 403."""
    resp = client.post(
        "/api/evaluator/evaluations",
        json={
            "group_id":     unassigned_group["id"],
            "iteration_id": iteration_with_rubrics["id"],
            "scores":       {"1": 3, "2": 2},
        },
        headers=evaluator_headers,
    )
    assert resp.status_code == 403, resp.get_json()


def test_invalid_score_range_rejected(client, evaluator_headers, approved_group, iteration_with_rubrics):
    """Score value 6 is out of the 0–5 range — expect 422."""
    resp = client.post(
        "/api/evaluator/evaluations",
        json={
            "group_id":     approved_group["id"],
            "iteration_id": iteration_with_rubrics["id"],
            "scores":       {"1": 6, "2": 3},
        },
        headers=evaluator_headers,
    )
    assert resp.status_code == 422, resp.get_json()


def test_score_key_not_matching_rubric_rejected(client, evaluator_headers, approved_group, iteration_with_rubrics):
    """Score key 99 does not match any rubric ID — expect 422."""
    resp = client.post(
        "/api/evaluator/evaluations",
        json={
            "group_id":     approved_group["id"],
            "iteration_id": iteration_with_rubrics["id"],
            "scores":       {"99": 3},
        },
        headers=evaluator_headers,
    )
    assert resp.status_code == 422, resp.get_json()


def test_missing_required_fields_rejected(client, evaluator_headers):
    """Missing group_id, iteration_id, and scores — expect 400."""
    resp = client.post(
        "/api/evaluator/evaluations",
        json={},
        headers=evaluator_headers,
    )
    assert resp.status_code == 400, resp.get_json()


def test_get_evaluations_returns_list(client, evaluator_headers, submitted_evaluation):
    """GET /api/evaluator/evaluations returns the evaluator's submitted evals."""
    resp = client.get("/api/evaluator/evaluations", headers=evaluator_headers)
    assert resp.status_code == 200, resp.get_json()
    data = resp.get_json()["data"]
    assert "items" in data
    assert data["total"] >= 1


def test_get_evaluations_filter_by_group(client, evaluator_headers, submitted_evaluation, approved_group):
    """Filter by group_id returns only evals for that group."""
    resp = client.get(
        f"/api/evaluator/evaluations?group_id={approved_group['id']}",
        headers=evaluator_headers,
    )
    assert resp.status_code == 200, resp.get_json()
    items = resp.get_json()["data"]["items"]
    assert all(item["group_id"] == approved_group["id"] for item in items)


def test_unauthenticated_access_rejected(client):
    """No JWT provided — expect 401."""
    resp = client.post("/api/evaluator/evaluations", json={})
    assert resp.status_code == 401


def test_manager_cannot_access_evaluator_endpoint(client, manager_headers):
    """Manager JWT must not be accepted by evaluator-only endpoint — expect 403."""
    resp = client.get("/api/evaluator/evaluations", headers=manager_headers)
    assert resp.status_code == 403
