# backend/app/blueprints/auth/routes.py
"""Authentication routes."""

from datetime import datetime, timezone

import bcrypt
from bson import ObjectId
from flask import Blueprint, request
from flask_jwt_extended import (
    create_access_token,
    get_jwt,
    get_jwt_identity,
    verify_jwt_in_request,
)
from flask_restx import Namespace, Resource, fields

from app.extensions import mongo
from app.utils.responses import error_response, success_response

# ── Blueprint (for actual routing) ──────────────────────
auth_bp = Blueprint("auth", __name__)

# ── Namespace (for Swagger) ─────────────────────────────
auth_ns = Namespace("auth", description="Authentication operations")

# ── Swagger Models ──────────────────────────────────────
login_model = auth_ns.model("Login", {
    "email": fields.String(required=True, description="User email"),
    "password": fields.String(required=True, description="User password"),
})

change_password_model = auth_ns.model("ChangePassword", {
    "currentPassword": fields.String(required=True, description="Current password"),
    "newPassword": fields.String(required=True, description="New password"),
})


# ── Login Route ──────────────────────────────────────────
@auth_ns.route("/login")
class Login(Resource):
    @auth_ns.expect(login_model)
    def post(self):
        """Authenticate user and return JWT token."""
        data = request.get_json() or {}
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""

        if not email or not password:
            return error_response("Email and password are required.", 400)

        user = mongo.db.users.find_one({"email": email, "deleted": {"$ne": True}})

        if not user:
            return error_response("Invalid email or password.", 401)

        stored_hash = user.get("password_hash", "")
        try:
            password_matches = bcrypt.checkpw(
                password.encode("utf-8"),
                stored_hash.encode("utf-8")
            )
        except Exception:  # noqa: BLE001 - malformed stored hashes must be treated as failed authentication
            password_matches = False

        if not password_matches:
            return error_response("Invalid email or password.", 401)

        token = create_access_token(
            identity=str(user["_id"]),
            additional_claims={
                "role": user["role"],
                "dept": user.get("dept"),
                "section": user.get("section"),
                "course": user.get("course"),
                "name": user.get("name", "User"),
                "email": user["email"],
            }
        )

        return success_response("Login successful.", data={
            "token": token,
            "user": {
                "id": str(user["_id"]),
                "name": user.get("name"),
                "email": user["email"],
                "role": user["role"],
                "dept": user.get("dept"),
            }
        })


# ── Get Current User Route ──────────────────────────────
@auth_ns.route("/me")
class Me(Resource):
    @auth_ns.doc(security="Bearer Auth")
    def get(self):
        """Get current user info from JWT token."""
        verify_jwt_in_request()
        claims = get_jwt()
        user_id = get_jwt_identity()
        return success_response("User data retrieved.", data={
            "id": user_id,
            "name": claims.get("name"),
            "email": claims.get("email"),
            "role": claims.get("role"),
            "dept": claims.get("dept"),
        })


# ── Change Password Route ──────────────────────────────
@auth_ns.route("/change-password")
class ChangePassword(Resource):
    @auth_ns.doc(security="Bearer Auth")
    @auth_ns.expect(change_password_model)
    def post(self):
        """Change current user's password."""
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        data = request.get_json() or {}

        current_password = data.get("currentPassword", "")
        new_password = data.get("newPassword", "")

        if not current_password or not new_password:
            return error_response("currentPassword and newPassword are required.", 400)

        if len(new_password) < 6:
            return error_response("New password must be at least 6 characters.", 400)

        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return error_response("User not found.", 404)

        if not bcrypt.checkpw(current_password.encode(), user["password_hash"].encode()):
            return error_response("Current password is incorrect.", 400)

        new_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
        mongo.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"password_hash": new_hash, "updated_at": datetime.now(timezone.utc)}}
        )
        return success_response("Password changed successfully.")


# ── Also Register Blueprint Routes (for non-Swagger) ──
# These are optional but keep for compatibility
@auth_bp.route("/login", methods=["POST"])
def login_bp():
    """Blueprint version of login."""
    return Login().post()

@auth_bp.route("/me", methods=["GET"])
def me_bp():
    """Blueprint version of /me."""
    return Me().get()

@auth_bp.route("/change-password", methods=["POST"])
def change_password_bp():
    """Blueprint version of change-password."""
    return ChangePassword().post()
