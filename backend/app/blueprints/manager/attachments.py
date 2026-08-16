"""Manager attachment API endpoints."""

from flask import Blueprint, request, send_file
from flask_jwt_extended import get_jwt_identity
from flask_restx import Namespace, Resource, fields, reqparse
from werkzeug.datastructures import FileStorage

from app.models.user import Role
from app.schemas.attachment_schema import CreateAttachmentSchema, UpdateAttachmentSchema
from app.services.attachment_service import (
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE,
    delete_attachment,
    download_attachment,
    get_attachment_by_id,
    list_attachments,
    update_attachment,
    upload_attachment,
)
from app.utils.audit import log_audit
from app.utils.decorators import role_required
from app.extensions import mongo


attachments_bp = Blueprint("manager_attachments", __name__)
attachments_ns = Namespace("manager_attachments", description="Manager attachment operations")

# All authenticated roles — used for read-only endpoints (list, download)
# per SRS FR-10.4: "Any authenticated user shall view all attachments and download individual files."
ALL_ROLES = (Role.MANAGER, Role.STUDENT, Role.EVALUATOR, Role.HOD, Role.HODIC, Role.DEAN)

attachment_model = attachments_ns.model("Attachment", {
    "id": fields.String(readonly=True),
    "title": fields.String(required=True),
    "original_filename": fields.String(readonly=True),
    "mime_type": fields.String(readonly=True),
    "size": fields.Integer(readonly=True),
    "file_url": fields.String(readonly=True),
    "uploaded_by": fields.String(readonly=True),
    "uploaded_at": fields.DateTime(readonly=True),
})
attachment_update_model = attachments_ns.model("AttachmentUpdate", {
    "title": fields.String(required=True, description="Replacement attachment title"),
})
upload_parser = reqparse.RequestParser()
upload_parser.add_argument("title", location="form", required=True, help="Attachment title is required")
upload_parser.add_argument("file", location="files", type=FileStorage, required=True,
                           help="PDF, DOCX, XLSX, or ZIP; maximum 10 MB")


@attachments_ns.route("/")
class AttachmentList(Resource):
    @attachments_ns.doc(security="Bearer Auth")
    @attachments_ns.marshal_list_with(attachment_model)
    @role_required(*ALL_ROLES)
    def get(self):
        """List all attachments, newest first. Visible to all authenticated roles."""
        return list_attachments(), 200

    @attachments_ns.doc(security="Bearer Auth", consumes=["multipart/form-data"])
    @attachments_ns.expect(upload_parser)
    @role_required(Role.MANAGER)
    def post(self):
        """Upload an attachment. Allowed: PDF, DOCX, XLSX, ZIP; maximum 10 MB. Manager only."""
        try:
            args = upload_parser.parse_args()
            validated = CreateAttachmentSchema().load({"title": args["title"]})
            attachment = upload_attachment(args["file"], validated["title"], get_jwt_identity())
            log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "attachments", "create",
                      target_id=attachment["id"], new_value={"title": attachment["title"]})
            return {"success": True, "message": "Attachment uploaded.", "data": attachment}, 201
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 400
        except Exception:
            return {"success": False, "message": "Unable to upload attachment."}, 500


@attachments_ns.route("/<string:attachment_id>")
@attachments_ns.param("attachment_id", "MongoDB attachment ID")
class AttachmentDetail(Resource):
    @attachments_ns.doc(security="Bearer Auth")
    @role_required(*ALL_ROLES)
    def get(self, attachment_id):
        """Get attachment metadata. Visible to all authenticated roles."""
        try:
            attachment = get_attachment_by_id(attachment_id)
            if attachment is None:
                return {"success": False, "message": "Attachment not found."}, 404
            return {"success": True, "data": attachment}, 200
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 400

    @attachments_ns.doc(security="Bearer Auth")
    @attachments_ns.expect(attachment_update_model)
    @role_required(Role.MANAGER)
    def put(self, attachment_id):
        """Update attachment metadata. Manager only."""
        try:
            payload = UpdateAttachmentSchema().load(request.get_json() or {})
            attachment = update_attachment(attachment_id, payload["title"])
            if attachment is None:
                return {"success": False, "message": "Attachment not found."}, 404
            log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "attachments", "update",
                      target_id=attachment_id, new_value={"title": attachment["title"]})
            return {"success": True, "message": "Attachment updated.", "data": attachment}, 200
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 400
        except Exception as exc:
            return {"success": False, "message": str(exc)}, 422

    @attachments_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def delete(self, attachment_id):
        """Delete an attachment and its managed upload. Manager only."""
        try:
            attachment = delete_attachment(attachment_id)
            if attachment is None:
                return {"success": False, "message": "Attachment not found."}, 404
            log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "attachments", "delete",
                      target_id=attachment_id, old_value={"title": attachment["title"]})
            return {"success": True, "message": "Attachment deleted."}, 200
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 400


@attachments_ns.route("/<string:attachment_id>/download")
@attachments_ns.param("attachment_id", "MongoDB attachment ID")
class AttachmentDownload(Resource):
    @attachments_ns.doc(security="Bearer Auth", produces=["application/octet-stream"])
    @role_required(*ALL_ROLES)
    def get(self, attachment_id):
        """Download the original attachment file. Available to all authenticated roles."""
        try:
            result = download_attachment(attachment_id)
            if result is None:
                return {"success": False, "message": "Attachment not found."}, 404
            path, original_filename = result
            log_audit(mongo.db, get_jwt_identity(), get_jwt_identity(), "attachments", "download",
                      target_id=attachment_id)
            return send_file(path, as_attachment=True, download_name=original_filename)
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 400
        except FileNotFoundError:
            return {"success": False, "message": "Attachment file is unavailable."}, 404