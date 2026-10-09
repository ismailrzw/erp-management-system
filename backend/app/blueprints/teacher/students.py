# backend/app/blueprints/teacher/students.py
"""
Teacher Students Directory API — All students across all supervised groups.
"""

from bson import ObjectId
from flask import request
from flask_jwt_extended import get_jwt_identity

from app.blueprints.teacher import teacher_bp
from app.extensions import mongo
from app.models.group import COLLECTION as GROUPS_COLLECTION
from app.models.group import Field as GroupField
from app.models.group import Status as GroupStatus
from app.models.user import Role, UserFields
from app.utils.decorators import role_required


@teacher_bp.route("/students", methods=["GET"], strict_slashes=False)
@teacher_bp.route("/students/", methods=["GET"], strict_slashes=False)
@role_required(Role.TEACHER)
def get_teacher_students():
    """List all students belonging to groups supervised by the logged-in teacher."""
    try:
        teacher_id = get_jwt_identity()
        t_oid = ObjectId(teacher_id)

        course = request.args.get("course")
        search = request.args.get("search")

        # 1. Fetch all groups supervised by this teacher
        group_query = {
            "supervisor_id": t_oid,
            GroupField.STATUS: {"$ne": GroupStatus.DELETED},
        }
        if course and course.strip() and course.lower() != "all":
            group_query[GroupField.COURSE] = course.strip()

        groups = list(mongo.db[GROUPS_COLLECTION].find(group_query))
        if not groups:
            return {
                "success": True,
                "message": "No students found.",
                "data": {"items": [], "total": 0},
            }, 200

        # Map each student to their group metadata
        student_group_map = {}
        for g in groups:
            g_name = g.get(GroupField.NAME, "")
            g_title = g.get(GroupField.PROJECT_TITLE, "")
            g_course = g.get(GroupField.COURSE, "")
            g_sec = g.get(GroupField.SECTION, "")
            g_leader = g.get(GroupField.LEADER_ID)
            g_id = str(g["_id"])

            for m_oid in g.get(GroupField.MEMBER_IDS, []):
                student_group_map[m_oid] = {
                    "group_id": g_id,
                    "group_name": g_name,
                    "project_title": g_title,
                    "course": g_course,
                    "section": g_sec,
                    "is_leader": m_oid == g_leader,
                }

        # 2. Fetch student user documents
        student_oids = list(student_group_map.keys())
        users_cursor = mongo.db.users.find(
            {"_id": {"$in": student_oids}},
            {UserFields.NAME: 1, UserFields.ROLL: 1, UserFields.EMAIL: 1, UserFields.DEPT: 1, UserFields.SECTION: 1},
        ).sort(UserFields.NAME, 1)

        items = []
        for u in users_cursor:
            u_oid = u["_id"]
            meta = student_group_map.get(u_oid, {})
            record = {
                "id": str(u_oid),
                "name": u.get(UserFields.NAME, ""),
                "roll": u.get(UserFields.ROLL, ""),
                "email": u.get(UserFields.EMAIL, ""),
                "dept": u.get(UserFields.DEPT, ""),
                "section": meta.get("section") or u.get(UserFields.SECTION, ""),
                "course": meta.get("course", ""),
                "group_id": meta.get("group_id", ""),
                "group_name": meta.get("group_name", ""),
                "project_title": meta.get("project_title", ""),
                "is_leader": meta.get("is_leader", False),
            }

            if search and search.strip():
                term = search.strip().lower()
                name_match = term in record["name"].lower()
                roll_match = term in (record["roll"] or "").lower()
                email_match = term in (record["email"] or "").lower()
                group_match = term in record["group_name"].lower()
                if not (name_match or roll_match or email_match or group_match):
                    continue

            items.append(record)

        return {
            "success": True,
            "message": "Supervised students retrieved.",
            "data": {"items": items, "total": len(items)},
        }, 200
    except Exception as exc:  # noqa: BLE001
        return {"success": False, "message": str(exc)}, 500
