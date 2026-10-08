"""Shared authorized review, grading and private communication endpoints."""

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity

from app.services.milestone_service import (
    comments_for,
    confirm_submission_policy,
    grade_task,
    post_comment,
    task_access,
    task_view,
)
from app.utils.decorators import role_required
from app.utils.responses import error_response, success_response

workflow_bp = Blueprint("workflow", __name__)


@workflow_bp.route("/groups/<group_id>/milestones/<task_id>", methods=["GET"])
@role_required("pbl_manager", "teacher", "evaluator")
def detail(group_id, task_id):
    try:
        user, group, task = task_access(get_jwt_identity(), task_id, group_id)
        return success_response(data=task_view(user, group, task))
    except ValueError as exc:
        return error_response(str(exc), getattr(exc, "status_code", 400))


@workflow_bp.route("/groups/<group_id>/milestones/<task_id>/grade", methods=["POST"])
@role_required("teacher")
def grade(group_id, task_id):
    try:
        body = request.get_json() or {}
        result = grade_task(get_jwt_identity(), group_id, task_id, body.get("scores"), body.get("feedback", ""))
        return success_response("Grade submitted and locked.", data=result, status=201)
    except ValueError as exc:
        return error_response(str(exc), getattr(exc, "status_code", 400))


@workflow_bp.route("/groups/<group_id>/milestones/<task_id>/comments", methods=["GET", "POST"])
@role_required("pbl_manager", "teacher")
def comments(group_id, task_id):
    try:
        result = comments_for(get_jwt_identity(), task_id, group_id) if request.method == "GET" else post_comment(
            get_jwt_identity(), task_id, request.get_json() or {}, group_id)
        return success_response(data=result)
    except ValueError as exc:
        return error_response(str(exc), getattr(exc, "status_code", 400))


@workflow_bp.route("/groups/<group_id>/milestones/<task_id>/submission-policy", methods=["POST"])
@role_required("pbl_manager")
def submission_policy(group_id, task_id):
    try:
        result = confirm_submission_policy(get_jwt_identity(), group_id, task_id, request.get_json() or {})
        return success_response("Historical policy confirmed.", data=result)
    except ValueError as exc:
        return error_response(str(exc), getattr(exc, "status_code", 400))
