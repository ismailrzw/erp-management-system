"""Manager announcement API endpoints."""

from flask import request
from flask_jwt_extended import get_jwt_identity
from flask_restx import Namespace, Resource, fields

from app.models.user import Role
from app.schemas.announcement_schema import CreateAnnouncementSchema, UpdateAnnouncementSchema
from app.services.announcement_service import (
    create_announcement,
    delete_announcement,
    get_announcement_by_id,
    list_announcements,
    update_announcement,
)
from app.utils.audit import log_audit
from app.utils.decorators import role_required
from app.extensions import mongo


announcements_ns = Namespace("manager_announcements", description="Manager announcement operations")

announcement_model = announcements_ns.model("Announcement", {
    "id": fields.String(readonly=True),
    "title": fields.String(required=True),
    "content": fields.String(required=True),
    "date": fields.String(readonly=True),
    "posted_by": fields.String(readonly=True),
    "created_at": fields.String(readonly=True),
})
create_model = announcements_ns.model("AnnouncementCreate", {
    "title": fields.String(required=True),
    "content": fields.String(required=True),
    "date": fields.String(required=False),
})
update_model = announcements_ns.model("AnnouncementUpdate", {
    "title": fields.String(required=False),
    "content": fields.String(required=False),
    "date": fields.String(required=False),
})


@announcements_ns.route("/")
class AnnouncementList(Resource):
    @announcements_ns.doc(security="Bearer Auth")
    @role_required(*Role.ALL)
    def get(self):
        """List all announcements. Visible to all authenticated roles."""
        items = list_announcements()
        return {"success": True, "message": "Announcements retrieved.", "data": {"items": items, "total": len(items)}}, 200

    @announcements_ns.doc(security="Bearer Auth")
    @announcements_ns.expect(create_model)
    @role_required(Role.MANAGER)
    def post(self):
        """Post a new announcement. Manager only."""
        try:
            payload = CreateAnnouncementSchema().load(request.get_json() or {})
            announcement = create_announcement(
                payload["title"], payload["content"], get_jwt_identity(), payload.get("date")
            )
            log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "announcements", "create",
                      target_id=announcement["id"], new_value=announcement)
            return {"success": True, "message": "Announcement posted.", "data": announcement}, 201
        except Exception as exc:
            return {"success": False, "message": str(exc)}, 422


@announcements_ns.route("/<string:announcement_id>")
@announcements_ns.param("announcement_id", "MongoDB announcement ID")
class AnnouncementDetail(Resource):
    @announcements_ns.doc(security="Bearer Auth")
    @role_required(*Role.ALL)
    def get(self, announcement_id):
        """Get a single announcement by ID. Visible to all authenticated roles."""
        try:
            announcement = get_announcement_by_id(announcement_id)
            if announcement is None:
                return {"success": False, "message": "Announcement not found."}, 404
            return {"success": True, "data": announcement}, 200
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 400

    @announcements_ns.doc(security="Bearer Auth")
    @announcements_ns.expect(update_model)
    @role_required(Role.MANAGER)
    def put(self, announcement_id):
        """Update an announcement's title, content, and/or date. Manager only."""
        try:
            payload = UpdateAnnouncementSchema().load(request.get_json() or {})
            announcement = update_announcement(
                announcement_id, payload.get("title"), payload.get("content"), payload.get("date")
            )
            if announcement is None:
                return {"success": False, "message": "Announcement not found."}, 404
            log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "announcements", "update",
                      target_id=announcement_id, new_value=announcement)
            return {"success": True, "message": "Announcement updated.", "data": announcement}, 200
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 400
        except Exception as exc:
            return {"success": False, "message": str(exc)}, 422

    @announcements_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def delete(self, announcement_id):
        """Delete an announcement. Manager only."""
        try:
            announcement = delete_announcement(announcement_id)
            if announcement is None:
                return {"success": False, "message": "Announcement not found."}, 404
            log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "announcements", "delete",
                      target_id=announcement_id, old_value=announcement)
            return {"success": True, "message": "Announcement deleted."}, 200
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 400