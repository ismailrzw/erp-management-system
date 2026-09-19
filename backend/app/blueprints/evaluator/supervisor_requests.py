# backend/app/blueprints/evaluator/supervisor_requests.py
"""
Evaluator Supervisor Requests & Domains Endpoints.
"""

from flask import request
from flask_jwt_extended import get_jwt_identity

from app.blueprints.evaluator import evaluator_bp
from app.models.user import Role
from app.services.supervisor_service import (
    accept_supervisor_request,
    get_evaluator_active_count,
    list_evaluator_supervisor_requests,
    reject_supervisor_request,
    update_evaluator_domains,
)
from app.utils.decorators import role_required


@evaluator_bp.route("/supervisor-requests", methods=["GET"], strict_slashes=False)
@evaluator_bp.route("/supervisor-requests/", methods=["GET"], strict_slashes=False)
@role_required(Role.EVALUATOR)
def get_incoming_supervisor_requests():
    """List pending supervisor requests directed to the logged-in evaluator."""
    try:
        evaluator_id = get_jwt_identity()
        items = list_evaluator_supervisor_requests(evaluator_id)
        active_count = get_evaluator_active_count(evaluator_id)

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


@evaluator_bp.route("/supervisor-requests/<string:request_id>/accept", methods=["POST"], strict_slashes=False)
@role_required(Role.EVALUATOR)
def accept_request(request_id):
    """Accept an incoming supervisor request."""
    try:
        evaluator_id = get_jwt_identity()
        result = accept_supervisor_request(evaluator_id, request_id)
        return {"success": True, "message": result["message"], "data": result}, 200
    except ValueError as exc:
        return {"success": False, "message": str(exc)}, 400
    except Exception as exc:  # noqa: BLE001
        return {"success": False, "message": str(exc)}, 500


@evaluator_bp.route("/supervisor-requests/<string:request_id>/reject", methods=["POST"], strict_slashes=False)
@role_required(Role.EVALUATOR)
def reject_request(request_id):
    """Reject an incoming supervisor request."""
    try:
        evaluator_id = get_jwt_identity()
        body = request.get_json() or {}
        reason = body.get("reason")
        result = reject_supervisor_request(evaluator_id, request_id, reason=reason)
        return {"success": True, "message": result["message"], "data": result}, 200
    except ValueError as exc:
        return {"success": False, "message": str(exc)}, 400
    except Exception as exc:  # noqa: BLE001
        return {"success": False, "message": str(exc)}, 500


@evaluator_bp.route("/profile/domains", methods=["PUT"], strict_slashes=False)
@role_required(Role.EVALUATOR)
def update_profile_domains():
    """Update expertise domains for the current evaluator."""
    try:
        evaluator_id = get_jwt_identity()
        body = request.get_json() or {}
        domains = body.get("domains", [])
        if not isinstance(domains, list):
            return {"success": False, "message": "domains must be an array of strings."}, 400

        result = update_evaluator_domains(evaluator_id, domains)
        return {"success": True, "message": "Domains updated successfully.", "data": result}, 200
    except ValueError as exc:
        return {"success": False, "message": str(exc)}, 400
    except Exception as exc:  # noqa: BLE001
        return {"success": False, "message": str(exc)}, 500
