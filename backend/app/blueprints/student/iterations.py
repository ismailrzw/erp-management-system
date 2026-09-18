# backend/app/blueprints/student/iterations.py
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from flask import request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from flask_restx import Namespace, Resource
from werkzeug.datastructures import FileStorage

from app.extensions import mongo
from app.models.user import Role
from app.services.storage_service import upload_file
from app.utils.decorators import role_required
from app.utils.responses import error_response, success_response

student_iterations_ns = Namespace('student_iterations', description='Student Iterations and Submissions')

upload_parser = student_iterations_ns.parser()
upload_parser.add_argument('file', location='files', type=FileStorage, required=True, help='Project file (.pdf, .docx, .xlsx, .zip)')
upload_parser.add_argument('note', location='form', type=str, required=False, help='Optional submission note')


def is_submission_late(deadline_str: str) -> bool:
    """Returns True if current UTC time is past the given deadline.

    Supports both 'YYYY-MM-DD' (date-only) and 'YYYY-MM-DDTHH:MM' (datetime-local) formats.
    """
    if not deadline_str:
        return False
    try:
        # Try datetime-local format first (e.g. 2026-09-15T23:59)
        deadline = datetime.strptime(deadline_str, "%Y-%m-%dT%H:%M").replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) > deadline
    except (ValueError, TypeError):
        pass
    try:
        # Fallback to date-only (e.g. 2026-09-15)
        deadline = datetime.strptime(deadline_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) > deadline
    except (ValueError, TypeError):
        return False


@student_iterations_ns.route('')
class StudentIterationListResource(Resource):
    @jwt_required()
    @role_required(Role.STUDENT)
    @student_iterations_ns.doc(security='Bearer Auth')
    def get(self):
        """Get all iterations for the student's enrolled course with submission status."""
        student_id = get_jwt_identity()
        claims = get_jwt()
        course = claims.get('course')

        if not course:
            user = mongo.db.users.find_one({"_id": ObjectId(student_id)})
            course = user.get('course') if user else None

        if not course:
            return error_response("Student course not found in token or profile.", 400)

        # Find student's approved group
        group = mongo.db.groups.find_one({
            "member_ids": ObjectId(student_id),
            "status": "approved"
        })

        # Include iterations for the student's course AND any "All Courses" iterations
        iterations = list(mongo.db.iterations.find({
            "$or": [{"course": course}, {"course": "All Courses"}]
        }).sort("createdAt", 1))

        # Attach submission status for each iteration
        result = []
        for item in iterations:
            item_id = item['_id']
            item['_id'] = str(item_id)

            sub_info = None
            if group:
                sub = mongo.db.submissions.find_one({
                    "group_id": group['_id'],
                    "iteration_id": item_id
                })
                if sub:
                    sub_info = {
                        "id": str(sub['_id']),
                        "file_name": sub.get('file_name'),
                        "file_url": sub.get('file_url'),
                        "file_size": sub.get('file_size'),
                        "note": sub.get('note'),
                        "is_late": sub.get('is_late', False),
                        "submitted_at": sub.get('submitted_at').isoformat() if sub.get('submitted_at') else None
                    }

            item['submission'] = sub_info
            item['has_submitted'] = sub_info is not None
            result.append(item)

        return success_response("Student iterations retrieved.", data=result)


