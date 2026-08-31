# backend/app/blueprints/manager/dashboard.py
"""Manager Dashboard API endpoints."""

from datetime import datetime

from flask import Blueprint
from flask_restx import Namespace, Resource

from app.extensions import mongo
from app.models.group import Field as GroupField
from app.models.group import Status as GroupStatus
from app.models.user import Role
from app.utils.decorators import role_required

# ── Blueprint ──────────────────────────────────────────────
dashboard_bp = Blueprint("manager_dashboard", __name__)

# ── Namespace ──────────────────────────────────────────────
dashboard_ns = Namespace("manager_dashboard", description="Manager Dashboard operations")


def _serialize_doc(doc: dict) -> dict:
    if not doc:
        return doc
    res = dict(doc)
    if "_id" in res:
        res["id"] = str(res.pop("_id"))
    for k, v in list(res.items()):
        if isinstance(v, datetime):
            res[k] = v.isoformat()
    return res


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
                pending_groups = mongo.db.groups.count_documents({GroupField.STATUS: GroupStatus.PENDING})
                total_groups_evaluated = mongo.db.groups.count_documents({
                    "$or": [
                        {GroupField.EVALUATED: True},
                        {GroupField.STATUS: GroupStatus.EVALUATED},
                    ]
                })
                groups_remaining_evaluation = max(0, total_groups - total_groups_evaluated)
                
                students_in_groups = mongo.db.groups.distinct("member_ids")
                students_without_group = mongo.db.users.count_documents({
                    "role": Role.STUDENT,
                    "deleted": False,
                    "_id": {"$nin": students_in_groups}
                })
            except Exception:  # noqa: BLE001 - deliberate catch-all, returns partial dashboard response to client
                total_groups = 0
                pending_groups = 0
                total_groups_evaluated = 0
                groups_remaining_evaluation = 0
                students_without_group = total_students

            # ── Announcements ──────────────────────────────────
            try:
                raw_announcements = list(mongo.db.announcements.find({}).sort("date", -1).limit(100))
                announcements = [_serialize_doc(a) for a in raw_announcements]
            except Exception:  # noqa: BLE001 - deliberate catch-all, returns partial dashboard response to client
                announcements = []

            # ── Attachments ─────────────────────────────────────
            try:
                raw_attachments = list(mongo.db.attachments.find({}).sort(
                    "uploaded_at", -1
                ).limit(5))
                attachments = [_serialize_doc(a) for a in raw_attachments]
            except Exception:  # noqa: BLE001 - deliberate catch-all, returns partial dashboard response to client
                attachments = []

            return {
                "success": True,
                "message": "Dashboard data retrieved.",
                "data": {
                    "total_students": total_students,
                    "total_evaluators": total_evaluators,
                    "total_groups": total_groups,
                    "pending_groups": pending_groups,
                    "total_groups_evaluated": total_groups_evaluated,
                    "groups_remaining_evaluation": groups_remaining_evaluation,
                    "students_without_group": students_without_group,
                    "announcements": announcements,
                    "attachments": attachments
                }
            }, 200

        except Exception as exc:  # noqa: BLE001 - deliberate catch-all, returns error response to client
            return {
                "success": False,
                "message": str(exc)
            }, 500
