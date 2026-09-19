# backend/app/blueprints/evaluator/routes.py
"""
Evaluator Dashboard and Groups endpoints.

GET /api/evaluator/dashboard  — stat counts for logged-in evaluator
GET /api/evaluator/groups     — only groups assigned to this evaluator
GET /api/evaluator/groups/<group_id> — single group with iteration + eval status
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


def _serialize_id(doc):
    """Return doc with _id converted to string 'id'."""
    if doc is None:
        return None
    d = dict(doc)
    d["id"] = str(d.pop("_id"))
    for k, v in d.items():
        if isinstance(v, ObjectId):
            d[k] = str(v)
        elif isinstance(v, datetime):
            d[k] = v.isoformat()
    return d


@bp.route("/dashboard", methods=["GET"])
@role_required(Role.EVALUATOR)
def evaluator_dashboard():
    """Return stat counts for the logged-in evaluator."""
    evaluator_id = ObjectId(get_jwt_identity())

    # Groups assigned to this evaluator
    assignments = list(mongo.db.assignments.find({"evaluator_id": evaluator_id}))
    group_ids = [a["group_id"] for a in assignments]
    assigned_count = len(group_ids)

    # Count evaluations submitted by this evaluator
    completed_evals = mongo.db.evaluations.count_documents({
        "evaluator_id": evaluator_id
    })

    # Count pending evaluations:
    # For each assigned group, count iterations that have rubrics but no evaluation yet
    pending = 0
    for gid in group_ids:
        group = mongo.db.groups.find_one({"_id": gid})
        if not group:
            continue
        course = group.get("course")
        if not course:
            continue
        iterations = list(mongo.db.iterations.find({"course": course}))
        for it in iterations:
            if not it.get("rubrics"):
                continue
            already = mongo.db.evaluations.find_one({
                "evaluator_id": evaluator_id,
                "group_id": gid,
                "iteration_id": it["_id"],
            })
            if not already:
                pending += 1

    # Meetings logged by this evaluator
    meetings_count = mongo.db.meetings.count_documents({
        "evaluator_id": evaluator_id
    })

    # Active supervisions and breakdown by course (max 4 per course)
    from app.models.group import COLLECTION as GROUPS_COLLECTION
    from app.models.group import Field as GroupField
    from app.models.group import Status as GroupStatus
    from app.services.supervisor_service import get_evaluator_active_count
    active_supervision_count = get_evaluator_active_count(str(evaluator_id))
    supervised_groups = list(mongo.db[GROUPS_COLLECTION].find({
        "supervisor_id": evaluator_id,
        GroupField.STATUS: {"$ne": GroupStatus.DELETED},
    }, {GroupField.COURSE: 1, GroupField.NAME: 1}))
    supervision_by_course = {}
    for sg in supervised_groups:
        c = sg.get(GroupField.COURSE) or "General"
        supervision_by_course[c] = supervision_by_course.get(c, 0) + 1

    return success_response("Dashboard data retrieved.", data={
        "assigned_groups": assigned_count,
        "pending_evaluations": pending,
        "completed_evaluations": completed_evals,
        "meetings_logged": meetings_count,
        "active_supervision_count": active_supervision_count,
        "supervision_by_course": supervision_by_course,
    })


@bp.route("/groups", methods=["GET"])
@role_required(Role.EVALUATOR)
def list_assigned_groups():
    """Return only the groups assigned to the logged-in evaluator."""
    evaluator_id = ObjectId(get_jwt_identity())

    assignments = list(mongo.db.assignments.find({"evaluator_id": evaluator_id}))
    group_ids = [a["group_id"] for a in assignments]

    if not group_ids:
        return success_response("No assigned groups.", data={"items": [], "total": 0})

    groups = list(mongo.db.groups.find({"_id": {"$in": group_ids}}))

    result = []
    for g in groups:
        gid = g["_id"]
        course = g.get("course", "")

        # Count iterations with rubrics for this group's course
        iterations = list(mongo.db.iterations.find({"course": course}))
        total_it = sum(1 for it in iterations if it.get("rubrics"))
        completed_it = mongo.db.evaluations.count_documents({
            "evaluator_id": evaluator_id,
            "group_id": gid,
        })

        # Members (field is member_ids in the groups collection)
        members = g.get("member_ids", [])

        result.append({
            "id": str(gid),
            "name": g.get("name", ""),
            "course": course,
            "dept": g.get("dept", ""),
            "status": g.get("status", ""),
            "members_count": len(members),
            "iterations_total": total_it,
            "evaluations_completed": min(completed_it, total_it),
        })

    return success_response("Assigned groups retrieved.", data={
        "items": result,
        "total": len(result),
    })


@bp.route("/groups/<group_id>", methods=["GET"])
@role_required(Role.EVALUATOR)
def get_group_detail(group_id):
    """Return full group detail with iteration + eval status for the evaluator."""
    evaluator_id = ObjectId(get_jwt_identity())

    # Security check: evaluator must be assigned to this group
    try:
        gid = ObjectId(group_id)
    except Exception:  # noqa: BLE001
        return error_response("Invalid group ID.", 400)

    assignment = mongo.db.assignments.find_one({
        "evaluator_id": evaluator_id,
        "group_id": gid,
    })
    if not assignment:
        return error_response("You are not assigned to this group.", 403)

    group = mongo.db.groups.find_one({"_id": gid})
    if not group:
        return error_response("Group not found.", 404)

    course = group.get("course", "")

    # All iterations for this course
    iterations_raw = list(mongo.db.iterations.find({"course": course}).sort("deadline", 1))
    iterations = []
    for it in iterations_raw:
        it_id = it["_id"]
        existing_eval = mongo.db.evaluations.find_one({
            "evaluator_id": evaluator_id,
            "group_id": gid,
            "iteration_id": it_id,
        })

        # Latest submission from this group for this iteration
        submission = mongo.db.submissions.find_one(
            {"group_id": gid, "iteration_id": it_id},
            sort=[("submitted_at", -1)]
        )

        deadline = it.get("deadline")
        iterations.append({
            "id": str(it_id),
            "title": it.get("title", ""),
            "course": it.get("course", ""),
            "deadline": deadline.isoformat() if isinstance(deadline, datetime) else str(deadline or ""),
            "has_rubrics": bool(it.get("rubrics")),
            "rubrics": it.get("rubrics", []),
            "evaluated": existing_eval is not None,
            "evaluation": {
                "id": str(existing_eval["_id"]),
                "scores": existing_eval.get("scores", {}),
                "total_weighted_score": existing_eval.get("total_weighted_score"),
                "comment": existing_eval.get("comment", ""),
                "group_remark": existing_eval.get("group_remark", ""),
                "student_evaluations": existing_eval.get("student_evaluations", []),
                "evaluator_rubric_snapshot": existing_eval.get("evaluator_rubric_snapshot", []),
                "mode": existing_eval.get("mode", "group"),
                "submitted_at": existing_eval["submitted_at"].isoformat()
                    if isinstance(existing_eval.get("submitted_at"), datetime) else "",
            } if existing_eval else None,
            "has_submission": submission is not None,
            "submission": {
                "id": str(submission["_id"]),
                "file_url": submission.get("file_url", ""),
                "file_name": submission.get("file_name", ""),
                "submitted_at": submission["submitted_at"].isoformat()
                    if isinstance(submission.get("submitted_at"), datetime) else "",
                "status": submission.get("status", "submitted"),
            } if submission else None,
        })

    # Members (field is member_ids in the groups collection)
    raw_member_ids = group.get("member_ids", [])
    member_ids = [ObjectId(m) if not isinstance(m, ObjectId) else m
                  for m in raw_member_ids]
    members = []
    for mid in member_ids:
        u = mongo.db.users.find_one({"_id": mid}, {"name": 1, "email": 1, "roll": 1})
        if u:
            members.append({
                "id": str(u["_id"]),
                "name": u.get("name", ""),
                "email": u.get("email", ""),
                "roll": u.get("roll", ""),
            })

    # Meetings for this group by this evaluator
    meetings_raw = list(mongo.db.meetings.find({
        "evaluator_id": evaluator_id,
        "group_id": gid,
    }).sort("date", -1))
    meetings = []
    for m in meetings_raw:
        date_val = m.get("date")
        meetings.append({
            "id": str(m["_id"]),
            "title": m.get("title", ""),
            "date": date_val.isoformat() if isinstance(date_val, datetime) else str(date_val or ""),
            "agenda": m.get("agenda", ""),
            "minutes": m.get("minutes", ""),
        })

    return success_response("Group detail retrieved.", data={
        "id": str(group["_id"]),
        "name": group.get("name", ""),
        "course": course,
        "dept": group.get("dept", ""),
        "status": group.get("status", ""),
        "members": members,
        "iterations": iterations,
        "meetings": meetings,
    })


@bp.route("/groups/<group_id>/rubrics", methods=["GET"])
@role_required(Role.EVALUATOR)
def get_evaluator_group_rubrics(group_id):
    """Return evaluator's custom rubric criteria for a specific group."""
    evaluator_id = ObjectId(get_jwt_identity())
    try:
        gid = ObjectId(group_id)
    except Exception:  # noqa: BLE001
        return error_response("Invalid group ID.", 400)

    assignment = mongo.db.assignments.find_one({"evaluator_id": evaluator_id, "group_id": gid})
    if not assignment:
        return error_response("Not assigned to this group.", 403)

    doc = mongo.db.evaluator_rubrics.find_one({"evaluator_id": evaluator_id, "group_id": gid})
    rubrics = doc.get("criteria", []) if doc else []
    return success_response("Evaluator rubrics retrieved.", data={"rubrics": rubrics})