@student_iterations_ns.route('/<string:iteration_id>')
class StudentIterationDetailResource(Resource):
    @jwt_required()
    @role_required(Role.STUDENT)
    @student_iterations_ns.doc(security='Bearer Auth')
    def get(self, iteration_id):
        """Get single iteration details with rubric and submission status."""
        student_id = get_jwt_identity()
        try:
            oid = ObjectId(iteration_id)
        except (InvalidId, TypeError, ValueError):
            return error_response("Invalid iteration ID.", 400)

        iteration = mongo.db.iterations.find_one({"_id": oid})
        if not iteration:
            return error_response("Iteration not found.", 404)

        iteration['_id'] = str(iteration['_id'])

        group = mongo.db.groups.find_one({
            "member_ids": ObjectId(student_id),
            "status": "approved"
        })

        sub_info = None
        if group:
            sub = mongo.db.submissions.find_one({
                "group_id": group['_id'],
                "iteration_id": oid
            })
            if sub:
                # Resolve submitter name
                submitter_name = None
                submitter_id = sub.get('submitted_by')
                if submitter_id:
                    submitter_user = mongo.db.users.find_one({"_id": ObjectId(submitter_id) if isinstance(submitter_id, str) else submitter_id})
                    if submitter_user:
                        submitter_name = (
                            submitter_user.get('full_name') or
                            submitter_user.get('name') or
                            submitter_user.get('email', 'Unknown')
                        )
                sub_info = {
                    "id": str(sub['_id']),
                    "file_name": sub.get('file_name'),
                    "file_url": sub.get('file_url'),
                    "file_size": sub.get('file_size'),
                    "note": sub.get('note'),
                    "is_late": sub.get('is_late', False),
                    "submitted_at": sub.get('submitted_at').isoformat() if sub.get('submitted_at') else None,
                    "submitted_by_name": submitter_name,
                }

        iteration['submission'] = sub_info
        iteration['has_submitted'] = sub_info is not None
        return success_response("Iteration detail retrieved.", data=iteration)


@student_iterations_ns.route('/<string:iteration_id>/submit')
class StudentIterationSubmitResource(Resource):
    @jwt_required()
    @role_required(Role.STUDENT)
    @student_iterations_ns.doc(security='Bearer Auth')
    @student_iterations_ns.expect(upload_parser)
    def post(self, iteration_id):
        """Submit project file for an iteration (multipart/form-data)."""
        student_id = get_jwt_identity()

        try:
            oid = ObjectId(iteration_id)
        except (InvalidId, TypeError, ValueError):
            return error_response("Invalid iteration ID.", 400)

        # 1. Verify student is in an approved group
        group = mongo.db.groups.find_one({
            "member_ids": ObjectId(student_id),
            "status": "approved"
        })
        if not group:
            return error_response("You must be in an approved group to submit iteration work.", 403)

        # 2. Verify iteration exists
        iteration = mongo.db.iterations.find_one({"_id": oid})
        if not iteration:
            return error_response("Iteration not found.", 404)

        # 3. Verify file uploaded
        if 'file' not in request.files:
            return error_response("No file provided.", 400)

        uploaded_file = request.files['file']
        try:
            file_url = upload_file(uploaded_file, subfolder="submissions")
            file_name = uploaded_file.filename
            file_size = request.content_length or 0
        except ValueError as e:
            return error_response(str(e), 400)

        note = (request.form.get('note') or '').strip()
        is_late = is_submission_late(str(iteration.get('deadline', '')))
        now = datetime.now(timezone.utc)

        # 4. Upsert submission (one submission per group per iteration)
        mongo.db.submissions.update_one(
            {"group_id": group['_id'], "iteration_id": oid},
            {"$set": {
                "group_id": group['_id'],
                "iteration_id": oid,
                "submitted_by": ObjectId(student_id),
                "file_url": file_url,
                "file_name": file_name,
                "file_size": file_size,
                "note": note,
                "is_late": is_late,
                "submitted_at": now
            }},
            upsert=True
        )

        sub_doc = mongo.db.submissions.find_one({"group_id": group['_id'], "iteration_id": oid})
        sub_doc['_id'] = str(sub_doc['_id'])
        sub_doc['group_id'] = str(sub_doc['group_id'])
        sub_doc['iteration_id'] = str(sub_doc['iteration_id'])
        sub_doc['submitted_by'] = str(sub_doc['submitted_by'])
        sub_doc['submitted_at'] = sub_doc['submitted_at'].isoformat()

        msg = f"Submission received {'(LATE)' if is_late else 'on time'}."
        return success_response(msg, data=sub_doc, status=201)
