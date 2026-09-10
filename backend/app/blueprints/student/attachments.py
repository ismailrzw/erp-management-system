# backend/app/blueprints/student/attachments.py
"""
Student Attachments API endpoints.

Routes
------
GET /api/student/attachments            — list all attachments (newest first)
GET /api/student/attachments/<id>/download — download an attachment file

Security
--------
  - Requires JWT with role ``student``.
  - READ + DOWNLOAD ONLY — students cannot upload or delete attachments.
  - Reuses attachment_service list and download functions.
  - file_path is stripped from all list responses (internal server path).
"""

from flask import send_file
from flask_restx import Namespace, Resource

from app.models.user import Role
from app.services.attachment_service import download_attachment, list_attachments
from app.utils.decorators import role_required

# ── Namespace ──────────────────────────────────────────────────────────────────
student_attachments_ns = Namespace(
    "student_attachments", description="Student attachments (read and download only)"
)


@student_attachments_ns.route("/")
class StudentAttachmentList(Resource):

    @student_attachments_ns.doc(security="Bearer Auth")
    @role_required(Role.STUDENT)
    def get(self):
        """List all uploaded attachments.  Students may download but not upload or delete."""
        try:
            items = list_attachments()
            # Strip internal file_path from student-facing responses
            for item in items:
                item.pop("file_path", None)
            return {
                "success": True,
                "message": "Attachments retrieved.",
                "data": {"items": items, "total": len(items)},
            }, 200
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500


@student_attachments_ns.route("/<string:attachment_id>/download")
class StudentAttachmentDownload(Resource):

    @student_attachments_ns.doc(security="Bearer Auth")
    @role_required(Role.STUDENT)
    def get(self, attachment_id):
        """Download an attachment file by its ID."""
        try:
            result = download_attachment(attachment_id)
            if result is None:
                return {"success": False, "message": "Attachment not found."}, 404
            path, original_filename = result
            return send_file(path, as_attachment=True, download_name=original_filename)
        except FileNotFoundError as exc:
            return {"success": False, "message": str(exc)}, 404
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 400
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500
