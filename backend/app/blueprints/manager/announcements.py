# backend/app/blueprints/manager/announcements.py
"""
Manager announcement API endpoints.

Data lifecycle enforced here:
  1. Raw JSON arrives at the endpoint.
  2. CreateAnnouncementSchema / UpdateAnnouncementSchema validates the payload.
     ValidationError → HTTP 422 with structured ``errors`` payload.
  3. The validated dict is passed to the announcement service.
  4. The service returns the serialised announcement dict.
"""

from flask import request
from flask_jwt_extended import get_jwt_identity
from flask_restx import Namespace, Resource, fields
from marshmallow import ValidationError

from app.extensions import mongo
from app.models.user import Role
from app.schemas.announcement_schema import (
    CreateAnnouncementSchema,
    UpdateAnnouncementSchema,
)
from app.services.announcement_service import (
    create_announcement,
    delete_announcement,
    get_announcement_by_id,
    list_announcements,
    update_announcement,
)
from app.utils.audit import log_audit
from app.utils.decorators import role_required

announcements_ns = Namespace("manager_announcements", description="Manager announcement operations")

# ── Swagger models ──────────────────────────────────────────
announcement_model = announcements_ns.model("Announcement", {
    "id":         fields.String(readonly=True),
    "title":      fields.String(required=True),
    "content":    fields.String(required=True),
    "date":       fields.String(readonly=True),
    "posted_by":  fields.String(readonly=True),
    "created_at": fields.String(readonly=True),
})
create_model = announcements_ns.model("AnnouncementCreate", {
    "title":   fields.String(required=True),
    "content": fields.String(required=True),
    "date":    fields.String(required=False),
})
update_model = announcements_ns.model("AnnouncementUpdate", {
    "title":   fields.String(required=False),
    "content": fields.String(required=False),
    "date":    fields.String(required=False),
})


@announcements_ns.route("/")
class AnnouncementList(Resource):
    @announcements_ns.doc(security="Bearer Auth")
    @role_required(*Role.ALL)
    def get(self):
        """List all announcements (newest first).  Visible to all authenticated roles."""
        items = list_announcements()
        return {"success": True, "message": "Announcements retrieved.", "data": {"items": items, "total": len(items)}}, 200

    @announcements_ns.doc(security="Bearer Auth")
    @announcements_ns.expect(create_model)
    @role_required(Role.MANAGER)
    def post(self):
        """Post a new announcement.  Manager only."""
        # Check 1 — schema validation
        try:
            payload = CreateAnnouncementSchema().load(request.get_json() or {})
        except ValidationError as exc:
            return {"success": False, "message": "Validation failed.", "errors": exc.messages}, 422

        # Check 2 — service-layer persistence
        try:
            announcement = create_announcement(
                payload["title"], payload["content"],
                get_jwt_identity(), payload.get("date"),
            )
        except Exception as exc:  # noqa: BLE001 - deliberate catch-all, returns error response to client
            return {"success": False, "message": str(exc)}, 500

        log_audit(
            mongo.db, get_jwt_identity(), Role.MANAGER, "announcements", "create",
            target_id=announcement["id"], new_value=announcement,
        )
        return {"success": True, "message": "Announcement posted.", "data": announcement}, 201


@announcements_ns.route("/<string:announcement_id>")
@announcements_ns.param("announcement_id", "MongoDB announcement ID")
class AnnouncementDetail(Resource):
    @announcements_ns.doc(security="Bearer Auth")
    @role_required(*Role.ALL)
    def get(self, announcement_id):
        """Get a single announcement by ID.  Visible to all authenticated roles."""
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
        """Update an announcement's title, content, and/or date.  Manager only."""
        # Check 1 — schema validation
        try:
            payload = UpdateAnnouncementSchema().load(request.get_json() or {})
        except ValidationError as exc:
            return {"success": False, "message": "Validation failed.", "errors": exc.messages}, 422

        # Check 2 — service-layer persistence
        try:
            announcement = update_announcement(
                announcement_id,
                payload.get("title"),
                payload.get("content"),
                payload.get("date"),
            )
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 400
        except Exception as exc:  # noqa: BLE001 - deliberate catch-all, returns error response to client
            return {"success": False, "message": str(exc)}, 500

        if announcement is None:
            return {"success": False, "message": "Announcement not found."}, 404

        log_audit(
            mongo.db, get_jwt_identity(), Role.MANAGER, "announcements", "update",
            target_id=announcement_id, new_value=announcement,
        )
        return {"success": True, "message": "Announcement updated.", "data": announcement}, 200

    @announcements_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def delete(self, announcement_id):
        """Delete an announcement permanently.  Manager only."""
        try:
            announcement = delete_announcement(announcement_id)
            if announcement is None:
                return {"success": False, "message": "Announcement not found."}, 404
            log_audit(
                mongo.db, get_jwt_identity(), Role.MANAGER, "announcements", "delete",
                target_id=announcement_id, old_value=announcement,
            )
            return {"success": True, "message": "Announcement deleted."}, 200
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 400