@bp.route("/groups/<group_id>/rubrics", methods=["POST"])
@role_required(Role.EVALUATOR)
def save_evaluator_group_rubrics(group_id):
    """Save (upsert) evaluator's custom rubric criteria for a specific group."""
    evaluator_id = ObjectId(get_jwt_identity())
    try:
        gid = ObjectId(group_id)
    except Exception:  # noqa: BLE001
        return error_response("Invalid group ID.", 400)

    assignment = mongo.db.assignments.find_one({"evaluator_id": evaluator_id, "group_id": gid})
    if not assignment:
        return error_response("Not assigned to this group.", 403)

    data = request.get_json() or {}
    rubrics = data.get("rubrics", [])

    for r in rubrics:
        if not r.get("question", "").strip():
            return error_response("Each rubric must have a non-empty question/criterion.", 422)
        try:
            w = int(r.get("weight", 0))
            if w < 1 or w > 100:
                return error_response("Rubric weight must be between 1 and 100.", 422)
        except (ValueError, TypeError):
            return error_response("Rubric weight must be an integer.", 422)

    mongo.db.evaluator_rubrics.update_one(
        {"evaluator_id": evaluator_id, "group_id": gid},
        {"$set": {"criteria": rubrics, "updated_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return success_response("Evaluator rubrics saved.", data={"rubrics": rubrics})
