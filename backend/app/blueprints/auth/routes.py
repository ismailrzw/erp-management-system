# backend/app/blueprints/auth/routes.py
"""
Authentication routes.

Data lifecycle enforced here:
  1. Request arrives at the endpoint.
  2. Schema (LoginSchema / ChangePasswordSchema) validates the raw JSON body.
     Malformed payloads are rejected with HTTP 400 before any DB query.
  3. The validated dict is passed to AuthService, which queries MongoDB,
     verifies passwords, and issues JWT tokens.
  4. The response is assembled from the service's return value — no raw
     DB documents are ever returned to the client.
"""

from flask import Blueprint, request
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request
from flask_restx import Namespace, Resource, fields
from marshmallow import ValidationError

from app.schemas.auth_schema import ChangePasswordSchema, LoginSchema
from app.services.auth_service import AuthService
from app.utils.responses import error_response, success_response

# ── Blueprint (for classical Flask routing) ─────────────────
auth_bp = Blueprint("auth", __name__)

# ── Namespace (for Swagger / Flask-RESTx) ──────────────────
auth_ns = Namespace("auth", description="Authentication operations")

# ── Swagger request-body models (documentation only) ────────
_login_swagger = auth_ns.model("Login", {
    "email":    fields.String(required=True, description="User email address"),
    "password": fields.String(required=True, description="User password"),
})

_change_password_swagger = auth_ns.model("ChangePassword", {
    "currentPassword": fields.String(required=True, description="Current password"),
    "newPassword":     fields.String(required=True, description="New password (min 6 chars)"),
})


# ── Login ───────────────────────────────────────────────────
@auth_ns.route("/login")
class Login(Resource):
    @auth_ns.expect(_login_swagger)
    def post(self):
        """Authenticate user and return a signed JWT access token."""
        # Check 1 — schema validation
        try:
            payload = LoginSchema().load(request.get_json() or {})
        except ValidationError as exc:
            return error_response("Validation failed.", 400, errors=exc.messages)

        # Check 2 — service-layer authentication (queries DB, verifies hash)
        result = AuthService.authenticate_user(payload["email"], payload["password"])
        if result is None:
            return error_response("Invalid email or password.", 401)

        return success_response("Login successful.", data=result)


# ── Current user (JWT introspection) ────────────────────────
@auth_ns.route("/me")
class Me(Resource):
    @auth_ns.doc(security="Bearer Auth")
    def get(self):
        """Return the current user's identity from the JWT claims."""
        verify_jwt_in_request()
        claims  = get_jwt()
        user_id = get_jwt_identity()
        return success_response("User data retrieved.", data={
            "id":    user_id,
            "name":  claims.get("name"),
            "email": claims.get("email"),
            "role":  claims.get("role"),
            "dept":  claims.get("dept"),
        })


# ── Change password ─────────────────────────────────────────
@auth_ns.route("/change-password")
class ChangePassword(Resource):
    @auth_ns.doc(security="Bearer Auth")
    @auth_ns.expect(_change_password_swagger)
    def post(self):
        """Change the current user's password (requires valid JWT)."""
        verify_jwt_in_request()
        user_id = get_jwt_identity()

        # Check 1 — schema validation (min-length enforced here, not inline)
        try:
            payload = ChangePasswordSchema().load(request.get_json() or {})
        except ValidationError as exc:
            return error_response("Validation failed.", 400, errors=exc.messages)

        # Check 2 — service verifies current password before updating
        success, message = AuthService.change_password(
            user_id,
            payload["currentPassword"],
            payload["newPassword"],
        )
        if not success:
            return error_response(message, 400)

        return success_response(message)


# ── Blueprint shadow routes (backward compatibility) ────────
# These allow the endpoints to be reachable via the Flask Blueprint as well
# as the Flask-RESTx Namespace.  Both hit the same Resource handler.

@auth_bp.route("/login", methods=["POST"])
def login_bp():
    """Blueprint version of POST /api/auth/login."""
    return Login().post()


@auth_bp.route("/me", methods=["GET"])
def me_bp():
    """Blueprint version of GET /api/auth/me."""
    return Me().get()


@auth_bp.route("/change-password", methods=["POST"])
def change_password_bp():
    """Blueprint version of POST /api/auth/change-password."""
    return ChangePassword().post()
