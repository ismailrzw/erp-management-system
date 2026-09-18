# backend/app/blueprints/evaluator/exhibition.py
"""
Exhibition Evaluation endpoints.

GET  /api/evaluator/exhibition         — list assigned groups with exhibition eval status
POST /api/evaluator/exhibition         — submit exhibition evaluation (locked on create)
<id> PUT/PATCH/DELETE                  — 405 Method Not Allowed (immutability guard)

Exhibition evaluations follow the same immutability rules as iteration evaluations.
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


@bp.route("/exhibition", methods=["GET"])
@role_required(Role.EVALUATOR)
def list_exhibition_groups():
    """Return assigned groups with their exhibition evaluation status."""
    evaluator_id = ObjectId(get_jwt_identity())

    assignments = list(mongo.db.assignments.find({"evaluator_id": evaluator_id}))
    group_ids = [a["group_id"] for a in assignments]

    if not group_ids:
        return success_response("No assigned groups.", data={"items": [], "total": 0})

    groups = list(mongo.db.groups.find({"_id": {"$in": group_ids}}))
    items = []
    for g in groups:
        gid = g["_id"]
        existing_eval = mongo.db.exhibition_evaluations.find_one({
            "evaluator_id": evaluator_id,
            "group_id":     gid,
        })
        submitted_at = None
        if existing_eval and existing_eval.get("submitted_at"):
            submitted_at = existing_eval["submitted_at"]
            if isinstance(submitted_at, datetime):
                submitted_at = submitted_at.isoformat()

        items.append({
            "id":           str(gid),
            "name":         g.get("name", ""),
            "course":       g.get("course", ""),
            "dept":         g.get("dept", ""),
            "evaluated":    existing_eval is not None,
            "evaluation_id": str(existing_eval["_id"]) if existing_eval else None,
            "submitted_at": submitted_at,
        })

    return success_response("Exhibition groups retrieved.", data={
        "items": items,
        "total": len(items),
    })


@bp.route("/exhibition", methods=["POST"])
@role_required(Role.EVALUATOR)
def submit_exhibition_eval():
    """Submit an exhibition evaluation for an assigned group. Locked on creation."""
    evaluator_id = get_jwt_identity()
    data = request.get_json() or {}

    group_id    = data.get("group_id")
    scores      = data.get("scores", {})
    total_marks = data.get("total_marks")
    comment     = (data.get("comment") or "").strip()

    if not group_id:
        return error_response("group_id is required.", 400)
    if not scores and total_marks is None:
        return error_response("scores or total_marks is required.", 400)

    try:
        gid = ObjectId(group_id)
        eid = ObjectId(evaluator_id)
    except Exception:
        return error_response("Invalid ID format.", 400)

    # Verify assignment
    assignment = mongo.db.assignments.find_one({
        "evaluator_id": eid,
        "group_id":     gid,
    })
    if not assignment:
        return error_response(
            "You are not assigned to this group. Cannot submit exhibition evaluation.", 403)

    # Prevent duplicate
    existing = mongo.db.exhibition_evaluations.find_one({
        "evaluator_id": eid,
        "group_id":     gid,
    })
    if existing:
        return error_response(
            "You have already submitted an exhibition evaluation for this group. "
            "Exhibition evaluations are locked and cannot be resubmitted.", 409)

    # Validate score range (0–5) if scores provided
    for key, val in scores.items():
        if not isinstance(val, (int, float)) or val < 0 or val > 5:
            return error_response(
                f"Score for criterion '{key}' must be a number between 0 and 5.", 422)

    doc = {
        "group_id":    gid,
        "evaluator_id": eid,
        "scores":      scores,
        "total_marks": total_marks,
        "comment":     comment,
        "locked":      True,
        "submitted_at": datetime.now(timezone.utc),
    }
    result = mongo.db.exhibition_evaluations.insert_one(doc)

    log_audit(
        mongo.db, evaluator_id, Role.EVALUATOR, "exhibition_evaluations", "create",
        result.inserted_id,
        new_value={"group_id": group_id, "total_marks": total_marks},
    )

    return success_response(
        "Exhibition evaluation submitted and locked.",
        data={"id": str(result.inserted_id)},
        status=201,
    )


# ── Immutability Guard ────────────────────────────────────────────────────────
@bp.route("/exhibition/<eval_id>", methods=["PUT", "PATCH", "DELETE"])
@role_required(Role.EVALUATOR)
def exhibition_immutable(eval_id):
    """Block all modification methods — exhibition evaluations are immutable after submission."""
    return error_response(
        "Exhibition evaluations are immutable after submission. "
        "Contact your PBL Manager if you believe there is an error.", 405)
