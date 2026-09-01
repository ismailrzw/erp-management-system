# backend/app/blueprints/student/dashboard.py
"""
Student Dashboard API endpoint.

Route
-----
GET /api/student/dashboard

Returns a single aggregated payload so the frontend can render the full
student home screen in one request:
  - own profile summary (no password_hash)
  - current group status (None if not in a group)
  - count of pending invitations
  - latest announcements (newest 20)
  - latest attachments (newest 10)

Security
--------
  - Requires JWT with role ``student``.
  - All sub-queries gracefully degrade (announcements/attachments return []
    if their collections are empty or do not yet exist).
"""

from datetime import datetime

from bson import ObjectId
from flask_jwt_extended import get_jwt_identity
from flask_restx import Namespace, Resource

from app.extensions import mongo
from app.models.group import INVITATIONS_COLLECTION, InvitationField, InvitationStatus
from app.models.user import Role, UserFields
from app.services.group_service import get_my_group
from app.services.student_profile_service import get_profile
from app.utils.decorators import role_required

# ── Namespace ──────────────────────────────────────────────────────────────────
student_dashboard_ns = Namespace(
    "student_dashboard", description="Student dashboard aggregated view"
)


def _serialize_doc(doc: dict) -> dict:
    """Convert ObjectId and datetime fields to JSON-safe types."""
    result = dict(doc)
    if "_id" in result:
        result["id"] = str(result.pop("_id"))
    for key, value in list(result.items()):
        if isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
    return result


@student_dashboard_ns.route("/")
class StudentDashboard(Resource):

    @student_dashboard_ns.doc(security="Bearer Auth")
    @role_required(Role.STUDENT)
    def get(self):
        """
        GET /api/student/dashboard

        Returns the student's aggregated dashboard view in a single request.
        """
        student_id = get_jwt_identity()

        try:
            # ── Own profile ────────────────────────────────────────────────
            try:
                profile = get_profile(student_id)
            except Exception:  # noqa: BLE001
                profile = {}

            # ── Group status ───────────────────────────────────────────────
            try:
                group = get_my_group(student_id)
            except Exception:  # noqa: BLE001
                group = None

            # ── Pending invitation count ───────────────────────────────────
            try:
                pending_count = mongo.db[INVITATIONS_COLLECTION].count_documents({
                    InvitationField.INVITED_USER: mongo.db[UserFields.COLLECTION].find_one(
                        {"_id": __import__("bson").ObjectId(student_id)}, {"_id": 1}
                    )["_id"] if student_id else None,
                    InvitationField.STATUS: InvitationStatus.PENDING,
                })
            except Exception:  # noqa: BLE001
                pending_count = 0

            # ── Announcements (newest 20) ──────────────────────────────────
            try:
                raw_announcements = list(
                    mongo.db.announcements.find({}).sort("created_at", -1).limit(20)
                )
                announcements = [_serialize_doc(a) for a in raw_announcements]
            except Exception:  # noqa: BLE001
                announcements = []

            # ── Attachments (newest 10) ────────────────────────────────────
            try:
                raw_attachments = list(
                    mongo.db.attachments.find({}).sort("uploaded_at", -1).limit(10)
                )
                attachments = [_serialize_doc(a) for a in raw_attachments]
                # Strip internal file_path from student view
                for att in attachments:
                    att.pop("file_path", None)
            except Exception:  # noqa: BLE001
                attachments = []

            return {
                "success": True,
                "message": "Dashboard data retrieved.",
                "data": {
                    "student":                  profile,
                    "group":                    group,
                    "pending_invitations_count": pending_count,
                    "announcements":            announcements,
                    "attachments":              attachments,
                },
            }, 200

        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500
