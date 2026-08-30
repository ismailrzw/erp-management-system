# backend/app/blueprints/manager/teachers.py
"""
Manager teacher/evaluator API endpoints.

Data lifecycle enforced here:
  1. Raw JSON arrives at the endpoint.
  2. CreateTeacherSchema / UpdateTeacherSchema validates all fields.
     ValidationError → HTTP 422 with structured ``errors`` payload.
  3. The validated dict is passed to the teacher service which performs
     business logic (email uniqueness check, password generation) and
     inserts/updates in MongoDB.
  4. Service raises ValueError for constraint violations (409) or returns
     the serialised teacher dict (password_hash excluded).
"""

from flask import request
from flask_jwt_extended import get_jwt_identity
from flask_restx import Namespace, Resource, fields, inputs
from marshmallow import ValidationError

from app.extensions import mongo
from app.models.teacher import TeacherType
from app.models.user import Role
from app.schemas.teacher_schema import CreateTeacherSchema, UpdateTeacherSchema
from app.services.teacher_service import (
    create_teacher,
    get_teacher_by_id,
    list_teachers,
    permanent_delete_teacher,
    restore_teacher,
    soft_delete_teacher,
    update_teacher,
)
from app.utils.audit import log_audit
from app.utils.decorators import role_required

teachers_ns = Namespace("manager_teachers", description="Manager teacher/evaluator operations")

# ── Swagger models ──────────────────────────────────────────
teacher_model = teachers_ns.model("Teacher", {
    "id":         fields.String(readonly=True),
    "name":       fields.String(required=True),
    "email":      fields.String(required=True),
    "dept":       fields.String(required=True),
    "type":       fields.String(required=True, enum=TeacherType.ALL),
    "deleted":    fields.Boolean(readonly=True),
    "created_at": fields.String(readonly=True),
})
create_model = teachers_ns.model("TeacherCreate", {
    "name":  fields.String(required=True),
    "email": fields.String(required=True),
    "dept":  fields.String(required=True),
    "type":  fields.String(required=True, enum=TeacherType.ALL),
})
update_model = teachers_ns.model("TeacherUpdate", {
    "name": fields.String(required=False),
    "dept": fields.String(required=False),
    "type": fields.String(required=False, enum=TeacherType.ALL),
})

list_parser = teachers_ns.parser()
list_parser.add_argument("deleted", type=inputs.boolean, default=False, location="args")
list_parser.add_argument("dept",    type=str, required=False, location="args")


@teachers_ns.route("/")
class TeacherList(Resource):
    @teachers_ns.doc(security="Bearer Auth")
    @teachers_ns.expect(list_parser)
    @role_required(Role.MANAGER)
    def get(self):
        """List all teachers/evaluators.  Use ?deleted=true for the recycle bin."""
        args  = list_parser.parse_args()
        items = list_teachers(deleted=args["deleted"], dept=args.get("dept"))
        return {"success": True, "message": "Teachers retrieved.", "data": {"items": items, "total": len(items)}}, 200

    @teachers_ns.doc(security="Bearer Auth")
    @teachers_ns.expect(create_model)
    @role_required(Role.MANAGER)
    def post(self):
        """Add a new teacher/evaluator.  An initial password is auto-generated and returned once."""
        # Check 1 — schema validation
        try:
            payload = CreateTeacherSchema().load(request.get_json() or {})
        except ValidationError as exc:
            return {"success": False, "message": "Validation failed.", "errors": exc.messages}, 422

        # Check 2 — service-layer (email uniqueness, password hash, DB insert)
        try:
            teacher = create_teacher(payload["name"], payload["email"], payload["dept"], payload["type"])
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 409

        log_audit(
            mongo.db, get_jwt_identity(), Role.MANAGER, "teachers", "create",
            target_id=teacher["id"], new_value=teacher,
        )
        return {"success": True, "message": "Teacher added successfully.", "data": teacher}, 201


