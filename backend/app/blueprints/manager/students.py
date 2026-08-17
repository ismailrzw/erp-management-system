# backend/app/blueprints/manager/students.py
"""Manager Students API endpoints."""

from flask import Blueprint, request
from flask_restx import Namespace, Resource, fields, reqparse
from flask_jwt_extended import get_jwt_identity
from werkzeug.datastructures import FileStorage

from app.extensions import mongo
from app.utils.decorators import role_required
from app.models.user import Role
from app.services.student_service import (
    create_student,
    list_students,
    get_student_by_id,
    update_student,
    soft_delete_student,
    restore_student,
    permanent_delete_student,
)
from app.schemas.student_schema import CreateStudentSchema, UpdateStudentSchema
from app.utils.audit import log_audit
from app.services.bulk_import_service import bulk_create_students, parse_excel

# ── Blueprint ──────────────────────────────────────────────
students_bp = Blueprint("manager_students", __name__)

# ── Namespace ──────────────────────────────────────────────
students_ns = Namespace("manager_students", description="Manager Students operations")

# ── Swagger Models ─────────────────────────────────────────
student_model = students_ns.model("Student", {
    "name": fields.String(required=True, description="Student name"),
    "roll": fields.String(required=True, description="Roll number"),
    "dept": fields.String(required=True, description="Department code"),
    "section": fields.String(required=True, description="Section"),
    "session": fields.String(required=True, description="Session"),
    "course": fields.String(required=True, description="Course name"),
    "teacher": fields.String(required=True, description="Teacher name"),
    "recovery_email": fields.String(description="Recovery email"),
})

student_update_model = students_ns.model("StudentUpdate", {
    "name": fields.String(description="Student name"),
    "section": fields.String(description="Section"),
    "course": fields.String(description="Course name"),
    "teacher": fields.String(description="Teacher name"),
    "recovery_email": fields.String(description="Recovery email"),
})

bulk_import_parser = reqparse.RequestParser()
bulk_import_parser.add_argument("file", location="files", type=FileStorage, required=True,
                                help="CSV or XLSX file containing student rows")


# ── Routes ──────────────────────────────────────────────────

@students_ns.route("/")
class StudentList(Resource):
    @students_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def get(self):
        """List all students with pagination and filters."""
        try:
            dept = request.args.get("dept")
            section = request.args.get("section")
            search = request.args.get("search", "").strip()
            deleted = request.args.get("deleted", "false").lower() == "true"
            page = max(1, int(request.args.get("page", 1)))
            limit = min(100, max(1, int(request.args.get("limit", 20))))
            
            filters = {
                "dept": dept,
                "section": section,
                "search": search,
                "deleted": deleted,
            }
            
            result = list_students(filters, page, limit)
            return {"success": True, "message": "Students retrieved.", "data": result}, 200
            
        except Exception as e:
            return {"success": False, "message": str(e)}, 500

    @students_ns.doc(security="Bearer Auth")
    @students_ns.expect(student_model)
    @role_required(Role.MANAGER)
    def post(self):
        """Add a new student."""
        try:
            data = request.get_json() or {}
            
            schema = CreateStudentSchema()
            try:
                validated = schema.load(data)
            except Exception as e:
                return {"success": False, "message": str(e)}, 422
            
            result = create_student(validated)
            
            user_id = get_jwt_identity()
            log_audit(mongo.db, user_id, Role.MANAGER, "users", "create", 
                      target_id=result["student_id"], new_value={"roll": validated["roll"]})
            
            return {
                "success": True,
                "message": "Student added successfully.",
                "data": result
            }, 201
            
        except ValueError as e:
            return {"success": False, "message": str(e)}, 409
        except Exception as e:
            return {"success": False, "message": str(e)}, 500


