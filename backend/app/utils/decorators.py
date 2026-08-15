# backend/app/utils/decorators.py
from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt

def role_required(*allowed_roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
                claims = get_jwt()
                user_role = claims.get("role")
                
                if not user_role or user_role not in allowed_roles:
                    return jsonify({
                        "success": False,
                        "error": "Access denied"
                    }), 403
                
                return fn(*args, **kwargs)
            except Exception:
                return jsonify({
                    "success": False,
                    "error": "Authentication required"
                }), 401
        return wrapper
    return decorator