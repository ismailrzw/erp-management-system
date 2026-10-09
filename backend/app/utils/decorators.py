# backend/app/utils/decorators.py
from functools import wraps

from bson import ObjectId
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request

from app.extensions import mongo
from app.services.academic_integrity_service import AcademicConflict


def role_required(*roles):
    """Decorator to restrict access to specific roles."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()

            token_role = get_jwt().get("role")
            identity = get_jwt_identity()
            user = mongo.db.users.find_one({"_id": ObjectId(identity), "deleted": {"$ne": True}}) if ObjectId.is_valid(str(identity)) else None
            if not user or user.get("role") != token_role:
                return {"success": False, "message": "Your account/session changed. Sign in again."}, 401
            if token_role not in roles:
                return {
                    "success": False,
                    "message": f"Access denied. Required role: {list(roles)}. Your role: {token_role}."
                }, 403

            try:
                return fn(*args, **kwargs)
            except AcademicConflict as exc:
                return {"success": False, "message": str(exc)}, 409
        return wrapper
    return decorator
