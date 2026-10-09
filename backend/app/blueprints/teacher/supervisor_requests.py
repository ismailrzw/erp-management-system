# backend/app/blueprints/teacher/supervisor_requests.py
"""
Teacher Supervisor Requests & Expertise Endpoints.
"""

from flask import request
from flask_jwt_extended import get_jwt_identity

from app.blueprints.teacher import teacher_bp
from app.models.user import Role
from app.services.supervisor_service import (
    accept_supervisor_request,
    get_evaluator_active_count,
    list_evaluator_supervisor_requests,
    reject_supervisor_request,
)
from app.utils.decorators import role_required


@teacher_bp.route("/supervisor-requests", methods=["GET"], strict_slashes=False)
@teacher_bp.route("/supervisor-requests/", methods=["GET"], strict_slashes=False)
@role_required(Role.TEACHER)
def get_incoming_supervisor_requests():
    """List pending supervisor requests directed to the logged-in teacher."""
    try:
        teacher_id = get_jwt_identity()
        items = list_evaluator_supervisor_requests(teacher_id)
        active_count = get_evaluator_active_count(teacher_id)

        return {
            "success": True,
            "message": "Supervisor requests retrieved.",
            "data": {
                "items": items,
                "total": len(items),
                "active_supervision_count": active_count,
                "max_supervision_cap": 4,
            },
        }, 200
    except Exception as exc:  # noqa: BLE001
        return {"success": False, "message": str(exc)}, 500


@teacher_bp.route("/supervisor-requests/<string:request_id>/accept", methods=["POST"], strict_slashes=False)
@role_required(Role.TEACHER)
def accept_request(request_id):
    """Accept an incoming supervisor request."""
    try:
        teacher_id = get_jwt_identity()
        result = accept_supervisor_request(teacher_id, request_id)
        return {"success": True, "message": result["message"], "data": result}, 200
    except ValueError as exc:
        return {"success": False, "message": str(exc)}, 400
    except Exception as exc:  # noqa: BLE001
        return {"success": False, "message": str(exc)}, 500


@teacher_bp.route("/supervisor-requests/<string:request_id>/reject", methods=["POST"], strict_slashes=False)
@role_required(Role.TEACHER)
def reject_request(request_id):
    """Reject an incoming supervisor request."""
    try:
        teacher_id = get_jwt_identity()
        body = request.get_json() or {}
        reason = body.get("reason")
        result = reject_supervisor_request(teacher_id, request_id, reason=reason)
        return {"success": True, "message": result["message"], "data": result}, 200
    except ValueError as exc:
        return {"success": False, "message": str(exc)}, 400
    except Exception as exc:  # noqa: BLE001
        return {"success": False, "message": str(exc)}, 500
