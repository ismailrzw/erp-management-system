# backend/app/blueprints/evaluator/evaluations.py
"""
Evaluator Iteration Scoring endpoints.

POST /api/evaluator/evaluations        — submit rubric scores (locked on create)
GET  /api/evaluator/evaluations        — list evaluations (filter by group/iteration)
<id> PUT/PATCH/DELETE                  — 405 Method Not Allowed (immutability guard)

Evaluations are IMMUTABLE. Once submitted they cannot be updated, edited, or deleted
by anyone, including the Manager. This is a hard academic integrity requirement.
"""
from datetime import datetime, timezone

from bson import ObjectId
from flask import request
from flask_jwt_extended import get_jwt_identity

from app.blueprints.evaluator import evaluator_bp as bp
from app.extensions import mongo
from app.models.user import Role
from app.utils.decorators import role_required
from app.utils.responses import success_response, error_response
from app.utils.audit import log_audit


def compute_total_weighted_score(scores: dict, rubrics: list) -> float:
    """
    Weighted score formula:
        Σ (score_i / 5) × weight_i   for each rubric question.

    scores:  { "1": 4, "2": 3, ... }  — keys are rubric IDs as strings
    rubrics: [ { "id": 1, "weight": 25, ... } ]
    """
    rubric_map = {str(r["id"]): int(r["weight"]) for r in rubrics}
    total = 0.0
    for rubric_id_str, score in scores.items():
        weight = rubric_map.get(str(rubric_id_str), 0)
        total += (int(score) / 5) * weight
    return round(total, 2)


@bp.route("/evaluations", methods=["POST"])
@role_required(Role.EVALUATOR)
def submit_evaluation():
    """Submit rubric scores for a group's iteration. Locked on creation."""
    evaluator_id = get_jwt_identity()
    data = request.get_json() or {}

    group_id     = data.get("group_id")
    iteration_id = data.get("iteration_id")
    scores       = data.get("scores", {})
    comment      = (data.get("comment") or "").strip()

    if not group_id or not iteration_id or not scores:
        return error_response("group_id, iteration_id, and scores are required.", 400)

    # Verify evaluator is assigned to this group
    try:
        gid = ObjectId(group_id)
        iid = ObjectId(iteration_id)
        eid = ObjectId(evaluator_id)
    except Exception:
        return error_response("Invalid ID format.", 400)

    assignment = mongo.db.assignments.find_one({
        "evaluator_id": eid,
        "group_id":     gid,
    })
    if not assignment:
        return error_response(
            "You are not assigned to this group. Cannot submit evaluation.", 403)

    # Prevent duplicate (same evaluator + group + iteration)
    existing = mongo.db.evaluations.find_one({
        "group_id":     gid,
        "iteration_id": iid,
        "evaluator_id": eid,
    })
    if existing:
        return error_response(
            "You have already submitted an evaluation for this group and iteration. "
            "Evaluations are locked and cannot be resubmitted.", 409)

    # Validate scores against rubric questions
    iteration = mongo.db.iterations.find_one({"_id": iid})
    if not iteration:
        return error_response("Iteration not found.", 404)

    rubrics        = iteration.get("rubrics", [])
    rubric_ids_str = {str(r["id"]) for r in rubrics}

    for key, val in scores.items():
        if str(key) not in rubric_ids_str:
            return error_response(
                f"Score key '{key}' does not match any rubric question.", 422)
        if not isinstance(val, int) or val < 0 or val > 5:
            return error_response(
                f"Score for rubric '{key}' must be an integer between 0 and 5.", 422)

    total_score = compute_total_weighted_score(scores, rubrics)

    # Insert — locked: True at insert time (never updated)
    doc = {
        "group_id":             gid,
        "iteration_id":         iid,
        "evaluator_id":         eid,
        "scores":               scores,
        "total_weighted_score": total_score,
        "comment":              comment,
        "locked":               True,
        "submitted_at":         datetime.now(timezone.utc),
    }
    result = mongo.db.evaluations.insert_one(doc)

    log_audit(
        mongo.db, evaluator_id, Role.EVALUATOR, "evaluations", "create",
        result.inserted_id,
        new_value={"group_id": group_id, "total_score": total_score},
    )

    return success_response(
        f"Evaluation submitted and locked. Total weighted score: {total_score}.",
        data={"id": str(result.inserted_id), "total_weighted_score": total_score},
        status=201,
    )


@bp.route("/evaluations", methods=["GET"])
@role_required(Role.EVALUATOR)
def list_evaluations():
    """List evaluations submitted by this evaluator. Filter by group_id and/or iteration_id."""
    evaluator_id = ObjectId(get_jwt_identity())
    query = {"evaluator_id": evaluator_id}

    group_id_str     = request.args.get("group_id")
    iteration_id_str = request.args.get("iteration_id")

    if group_id_str:
        try:
            query["group_id"] = ObjectId(group_id_str)
        except Exception:
            return error_response("Invalid group_id.", 400)

    if iteration_id_str:
        try:
            query["iteration_id"] = ObjectId(iteration_id_str)
        except Exception:
            return error_response("Invalid iteration_id.", 400)

    evals = list(mongo.db.evaluations.find(query).sort("submitted_at", -1))
    items = []
    for e in evals:
        submitted_at = e.get("submitted_at")
        items.append({
            "id":                   str(e["_id"]),
            "group_id":             str(e["group_id"]),
            "iteration_id":         str(e["iteration_id"]),
            "scores":               e.get("scores", {}),
            "total_weighted_score": e.get("total_weighted_score"),
            "comment":              e.get("comment", ""),
            "locked":               e.get("locked", True),
            "submitted_at":         submitted_at.isoformat()
                                    if isinstance(submitted_at, datetime) else "",
        })

    return success_response("Evaluations retrieved.", data={"items": items, "total": len(items)})


# ── Immutability Guard ────────────────────────────────────────────────────────
@bp.route("/evaluations/<evaluation_id>", methods=["PUT", "PATCH", "DELETE"])
@role_required(Role.EVALUATOR)
def evaluation_immutable(evaluation_id):
    """Block all modification methods — evaluations are immutable after submission."""
    return error_response(
        "Evaluations are immutable after submission. "
        "Contact your PBL Manager if you believe there is an error.", 405)
