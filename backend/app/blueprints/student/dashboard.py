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

import logging

from bson import ObjectId
from flask_jwt_extended import get_jwt_identity
from flask_restx import Namespace, Resource

from app.extensions import mongo
from app.models.group import INVITATIONS_COLLECTION, InvitationField, InvitationStatus
from app.models.user import Role
from app.services.announcement_service import list_announcements_for_user
from app.services.attachment_service import list_attachments
from app.services.group_service import get_my_group
from app.services.student_profile_service import get_profile
from app.utils.decorators import role_required

logger = logging.getLogger(__name__)

# ── Namespace ──────────────────────────────────────────────────────────────────
student_dashboard_ns = Namespace(
    "student_dashboard", description="Student dashboard aggregated view"
)


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
            except Exception as exc:  # noqa: BLE001
                logger.warning("Error loading student profile for %s: %s", student_id, exc)
                profile = {}

            # ── Group status ───────────────────────────────────────────────
            try:
                group = get_my_group(student_id)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Error loading group for %s: %s", student_id, exc)
                group = None

            # ── Pending invitation count ───────────────────────────────────
            try:
                student_oid = ObjectId(student_id)
                pending_count = mongo.db[INVITATIONS_COLLECTION].count_documents({
                    InvitationField.INVITED_USER: {"$in": [student_oid, str(student_id)]},
                    InvitationField.STATUS: InvitationStatus.PENDING,
                })
            except Exception as exc:  # noqa: BLE001
                logger.warning("Error counting pending invites for %s: %s", student_id, exc)
                pending_count = 0

            # ── Announcements (newest 20) ──────────────────────────────────
            try:
                announcements = list_announcements_for_user(user_id=student_id, role=Role.STUDENT, limit=20)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Error fetching announcements: %s", exc)
                announcements = []

            # ── Attachments (newest 10) ────────────────────────────────────
            try:
                raw_attachments = list_attachments()[:10]
                attachments = []
                for att in raw_attachments:
                    clean_att = dict(att)
                    clean_att.pop("file_path", None)
                    attachments.append(clean_att)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Error fetching attachments: %s", exc)
                attachments = []

            recent_ann_count = sum(1 for a in announcements if a.get("is_recent"))

            return {
                "success": True,
                "message": "Dashboard data retrieved.",
                "data": {
                    "student":                   profile,
                    "group":                     group,
                    "pending_invitations_count":  pending_count,
                    "announcements":             announcements,
                    "recent_announcements_count": recent_ann_count,
                    "attachments":               attachments,
                },
            }, 200

        except Exception as exc:  # noqa: BLE001
            logger.error("Student dashboard unhandled error: %s", exc)
            return {"success": False, "message": str(exc)}, 500
