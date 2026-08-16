# backend/app/blueprints/manager/dashboard.py
"""Manager Dashboard API endpoints."""

from flask import Blueprint
from flask_restx import Namespace, Resource
from flask_jwt_extended import get_jwt_identity

from app.extensions import mongo
from app.utils.decorators import role_required
from app.models.user import Role

# ── Blueprint ──────────────────────────────────────────────
dashboard_bp = Blueprint("manager_dashboard", __name__)

# ── Namespace ──────────────────────────────────────────────
dashboard_ns = Namespace("manager_dashboard", description="Manager Dashboard operations")


# ── Dashboard Route ──────────────────────────────────────
@dashboard_ns.route("/")
class Dashboard(Resource):
    @dashboard_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def get(self):
        """GET /api/manager/dashboard - Returns dashboard stats."""
        try:
            # ── Stats ───────────────────────────────────────────
            total_students = mongo.db.users.count_documents({
                "role": Role.STUDENT,
                "deleted": False
            })

            total_evaluators = mongo.db.users.count_documents({
                "role": Role.EVALUATOR,
                "deleted": False
            })

            # Groups - handle if collection doesn't exist
            try:
                total_groups = mongo.db.groups.count_documents({})
                pending_groups = mongo.db.groups.count_documents({"status": "pending"})
                
                students_in_groups = mongo.db.groups.distinct("member_ids")
                students_without_group = mongo.db.users.count_documents({
                    "role": Role.STUDENT,
                    "deleted": False,
                    "_id": {"$nin": students_in_groups}
                })
            except Exception:
                total_groups = 0
                pending_groups = 0
                students_without_group = total_students

            # ── Announcements ──────────────────────────────────
            try:
                announcements = list(mongo.db.announcements.find(
                    {}, {"content": 0}
                ).sort("date", -1).limit(5))
                for a in announcements:
                    a["id"] = str(a.pop("_id"))
            except Exception:
                announcements = []

            # ── Attachments ─────────────────────────────────────
            try:
                attachments = list(mongo.db.attachments.find({}).sort(
                    "uploaded_at", -1
                ).limit(5))
                for a in attachments:
                    a["id"] = str(a.pop("_id"))
            except Exception:
                attachments = []

            return {
                "success": True,
                "message": "Dashboard data retrieved.",
                "data": {
                    "total_students": total_students,
                    "total_evaluators": total_evaluators,
                    "total_groups": total_groups,
                    "pending_groups": pending_groups,
                    "students_without_group": students_without_group,
                    "announcements": announcements,
                    "attachments": attachments
                }
            }, 200

        except Exception as e:
            return {
                "success": False,
                "message": str(e)
            }, 500