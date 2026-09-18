# backend/app/blueprints/student/supervisors.py
"""
Student Supervisor Browsing & Request Endpoints.
"""

from flask import request
from flask_jwt_extended import get_jwt_identity
from flask_restx import Namespace, Resource, fields

from app.extensions import mongo
from app.models.group import COLLECTION as GROUPS_COLLECTION, Field as GroupField, Status as GroupStatus
from app.models.user import Role, UserFields
from app.services.supervisor_service import (
    cancel_supervisor_request,
    create_supervisor_request,
    get_my_group_supervisor_request,
    list_available_supervisors,
)
from app.utils.decorators import role_required

student_supervisors_ns = Namespace("student_supervisors", description="Student supervisor discovery operations")
student_supervisor_requests_ns = Namespace("student_supervisor_requests", description="Student supervisor requests")

request_create_model = student_supervisor_requests_ns.model("SupervisorRequestCreate", {
    "evaluator_id": fields.String(required=True, description="ID of target supervisor"),
    "request_message": fields.String(required=False, description="Optional note for the supervisor"),
})


@student_supervisors_ns.route("/")
@student_supervisors_ns.route("")
class SupervisorBrowse(Resource):
    @student_supervisors_ns.doc(security="Bearer Auth")
    @role_required(Role.STUDENT)
    def get(self):
        """Browse all evaluators / supervisors with domain tags and availability."""
        try:
            domain = request.args.get("domain")
            dept = request.args.get("dept")
            course_query = request.args.get("course")
            available_only = request.args.get("available_only", "false").lower() == "true"

            student_id = get_jwt_identity()
            from bson import ObjectId
            student = mongo.db.users.find_one({"_id": ObjectId(student_id)})
            student_course = course_query or (student.get("course") if student else None)

            items = list_available_supervisors(
                domain=domain,
                dept=dept,
                course=student_course,
                available_only=available_only,
            )
            return {
                "success": True,
                "message": "Supervisors retrieved.",
                "data": {
                    "items": items,
                    "total": len(items),
                },
            }, 200
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500


@student_supervisor_requests_ns.route("/")
@student_supervisor_requests_ns.route("")
class SupervisorRequestCollection(Resource):
    @student_supervisor_requests_ns.doc(security="Bearer Auth")
    @student_supervisor_requests_ns.expect(request_create_model)
    @role_required(Role.STUDENT)
    def post(self):
        """Send a supervisor request on behalf of the student's group (Leader only)."""
        try:
            student_id = get_jwt_identity()
            body = request.get_json() or {}
            evaluator_id = body.get("evaluator_id")
            request_message = body.get("request_message")

            if not evaluator_id:
                return {"success": False, "message": "evaluator_id is required."}, 400

            # Find student's group
            from bson import ObjectId
            group = mongo.db[GROUPS_COLLECTION].find_one({
                GroupField.MEMBER_IDS: ObjectId(student_id),
                GroupField.STATUS: {"$ne": GroupStatus.DELETED},
            })
            if not group:
                return {"success": False, "message": "You must create or belong to a group before requesting a supervisor."}, 400

            group_id = str(group["_id"])
            result = create_supervisor_request(
                group_id=group_id,
                student_id=student_id,
                evaluator_id=evaluator_id,
                request_message=request_message,
            )

            return {
                "success": True,
                "message": "Supervisor request sent successfully.",
                "data": result,
            }, 201

        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 400
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500


@student_supervisor_requests_ns.route("/my")
class MySupervisorRequest(Resource):
    @student_supervisor_requests_ns.doc(security="Bearer Auth")
    @role_required(Role.STUDENT)
    def get(self):
        """Get the current supervisor request status for the student's group."""
        try:
            student_id = get_jwt_identity()
            from bson import ObjectId
            group = mongo.db[GROUPS_COLLECTION].find_one({
                GroupField.MEMBER_IDS: ObjectId(student_id),
                GroupField.STATUS: {"$ne": GroupStatus.DELETED},
            })
            if not group:
                return {"success": True, "data": None}, 200

            result = get_my_group_supervisor_request(str(group["_id"]))
            return {"success": True, "data": result}, 200
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500


@student_supervisor_requests_ns.route("/<string:request_id>")
class CancelSupervisorRequest(Resource):
    @student_supervisor_requests_ns.doc(security="Bearer Auth")
    @role_required(Role.STUDENT)
    def delete(self, request_id):
        """Cancel a pending supervisor request (Leader only)."""
        try:
            student_id = get_jwt_identity()
            result = cancel_supervisor_request(request_id, student_id)
            return {"success": True, "message": "Supervisor request cancelled.", "data": result}, 200
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 400
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500