@teachers_ns.route("/<string:teacher_id>")
@teachers_ns.param("teacher_id", "MongoDB teacher ID")
class TeacherDetail(Resource):
    @teachers_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def get(self, teacher_id):
        """Get a single teacher/evaluator by ID."""
        teacher = get_teacher_by_id(teacher_id)
        if teacher is None:
            return {"success": False, "message": "Teacher not found."}, 404
        return {"success": True, "data": teacher}, 200

    @teachers_ns.doc(security="Bearer Auth")
    @teachers_ns.expect(update_model)
    @role_required(Role.MANAGER)
    def put(self, teacher_id):
        """Update a teacher's name, dept, and/or type.  Email is immutable."""
        raw_body = request.get_json() or {}

        # Check 1 — schema validation (email is excluded from UpdateTeacherSchema)
        try:
            payload = UpdateTeacherSchema().load(raw_body)
        except ValidationError as exc:
            return {"success": False, "message": "Validation failed.", "errors": exc.messages}, 422

        # Guard: if the body had fields but none were updatable (e.g. only "email")
        # we return 422 so the caller learns the field is not accepted.
        if raw_body and not payload:
            return {
                "success": False,
                "message": "No updatable fields provided. "
                           "Note: email is immutable and cannot be changed.",
            }, 422

        # Check 2 — service-layer persistence
        try:
            teacher = update_teacher(teacher_id, payload.get("name"), payload.get("dept"), payload.get("type"))
        except Exception as exc:  # noqa: BLE001 - deliberate catch-all, returns error response to client
            return {"success": False, "message": str(exc)}, 422

        if teacher is None:
            return {"success": False, "message": "Teacher not found."}, 404

        log_audit(
            mongo.db, get_jwt_identity(), Role.MANAGER, "teachers", "update",
            target_id=teacher_id, new_value=teacher,
        )
        return {"success": True, "message": "Teacher updated.", "data": teacher}, 200

    @teachers_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def delete(self, teacher_id):
        """Soft-delete a teacher/evaluator (moves to recycle bin)."""
        teacher = soft_delete_teacher(teacher_id)
        if teacher is None:
            return {"success": False, "message": "Teacher not found."}, 404
        log_audit(
            mongo.db, get_jwt_identity(), Role.MANAGER, "teachers", "delete",
            target_id=teacher_id, old_value=teacher,
        )
        return {"success": True, "message": "Teacher deleted.", "data": {"deleted": True, "teacher_id": teacher_id}}, 200


@teachers_ns.route("/<string:teacher_id>/restore")
@teachers_ns.param("teacher_id", "MongoDB teacher ID")
class TeacherRestore(Resource):
    @teachers_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def post(self, teacher_id):
        """Restore a soft-deleted teacher/evaluator."""
        teacher = restore_teacher(teacher_id)
        if teacher is None:
            return {"success": False, "message": "Teacher not found."}, 404
        log_audit(
            mongo.db, get_jwt_identity(), Role.MANAGER, "teachers", "restore",
            target_id=teacher_id, new_value=teacher,
        )
        return {"success": True, "message": "Teacher restored.", "data": {"restored": True, "teacher_id": teacher_id}}, 200


@teachers_ns.route("/<string:teacher_id>/permanent")
@teachers_ns.param("teacher_id", "MongoDB teacher ID")
class TeacherPermanentDelete(Resource):
    @teachers_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def delete(self, teacher_id):
        """Permanently delete a teacher/evaluator.  Must already be soft-deleted."""
        teacher = permanent_delete_teacher(teacher_id)
        if teacher is None:
            return {"success": False, "message": "Teacher not found."}, 404
        log_audit(
            mongo.db, get_jwt_identity(), Role.MANAGER, "teachers", "permanent_delete",
            target_id=teacher_id, old_value=teacher,
        )
        return {"success": True, "message": "Teacher permanently deleted.", "data": {"deleted": True, "teacher_id": teacher_id}}, 200