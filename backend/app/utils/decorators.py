# backend/app/utils/decorators.py
from functools import wraps

import jwt
from flask import current_app, jsonify
from flask_jwt_extended import get_jwt, verify_jwt_in_request
from flask_jwt_extended.exceptions import JWTExtendedException


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
            except JWTExtendedException as e:
                current_app.logger.error(f"JWT error: {e!s}")
                return jsonify({
                    "success": False,
                    "error": str(e)
                }), 401
            except (jwt.InvalidTokenError, jwt.ExpiredSignatureError) as e:
                current_app.logger.error(f"Token error: {e!s}")
                return jsonify({
                    "success": False,
                    "error": "Invalid or expired token"
                }), 401
            except Exception as e:  # noqa: BLE001
                current_app.logger.error(f"Authentication error: {e!s}")
                return jsonify({
                    "success": False,
                    "error": "Authentication required"
                }), 401
        return wrapper
    return decorator