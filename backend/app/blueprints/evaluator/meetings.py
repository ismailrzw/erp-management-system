# backend/app/blueprints/evaluator/meetings.py
"""
Supervision Meeting Log endpoints.

POST /api/evaluator/meetings   — log a new supervision meeting
GET  /api/evaluator/meetings   — list meetings (filter by group_id)
"""
from datetime import datetime, timezone

from bson import ObjectId
from flask import request
from flask_jwt_extended import get_jwt_identity

from app.blueprints.evaluator import evaluator_bp as bp
from app.extensions import mongo
from app.models.user import Role
from app.utils.decorators import role_required
from app.utils.responses import error_response, success_response


@bp.route("/meetings", methods=["POST"])
@role_required(Role.EVALUATOR)
def log_meeting():
    """Log a supervision meeting for an assigned group."""
    evaluator_id = get_jwt_identity()
    data = request.get_json() or {}

    group_id = data.get("group_id")
    title    = (data.get("title") or "").strip()
    date_str = data.get("date")
    agenda   = (data.get("agenda") or "").strip()
    minutes  = (data.get("minutes") or "").strip()

    if not group_id:
        return error_response("group_id is required.", 400)
    if not title:
        return error_response("title is required.", 400)
    if not date_str:
        return error_response("date is required.", 400)

    try:
        gid = ObjectId(group_id)
        eid = ObjectId(evaluator_id)
    except Exception:  # noqa: BLE001
        return error_response("Invalid ID format.", 400)

    # Verify evaluator is assigned to this group
    assignment = mongo.db.assignments.find_one({
        "evaluator_id": eid,
        "group_id":     gid,
    })
    if not assignment:
        return error_response(
            "You are not assigned to this group. Cannot log a meeting.", 403)

    # Parse date
    try:
        if "T" in str(date_str):
            meeting_date = datetime.fromisoformat(str(date_str).replace("Z", "+00:00"))
        else:
            meeting_date = datetime.strptime(str(date_str), "%Y-%m-%d").replace(
                tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return error_response(
            "Invalid date format. Use ISO 8601 (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS).", 422)

    doc = {
        "evaluator_id": eid,
        "group_id":     gid,
        "title":        title,
        "date":         meeting_date,
        "agenda":       agenda,
        "minutes":      minutes,
        "logged_at":    datetime.now(timezone.utc),
    }
    result = mongo.db.meetings.insert_one(doc)

    return success_response(
        "Meeting logged successfully.",
        data={"id": str(result.inserted_id)},
        status=201,
    )


@bp.route("/meetings", methods=["GET"])
@role_required(Role.EVALUATOR)
def list_meetings():
    """List meetings logged by this evaluator. Filter by ?group_id=."""
    evaluator_id = ObjectId(get_jwt_identity())
    query = {"evaluator_id": evaluator_id}

    group_id_str = request.args.get("group_id")
    if group_id_str:
        try:
            query["group_id"] = ObjectId(group_id_str)
        except Exception:  # noqa: BLE001
            return error_response("Invalid group_id.", 400)

    meetings_raw = list(mongo.db.meetings.find(query).sort("date", -1))
    items = []
    for m in meetings_raw:
        date_val   = m.get("date")
        logged_val = m.get("logged_at")
        items.append({
            "id":         str(m["_id"]),
            "group_id":   str(m["group_id"]),
            "title":      m.get("title", ""),
            "date":       date_val.isoformat() if isinstance(date_val, datetime) else str(date_val or ""),
            "agenda":     m.get("agenda", ""),
            "minutes":    m.get("minutes", ""),
            "logged_at":  logged_val.isoformat() if isinstance(logged_val, datetime) else "",
        })

    return success_response("Meetings retrieved.", data={"items": items, "total": len(items)})
