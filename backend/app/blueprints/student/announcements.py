# backend/app/blueprints/student/announcements.py
"""
Student Announcements API endpoint.

Routes
------
GET  /api/student/announcements               — list all announcements (enriched with is_recent)
GET  /api/student/announcements/<id>          — get a single announcement by ID
POST /api/student/announcements/<id>/view     — mark announcement as viewed by student
POST /api/student/announcements/view-all      — mark all announcements as viewed

Security
--------
  - Requires JWT with role ``student``.
  - Students cannot create, update, or delete announcements.
"""

from flask_jwt_extended import get_jwt_identity
from flask_restx import Namespace, Resource

from app.models.user import Role
from app.services.announcement_service import (
    get_announcement_by_id,
    list_announcements_for_user,
    mark_all_announcements_viewed,
    mark_announcement_viewed,
)
from app.utils.decorators import role_required

# ── Namespace ──────────────────────────────────────────────────────────────────
student_announcements_ns = Namespace(
    "student_announcements", description="Student announcements (read-only with view tracking)"
)


@student_announcements_ns.route("/")
class StudentAnnouncementList(Resource):

    @student_announcements_ns.doc(security="Bearer Auth")
    @role_required(Role.STUDENT)
    def get(self):
        """List all announcements, newest first, with per-student is_recent tags."""
        student_id = get_jwt_identity()
        try:
            items = list_announcements_for_user(user_id=student_id, role=Role.STUDENT)
            recent_count = sum(1 for a in items if a.get("is_recent"))
            return {
                "success": True,
                "message": "Announcements retrieved.",
                "data": {
                    "items": items,
                    "total": len(items),
                    "recent_count": recent_count,
                },
            }, 200
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500


@student_announcements_ns.route("/<string:announcement_id>")
class StudentAnnouncementDetail(Resource):

    @student_announcements_ns.doc(security="Bearer Auth")
    @role_required(Role.STUDENT)
    def get(self, announcement_id):
        """Get a single announcement by ID."""
        try:
            announcement = get_announcement_by_id(announcement_id)
            if announcement is None:
                return {"success": False, "message": "Announcement not found."}, 404
            return {"success": True, "message": "Announcement retrieved.", "data": announcement}, 200
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 400
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500


@student_announcements_ns.route("/<string:announcement_id>/view")
class StudentAnnouncementView(Resource):

    @student_announcements_ns.doc(security="Bearer Auth")
    @role_required(Role.STUDENT)
    def post(self, announcement_id):
        """Mark an announcement as viewed by the authenticated student."""
        student_id = get_jwt_identity()
        try:
            mark_announcement_viewed(announcement_id, student_id)
            return {
                "success": True,
                "message": "Announcement marked as viewed.",
            }, 200
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 400
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500


@student_announcements_ns.route("/view-all")
class StudentAnnouncementViewAll(Resource):

    @student_announcements_ns.doc(security="Bearer Auth")
    @role_required(Role.STUDENT)
    def post(self):
        """Mark all announcements as viewed by the authenticated student."""
        student_id = get_jwt_identity()
        try:
            count = mark_all_announcements_viewed(student_id)
            return {
                "success": True,
                "message": f"{count} announcements marked as viewed.",
            }, 200
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500
