# backend/app/utils/jwt_handlers.py
"""
JWT error handlers for Flask-JWT-Extended.
"""
from flask import jsonify


def register_jwt_handlers(jwt_manager):
    """Register custom JWT error handlers."""

    @jwt_manager.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({
            "success": False,
            "message": "Authorization header is missing or invalid",
            "error": str(error)
        }), 401

    @jwt_manager.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({
            "success": False,
            "message": "Invalid token",
            "error": str(error)
        }), 401

    @jwt_manager.expired_token_loader
    def expired_token_callback(jwt_header, jwt_data):
        return jsonify({
            "success": False,
            "message": "Token has expired",
            "error": "expired_token"
        }), 401

    @jwt_manager.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_data):
        return jsonify({
            "success": False,
            "message": "Token has been revoked",
            "error": "revoked_token"
        }), 401