@students_ns.route("/<student_id>")
class StudentDetail(Resource):
    @students_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def get(self, student_id):
        """Get a single student by ID."""
        try:
            student = get_student_by_id(student_id)
            if not student:
                return {"success": False, "message": "Student not found."}, 404
            return {"success": True, "message": "Student retrieved.", "data": student}, 200
        except Exception as e:
            return {"success": False, "message": str(e)}, 500

    @students_ns.doc(security="Bearer Auth")
    @students_ns.expect(student_update_model)
    @role_required(Role.MANAGER)
    def put(self, student_id):
        """Update a student."""
        try:
            data = request.get_json() or {}
            
            schema = UpdateStudentSchema()
            try:
                validated = schema.load(data)
            except Exception as e:
                return {"success": False, "message": str(e)}, 422
            
            if not validated:
                return {"success": False, "message": "No fields to update."}, 400
            
            result = update_student(student_id, validated)
            
            user_id = get_jwt_identity()
            log_audit(mongo.db, user_id, Role.MANAGER, "users", "update", 
                      target_id=student_id)
            
            return {"success": True, "message": "Student updated.", "data": result}, 200
            
        except ValueError as e:
            return {"success": False, "message": str(e)}, 404
        except Exception as e:
            return {"success": False, "message": str(e)}, 500

    @students_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def delete(self, student_id):
        """Soft delete a student."""
        try:
            result = soft_delete_student(student_id)
            
            user_id = get_jwt_identity()
            log_audit(mongo.db, user_id, Role.MANAGER, "users", "delete", 
                      target_id=student_id)
            
            return {"success": True, "message": "Student deleted.", "data": result}, 200
            
        except ValueError as e:
            return {"success": False, "message": str(e)}, 404
        except Exception as e:
            return {"success": False, "message": str(e)}, 500


@students_ns.route("/<student_id>/restore")
class StudentRestore(Resource):
    @students_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def post(self, student_id):
        """Restore a soft-deleted student."""
        try:
            result = restore_student(student_id)
            
            user_id = get_jwt_identity()
            log_audit(mongo.db, user_id, Role.MANAGER, "users", "restore", 
                      target_id=student_id)
            
            return {"success": True, "message": "Student restored.", "data": result}, 200
            
        except ValueError as e:
            return {"success": False, "message": str(e)}, 404
        except Exception as e:
            return {"success": False, "message": str(e)}, 500


@students_ns.route("/<student_id>/permanent")
class StudentPermanentDelete(Resource):
    @students_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def delete(self, student_id):
        """Permanently delete a student (only if already soft-deleted)."""
        try:
            result = permanent_delete_student(student_id)
            
            user_id = get_jwt_identity()
            log_audit(mongo.db, user_id, Role.MANAGER, "users", "permanent_delete", 
                      target_id=student_id)
            
            return {"success": True, "message": "Student permanently deleted.", "data": result}, 200
            
        except ValueError as e:
            return {"success": False, "message": str(e)}, 404
        except Exception as e:
            return {"success": False, "message": str(e)}, 500


@students_ns.route("/bulk")
class StudentBulkImport(Resource):
    @students_ns.doc(security="Bearer Auth", consumes=["multipart/form-data"])
    @students_ns.expect(bulk_import_parser)
    @role_required(Role.MANAGER)
    def post(self):
        """Bulk import students from CSV/XLSX after validating every row."""
        try:
            file = bulk_import_parser.parse_args()["file"]
            rows, validation_errors = parse_excel(file)
            result = bulk_create_students(rows)
            result["errors"] = validation_errors + result["errors"]
            result["skipped_count"] += len(validation_errors)
            log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "users", "bulk_import",
                      new_value={"imported": result["imported_count"], "skipped": result["skipped_count"]})
            return {
                "success": True,
                "message": "Student import completed.",
                "data": {
                    "imported": result["imported_count"],
                    "skipped": result["skipped_count"],
                    "errors": result["errors"],
                },
            }, 200
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 400
        except Exception:
            return {"success": False, "message": "Unable to import students."}, 500