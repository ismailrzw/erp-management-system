"""Manager teacher/evaluator API endpoints."""

from flask import request
from flask_jwt_extended import get_jwt_identity
from flask_restx import Namespace, Resource, fields, inputs

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

teacher_model = teachers_ns.model("Teacher", {
    "id": fields.String(readonly=True),
    "name": fields.String(required=True),
    "email": fields.String(required=True),
    "dept": fields.String(required=True),
    "type": fields.String(required=True, enum=TeacherType.ALL),
    "deleted": fields.Boolean(readonly=True),
    "created_at": fields.String(readonly=True),
})
create_model = teachers_ns.model("TeacherCreate", {
    "name": fields.String(required=True),
    "email": fields.String(required=True),
    "dept": fields.String(required=True),
    "type": fields.String(required=True, enum=TeacherType.ALL),
})
update_model = teachers_ns.model("TeacherUpdate", {
    "name": fields.String(required=False),
    "dept": fields.String(required=False),
    "type": fields.String(required=False, enum=TeacherType.ALL),
})

list_parser = teachers_ns.parser()
list_parser.add_argument("deleted", type=inputs.boolean, default=False, location="args")
list_parser.add_argument("dept", type=str, required=False, location="args")


@teachers_ns.route("/")
class TeacherList(Resource):
    @teachers_ns.doc(security="Bearer Auth")
    @teachers_ns.expect(list_parser)
    @role_required(Role.MANAGER)
    def get(self):
        """List all teachers/evaluators. Use ?deleted=true for the recycle bin."""
        args = list_parser.parse_args()
        items = list_teachers(deleted=args["deleted"], dept=args.get("dept"))
        return {"success": True, "message": "Teachers retrieved.", "data": {"items": items, "total": len(items)}}, 200

    @teachers_ns.doc(security="Bearer Auth")
    @teachers_ns.expect(create_model)
    @role_required(Role.MANAGER)
    def post(self):
        """Add a new teacher/evaluator."""
        try:
            payload = CreateTeacherSchema().load(request.get_json() or {})
            teacher = create_teacher(payload["name"], payload["email"], payload["dept"], payload["type"])
            log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "teachers", "create",
                      target_id=teacher["id"], new_value=teacher)
            return {"success": True, "message": "Teacher added successfully.", "data": teacher}, 201
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 409
        except Exception as exc:  # noqa: BLE001 - deliberate catch-all, returns error response to client
            return {"success": False, "message": str(exc)}, 422


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
        """Update a teacher's name, dept, and/or type."""
        try:
            payload = UpdateTeacherSchema().load(request.get_json() or {})
            teacher = update_teacher(teacher_id, payload.get("name"), payload.get("dept"), payload.get("type"))
            if teacher is None:
                return {"success": False, "message": "Teacher not found."}, 404
            log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "teachers", "update",
                      target_id=teacher_id, new_value=teacher)
            return {"success": True, "message": "Teacher updated.", "data": teacher}, 200
        except Exception as exc:  # noqa: BLE001 - deliberate catch-all, returns error response to client
            return {"success": False, "message": str(exc)}, 422

    @teachers_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def delete(self, teacher_id):
        """Soft-delete a teacher/evaluator (moves to recycle bin)."""
        teacher = soft_delete_teacher(teacher_id)
        if teacher is None:
            return {"success": False, "message": "Teacher not found."}, 404
        log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "teachers", "delete",
                  target_id=teacher_id, old_value=teacher)
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
        log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "teachers", "restore",
                  target_id=teacher_id, new_value=teacher)
        return {"success": True, "message": "Teacher restored.", "data": {"restored": True, "teacher_id": teacher_id}}, 200


@teachers_ns.route("/<string:teacher_id>/permanent")
@teachers_ns.param("teacher_id", "MongoDB teacher ID")
class TeacherPermanentDelete(Resource):
    @teachers_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def delete(self, teacher_id):
        """Permanently delete a teacher/evaluator. Must already be soft-deleted."""
        teacher = permanent_delete_teacher(teacher_id)
        if teacher is None:
            return {"success": False, "message": "Teacher not found."}, 404
        log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "teachers", "permanent_delete",
                  target_id=teacher_id, old_value=teacher)
        return {"success": True, "message": "Teacher permanently deleted.", "data": {"deleted": True, "teacher_id": teacher_id}}, 200