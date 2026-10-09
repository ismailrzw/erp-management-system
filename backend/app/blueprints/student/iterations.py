"""Student milestones share the same server-side eligibility for every operation."""
from flask import request
from flask_jwt_extended import get_jwt_identity
from flask_restx import Namespace, Resource

from app.extensions import mongo
from app.models.user import Role
from app.services.milestone_service import (
    WorkflowError,
    applicable,
    comments_for,
    current_user,
    deadline_utc,
    post_comment,
    student_group,
    submit_task,
    task_access,
    task_view,
    unsubmit_task,
)
from app.utils.decorators import role_required
from app.utils.responses import error_response, success_response

student_iterations_ns = Namespace('student_iterations', description='Group milestones and submissions')


def is_submission_late(value):
    from datetime import datetime, timezone
    return datetime.now(timezone.utc) > deadline_utc(value)


def failure(exc):
    return error_response(str(exc), getattr(exc, 'status_code', 400))


@student_iterations_ns.route('')
class StudentIterationListResource(Resource):
    @role_required(Role.STUDENT)
    def get(self):
        try:
            user = current_user(get_jwt_identity())
            group = student_group(user)
            tasks = mongo.db.iterations.find({'deleted': {'$ne': True}}).sort([('sprint_name', 1), ('milestone_order', 1)])
            return success_response(data=[task_view(user, group, task) for task in tasks if applicable(task, group)])
        except (ValueError, WorkflowError) as exc:
            return failure(exc)


@student_iterations_ns.route('/<string:iteration_id>')
class StudentIterationDetailResource(Resource):
    @role_required(Role.STUDENT)
    def get(self, iteration_id):
        try:
            user, group, task = task_access(get_jwt_identity(), iteration_id)
            return success_response(data=task_view(user, group, task))
        except ValueError as exc:
            return failure(exc)


@student_iterations_ns.route('/<string:iteration_id>/submit')
class StudentIterationSubmitResource(Resource):
    @role_required(Role.STUDENT)
    def post(self, iteration_id):
        try:
            view = submit_task(get_jwt_identity(), iteration_id, request.files.get('file'),
                               request.form.get('note', ''), request.form.get('expected_submission'))
            return success_response('Group submission received.', data=view['submission'], status=201)
        except ValueError as exc:
            return failure(exc)


@student_iterations_ns.route('/<string:iteration_id>/unsubmit')
class StudentIterationUnsubmitResource(Resource):
    @role_required(Role.STUDENT)
    def post(self, iteration_id):
        try:
            return success_response('Group work unsubmitted.', data=unsubmit_task(
                get_jwt_identity(), iteration_id, (request.get_json() or {}).get('expected_submission')))
        except ValueError as exc:
            return failure(exc)


@student_iterations_ns.route('/<string:iteration_id>/comments')
class StudentIterationCommentsResource(Resource):
    @role_required(Role.STUDENT)
    def get(self, iteration_id):
        try:
            return success_response(data=comments_for(get_jwt_identity(), iteration_id))
        except ValueError as exc:
            return failure(exc)

    @role_required(Role.STUDENT)
    def post(self, iteration_id):
        try:
            return success_response(data=post_comment(get_jwt_identity(), iteration_id, request.get_json() or {}), status=201)
        except ValueError as exc:
            return failure(exc)
