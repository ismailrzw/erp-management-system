# backend/app/blueprints/student/profile.py
"""
Student Profile API endpoints.

Routes
------
GET  /api/student/profile                  — get own profile
PUT  /api/student/profile                  — update name / recovery_email
POST /api/student/profile/change-password  — change password securely

Data lifecycle
--------------
  1. Raw JSON → Marshmallow schema → validated dict (HTTP 422 on error).
  2. Validated dict → service function → result dict or ValueError.
  3. ValueError → HTTP 400/401; uncaught → HTTP 500.

Security
--------
  - All endpoints require a valid JWT with role ``student``.
  - password_hash is NEVER returned in any response.
  - Immutable fields (roll, email, dept, section) cannot be changed via PUT.
  - change-password verifies the current password before writing a new hash.
"""

from flask import request
from flask_jwt_extended import get_jwt_identity
from flask_restx import Namespace, Resource, fields
from marshmallow import ValidationError

from app.models.user import Role
from app.schemas.group_schema import ChangePasswordSchema, UpdateProfileSchema
from app.services.student_profile_service import (
    change_password,
    get_profile,
    update_profile,
)
from app.utils.decorators import role_required

# ── Namespace ──────────────────────────────────────────────────────────────────
student_profile_ns = Namespace(
    "student_profile", description="Student profile management"
)

# ── Swagger request models ─────────────────────────────────────────────────────
update_profile_model = student_profile_ns.model("StudentProfileUpdate", {
    "name":           fields.String(description="Full name (2–100 chars)"),
    "recovery_email": fields.String(description="Optional personal/recovery email"),
})

change_password_model = student_profile_ns.model("StudentChangePassword", {
    "current_password": fields.String(required=True, description="Current password"),
    "new_password":     fields.String(required=True, description="New password (min 8 chars)"),
    "confirm_password": fields.String(required=True, description="Must match new_password"),
})


# ── Endpoints ──────────────────────────────────────────────────────────────────

@student_profile_ns.route("/")
class StudentProfile(Resource):

    @student_profile_ns.doc(security="Bearer Auth")
    @role_required(Role.STUDENT)
    def get(self):
        """Get the authenticated student's own profile."""
        student_id = get_jwt_identity()
        try:
            profile = get_profile(student_id)
            return {"success": True, "message": "Profile retrieved.", "data": profile}, 200
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 404
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500

    @student_profile_ns.doc(security="Bearer Auth")
    @student_profile_ns.expect(update_profile_model)
    @role_required(Role.STUDENT)
    def put(self):
        """Update own name and/or recovery email.  Roll, email, dept cannot be changed."""
        # Check 1 — schema validation
        try:
            validated = UpdateProfileSchema().load(request.get_json() or {})
        except ValidationError as exc:
            return {"success": False, "message": "Validation failed.", "errors": exc.messages}, 422

        student_id = get_jwt_identity()

        # Check 2 — service layer
        try:
            profile = update_profile(student_id, validated)
            return {"success": True, "message": "Profile updated.", "data": profile}, 200
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 400
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500


@student_profile_ns.route("/change-password")
class StudentChangePassword(Resource):

    @student_profile_ns.doc(security="Bearer Auth")
    @student_profile_ns.expect(change_password_model)
    @role_required(Role.STUDENT)
    def post(self):
        """Change the authenticated student's password.  Current password must be verified."""
        # Check 1 — schema validation
        try:
            validated = ChangePasswordSchema().load(request.get_json() or {})
        except ValidationError as exc:
            return {"success": False, "message": "Validation failed.", "errors": exc.messages}, 422

        student_id = get_jwt_identity()

        # Check 2 — service layer (verifies bcrypt hash before writing new one)
        try:
            result = change_password(
                student_id,
                validated["current_password"],
                validated["new_password"],
            )
            return {"success": True, "message": "Password changed successfully.", "data": result}, 200
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 401
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500
