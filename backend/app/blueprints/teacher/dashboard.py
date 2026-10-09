# backend/app/blueprints/teacher/dashboard.py
"""
Teacher Dashboard API.
"""

from bson import ObjectId
from flask_jwt_extended import get_jwt_identity

from app.blueprints.teacher import teacher_bp
from app.extensions import mongo
from app.models.group import COLLECTION as GROUPS_COLLECTION
from app.models.group import Field as GroupField
from app.models.group import Status as GroupStatus
from app.models.user import MAX_SUPERVISION_CAP, Role, UserFields
from app.services.supervisor_service import (
    list_evaluator_supervisor_requests,
)
from app.services.teacher_service import get_teacher_by_id
from app.utils.decorators import role_required


@teacher_bp.route("/dashboard", methods=["GET"], strict_slashes=False)
@teacher_bp.route("/dashboard/", methods=["GET"], strict_slashes=False)
@role_required(Role.TEACHER)
def get_teacher_dashboard():
    """Get aggregated metrics, supervised groups summary, and pending requests for the teacher dashboard."""
    try:
        teacher_id = get_jwt_identity()
        teacher = get_teacher_by_id(teacher_id)
        if not teacher:
            return {"success": False, "message": "Teacher not found."}, 404

        t_oid = ObjectId(teacher_id)

        # 1. Supervised Groups
        groups_cursor = mongo.db[GROUPS_COLLECTION].find({
            "supervisor_id": t_oid,
            GroupField.STATUS: {"$ne": GroupStatus.DELETED},
        }).sort(GroupField.CREATED_AT, -1)

        groups = []
        all_student_ids = set()
        course_counts = {}

        for g in groups_cursor:
            g_id = str(g["_id"])
            member_ids = g.get(GroupField.MEMBER_IDS, [])
            for m in member_ids:
                all_student_ids.add(str(m))

            course_name = g.get(GroupField.COURSE) or "General"
            course_counts[course_name] = course_counts.get(course_name, 0) + 1

            # Fetch leader info
            leader_oid = g.get(GroupField.LEADER_ID)
            leader = mongo.db.users.find_one({"_id": leader_oid}, {UserFields.NAME: 1, UserFields.ROLL: 1}) if leader_oid else None

            groups.append({
                "id": g_id,
                "name": g.get(GroupField.NAME, ""),
                "project_title": g.get(GroupField.PROJECT_TITLE, ""),
                "dept": g.get(GroupField.DEPT, ""),
                "section": g.get(GroupField.SECTION, ""),
                "course": course_name,
                "status": g.get(GroupField.STATUS, ""),
                "submission_status": g.get("submission_status", "not_submitted"),
                "member_count": len(member_ids),
                "leader_name": leader.get(UserFields.NAME, "") if leader else "",
                "leader_roll": leader.get(UserFields.ROLL, "") if leader else "",
                "created_at": g.get(GroupField.CREATED_AT).isoformat() if g.get(GroupField.CREATED_AT) else None,
            })

        active_count = len(groups)
        total_students = len(all_student_ids)

        # 2. Incoming Pending Requests
        incoming_requests = list_evaluator_supervisor_requests(teacher_id)

        supervision_by_course = course_counts  # {course_name: count}

        data = {
            "teacher": {
                "id": teacher["id"],
                "name": teacher["name"],
                "email": teacher["email"],
                "dept": teacher["dept"],
                "domains": teacher.get("domains", []),
            },
            "stats": {
                "active_groups_count": active_count,
                "max_supervision_cap": MAX_SUPERVISION_CAP,
                "total_students_count": total_students,
                "pending_requests_count": len(incoming_requests),
                "supervision_by_course": supervision_by_course,
            },
            "incoming_requests": incoming_requests,
            "groups": groups,
        }

        return {"success": True, "message": "Teacher dashboard data retrieved.", "data": data}, 200
    except Exception as exc:  # noqa: BLE001
        return {"success": False, "message": str(exc)}, 500
