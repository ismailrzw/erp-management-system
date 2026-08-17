"""Manager department API endpoints."""

from flask import request
from flask_jwt_extended import get_jwt_identity
from flask_restx import Namespace, Resource, fields

from app.models.user import Role
from app.schemas.department_schema import CreateDepartmentSchema, UpdateDepartmentSchema
from app.services.department_service import (
    create_department,
    get_department_by_id,
    list_departments,
    permanent_delete_department,
    restore_department,
    soft_delete_department,
    update_department,
)
from app.utils.audit import log_audit
from app.utils.decorators import role_required
from app.extensions import mongo


departments_ns = Namespace("manager_departments", description="Manager department operations")

department_model = departments_ns.model("Department", {
    "id": fields.String(readonly=True),
    "name": fields.String(required=True),
    "code": fields.String(required=True),
    "deleted": fields.Boolean(readonly=True),
    "created_at": fields.String(readonly=True),
})
create_model = departments_ns.model("DepartmentCreate", {
    "name": fields.String(required=True),
    "code": fields.String(required=True, description="2-4 uppercase letters, e.g. SE"),
})
update_model = departments_ns.model("DepartmentUpdate", {
    "name": fields.String(required=False),
    "code": fields.String(required=False),
})

list_parser = departments_ns.parser()
list_parser.add_argument("deleted", type=bool, default=False, location="args")
list_parser.add_argument("search", type=str, required=False, location="args")


@departments_ns.route("/")
class DepartmentList(Resource):
    @departments_ns.doc(security="Bearer Auth")
    @departments_ns.expect(list_parser)
    @role_required(Role.MANAGER)
    def get(self):
        """List all departments. Use ?deleted=true for the recycle bin."""
        args = list_parser.parse_args()
        items = list_departments(deleted=args["deleted"], search=args.get("search"))
        return {"success": True, "message": "Departments retrieved.", "data": {"items": items, "total": len(items)}}, 200

    @departments_ns.doc(security="Bearer Auth")
    @departments_ns.expect(create_model)
    @role_required(Role.MANAGER)
    def post(self):
        """Add a new department."""
        try:
            payload = CreateDepartmentSchema().load(request.get_json() or {})
            department = create_department(payload["name"], payload["code"])
            log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "departments", "create",
                      target_id=department["id"], new_value=department)
            return {"success": True, "message": "Department added successfully.", "data": department}, 201
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 409
        except Exception as exc:
            return {"success": False, "message": str(exc)}, 422


@departments_ns.route("/<string:department_id>")
@departments_ns.param("department_id", "MongoDB department ID")
class DepartmentDetail(Resource):
    @departments_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def get(self, department_id):
        """Get a single department by ID."""
        try:
            department = get_department_by_id(department_id)
            if department is None:
                return {"success": False, "message": "Department not found."}, 404
            return {"success": True, "data": department}, 200
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 400

    @departments_ns.doc(security="Bearer Auth")
    @departments_ns.expect(update_model)
    @role_required(Role.MANAGER)
    def put(self, department_id):
        """Update a department's name and/or code."""
        try:
            payload = UpdateDepartmentSchema().load(request.get_json() or {})
            department = update_department(department_id, payload.get("name"), payload.get("code"))
            if department is None:
                return {"success": False, "message": "Department not found."}, 404
            log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "departments", "update",
                      target_id=department_id, new_value=department)
            return {"success": True, "message": "Department updated.", "data": department}, 200
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 409
        except Exception as exc:
            return {"success": False, "message": str(exc)}, 422

    @departments_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def delete(self, department_id):
        """Soft-delete a department (moves it to the recycle bin)."""
        try:
            department = soft_delete_department(department_id)
            if department is None:
                return {"success": False, "message": "Department not found."}, 404
            log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "departments", "delete",
                      target_id=department_id, old_value=department)
            return {"success": True, "message": "Department deleted.", "data": {"deleted": True, "department_id": department_id}}, 200
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 400


@departments_ns.route("/<string:department_id>/restore")
@departments_ns.param("department_id", "MongoDB department ID")
class DepartmentRestore(Resource):
    @departments_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def post(self, department_id):
        """Restore a soft-deleted department from the recycle bin."""
        try:
            department = restore_department(department_id)
            if department is None:
                return {"success": False, "message": "Department not found."}, 404
            log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "departments", "restore",
                      target_id=department_id, new_value=department)
            return {"success": True, "message": "Department restored.", "data": {"restored": True, "department_id": department_id}}, 200
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 400


@departments_ns.route("/<string:department_id>/permanent")
@departments_ns.param("department_id", "MongoDB department ID")
class DepartmentPermanentDelete(Resource):
    @departments_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def delete(self, department_id):
        """Permanently delete a department. Must already be soft-deleted."""
        try:
            department = permanent_delete_department(department_id)
            if department is None:
                return {"success": False, "message": "Department not found."}, 404
            log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "departments", "permanent_delete",
                      target_id=department_id, old_value=department)
            return {"success": True, "message": "Department permanently deleted.", "data": {"deleted": True, "department_id": department_id}}, 200
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 400