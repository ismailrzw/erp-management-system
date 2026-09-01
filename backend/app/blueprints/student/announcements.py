# backend/app/blueprints/student/announcements.py
"""
Student Announcements API endpoint.

Routes
------
GET /api/student/announcements          — list all announcements (newest first)
GET /api/student/announcements/<id>     — get a single announcement by ID

Security
--------
  - Requires JWT with role ``student``.
  - READ ONLY — students cannot create, update, or delete announcements.
  - Reuses the existing ``announcement_service`` functions to avoid duplication.
"""

from flask_restx import Namespace, Resource

from app.models.user import Role
from app.services.announcement_service import get_announcement_by_id, list_announcements
from app.utils.decorators import role_required

# ── Namespace ──────────────────────────────────────────────────────────────────
student_announcements_ns = Namespace(
    "student_announcements", description="Student announcements (read-only)"
)


@student_announcements_ns.route("/")
class StudentAnnouncementList(Resource):

    @student_announcements_ns.doc(security="Bearer Auth")
    @role_required(Role.STUDENT)
    def get(self):
        """List all announcements, newest first.  Read-only for students."""
        try:
            items = list_announcements()
            return {
                "success": True,
                "message": "Announcements retrieved.",
                "data": {"items": items, "total": len(items)},
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
