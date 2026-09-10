# backend/app/utils/decorators.py
from functools import wraps

from flask_jwt_extended import get_jwt, verify_jwt_in_request


def role_required(*roles):
    """Decorator to restrict access to specific roles."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            
            token_role = get_jwt().get("role")
            if token_role not in roles:
                return {
                    "success": False,
                    "message": f"Access denied. Required role: {list(roles)}. Your role: {token_role}."
                }, 403
            
            return fn(*args, **kwargs)
        return wrapper
    return decorator