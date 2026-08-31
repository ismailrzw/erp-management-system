# backend/app/blueprints/manager/courses.py
"""Manager course API endpoints."""

from flask import request
from flask_jwt_extended import get_jwt_identity
from flask_restx import Namespace, Resource, fields, inputs
from marshmallow import ValidationError

from app.extensions import mongo
from app.models.user import Role
from app.schemas.course_schema import CreateCourseSchema, UpdateCourseSchema
from app.services.course_service import (
    create_course,
    get_course_by_id,
    list_courses,
    permanent_delete_course,
    restore_course,
    soft_delete_course,
    update_course,
)
from app.utils.audit import log_audit
from app.utils.decorators import role_required

courses_ns = Namespace("manager_courses", description="Manager course operations")

course_model = courses_ns.model("Course", {
    "id": fields.String(readonly=True),
    "name": fields.String(required=True),
    "dept": fields.String(required=True),
    "min_group": fields.Integer(required=True),
    "max_group": fields.Integer(required=True),
    "deadline": fields.String(required=True),
    "deleted": fields.Boolean(readonly=True),
    "created_at": fields.String(readonly=True),
})
create_model = courses_ns.model("CourseCreate", {
    "name": fields.String(required=True, description="e.g. Final Year Project - Fall 2025"),
    "dept": fields.String(required=True, description="Department code, e.g. SE"),
    "min_group": fields.Integer(required=True, description="Minimum students per group"),
    "max_group": fields.Integer(required=True, description="Maximum students per group"),
    "deadline": fields.String(required=True, description="ISO date, e.g. 2026-08-15"),
})
update_model = courses_ns.model("CourseUpdate", {
    "name": fields.String(required=False),
    "dept": fields.String(required=False),
    "min_group": fields.Integer(required=False),
    "max_group": fields.Integer(required=False),
    "deadline": fields.String(required=False),
})

list_parser = courses_ns.parser()
list_parser.add_argument("deleted", type=inputs.boolean, default=False, location="args")
list_parser.add_argument("dept", type=str, required=False, location="args")
list_parser.add_argument("search", type=str, required=False, location="args")


@courses_ns.route("/")
class CourseList(Resource):
    @courses_ns.doc(security="Bearer Auth")
    @courses_ns.expect(list_parser)
    @role_required(Role.MANAGER)
    def get(self):
        """List all courses. Use ?deleted=true for the recycle bin, ?dept=SE to filter."""
        args = list_parser.parse_args()
        items = list_courses(deleted=args["deleted"], dept=args.get("dept"), search=args.get("search"))
        return {"success": True, "message": "Courses retrieved.", "data": {"items": items, "total": len(items)}}, 200

    @courses_ns.doc(security="Bearer Auth")
    @courses_ns.expect(create_model)
    @role_required(Role.MANAGER)
    def post(self):
        """Add a new course."""
        try:
            payload = CreateCourseSchema().load(request.get_json() or {})
            course = create_course(
                payload["name"], payload["dept"], payload["min_group"], payload["max_group"], payload["deadline"]
            )
            log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "courses", "create",
                      target_id=course["id"], new_value=course)
            return {"success": True, "message": "Course added successfully.", "data": course}, 201
        except ValidationError as exc:
            return {"success": False, "message": exc.messages}, 422
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 409


@courses_ns.route("/<string:course_id>")
@courses_ns.param("course_id", "MongoDB course ID")
class CourseDetail(Resource):
    @courses_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def get(self, course_id):
        """Get a single course by ID."""
        try:
            course = get_course_by_id(course_id)
            if course is None:
                return {"success": False, "message": "Course not found."}, 404
            return {"success": True, "data": course}, 200
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 400

    @courses_ns.doc(security="Bearer Auth")
    @courses_ns.expect(update_model)
    @role_required(Role.MANAGER)
    def put(self, course_id):
        """Update a course's name, department, group sizes, and/or deadline."""
        try:
            payload = UpdateCourseSchema().load(request.get_json() or {})
            course = update_course(
                course_id,
                name=payload.get("name"),
                dept=payload.get("dept"),
                min_group=payload.get("min_group"),
                max_group=payload.get("max_group"),
                deadline=payload.get("deadline"),
            )
            if course is None:
                return {"success": False, "message": "Course not found."}, 404
            log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "courses", "update",
                      target_id=course_id, new_value=course)
            return {"success": True, "message": "Course updated.", "data": course}, 200
        except ValidationError as exc:
            return {"success": False, "message": exc.messages}, 422
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 409

    @courses_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def delete(self, course_id):
        """Soft-delete a course (moves it to the recycle bin). Blocked if it has active groups."""
        try:
            course = soft_delete_course(course_id)
            if course is None:
                return {"success": False, "message": "Course not found."}, 404
            log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "courses", "delete",
                      target_id=course_id, old_value=course)
            return {"success": True, "message": "Course deleted.", "data": {"deleted": True, "course_id": course_id}}, 200
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 409


@courses_ns.route("/<string:course_id>/restore")
@courses_ns.param("course_id", "MongoDB course ID")
class CourseRestore(Resource):
    @courses_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def post(self, course_id):
        """Restore a soft-deleted course from the recycle bin."""
        try:
            course = restore_course(course_id)
            if course is None:
                return {"success": False, "message": "Course not found."}, 404
            log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "courses", "restore",
                      target_id=course_id, new_value=course)
            return {"success": True, "message": "Course restored.", "data": {"restored": True, "course_id": course_id}}, 200
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 400


@courses_ns.route("/<string:course_id>/permanent")
@courses_ns.param("course_id", "MongoDB course ID")
class CoursePermanentDelete(Resource):
    @courses_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def delete(self, course_id):
        """Permanently delete a course. Must already be soft-deleted."""
        try:
            course = permanent_delete_course(course_id)
            if course is None:
                return {"success": False, "message": "Course not found."}, 404
            log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "courses", "permanent_delete",
                      target_id=course_id, old_value=course)
            return {"success": True, "message": "Course permanently deleted.", "data": {"deleted": True, "course_id": course_id}}, 200
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 400