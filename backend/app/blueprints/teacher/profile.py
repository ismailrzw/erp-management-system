# backend/app/blueprints/teacher/profile.py
"""
Teacher Profile & Expertise Domains Endpoints.
"""

from flask import request
from flask_jwt_extended import get_jwt_identity

from app.blueprints.teacher import teacher_bp
from app.models.user import Role
from app.services.supervisor_service import update_evaluator_domains
from app.services.teacher_service import get_teacher_by_id
from app.utils.decorators import role_required


@teacher_bp.route("/profile", methods=["GET"], strict_slashes=False)
@teacher_bp.route("/profile/", methods=["GET"], strict_slashes=False)
@role_required(Role.TEACHER)
def get_teacher_profile():
    """Get the profile of the logged-in teacher."""
    try:
        teacher_id = get_jwt_identity()
        teacher = get_teacher_by_id(teacher_id)
        if not teacher:
            return {"success": False, "message": "Teacher not found."}, 404
        return {"success": True, "message": "Teacher profile retrieved.", "data": teacher}, 200
    except Exception as exc:  # noqa: BLE001
        return {"success": False, "message": str(exc)}, 500


@teacher_bp.route("/profile/domains", methods=["PUT"], strict_slashes=False)
@role_required(Role.TEACHER)
def update_profile_domains():
    """Update expertise domains for the current teacher/supervisor."""
    try:
        teacher_id = get_jwt_identity()
        body = request.get_json() or {}
        domains = body.get("domains", [])
        if not isinstance(domains, list):
            return {"success": False, "message": "domains must be an array of strings."}, 400

        result = update_evaluator_domains(teacher_id, domains)
        return {"success": True, "message": "Domains updated successfully.", "data": result}, 200
    except ValueError as exc:
        return {"success": False, "message": str(exc)}, 400
    except Exception as exc:  # noqa: BLE001
        return {"success": False, "message": str(exc)}, 500
