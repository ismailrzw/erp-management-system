# backend/app/blueprints/auth/routes.py
from flask import request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_restx import Namespace, Resource, fields

from app.services.auth_service import AuthService
from app.utils.responses import success_response, error_response

auth_ns = Namespace('auth', description='Authentication operations')

login_model = auth_ns.model('Login', {
    'email': fields.String(required=True, example='zamanaziz@bnu.edu.pk'),
    'password': fields.String(required=True, example='11223344')
})

change_password_model = auth_ns.model('ChangePassword', {
    'current_password': fields.String(required=True),
    'new_password': fields.String(required=True, min_length=8)
})

@auth_ns.route('/login')
class LoginResource(Resource):
    @auth_ns.expect(login_model)
    @auth_ns.response(200, 'Success')
    @auth_ns.response(400, 'Bad Request')
    @auth_ns.response(401, 'Unauthorized')
    def post(self):
        try:
            data = request.get_json()
            if not data:
                return error_response("Missing request body", 400)
            
            email = data.get('email')
            password = data.get('password')
            if not email or not password:
                return error_response("Email and password required", 400)
            
            result = AuthService.authenticate_user(email, password)
            if not result:
                return error_response("Invalid credentials", 401)
            
            return success_response("Login successful", data=result)
        except Exception as e:
            current_app.logger.error(f"Login error: {str(e)}")
            return error_response("Internal server error.", 500)


@auth_ns.route('/me')
class MeResource(Resource):
    @jwt_required()  # ✅ Add this!
    @auth_ns.doc(security='Bearer Auth')
    @auth_ns.response(200, 'Success')
    @auth_ns.response(401, 'Unauthorized')
    @auth_ns.response(404, 'Not Found')
    def get(self):
        try:
            user_id = get_jwt_identity()
            user = AuthService.get_user_by_id(user_id)
            if not user:
                return error_response("User not found", 404)
            return success_response("User data retrieved", data=user)
        except Exception as e:
            current_app.logger.error(f"Get user error: {str(e)}")
            return error_response("Failed to get user data", 500)


@auth_ns.route('/change-password')
class ChangePasswordResource(Resource):
    @jwt_required()  # ✅ Add this!
    @auth_ns.doc(security='Bearer Auth')
    @auth_ns.expect(change_password_model)
    @auth_ns.response(200, 'Password changed successfully')
    @auth_ns.response(400, 'Bad Request')
    @auth_ns.response(401, 'Unauthorized')
    def post(self):
        try:
            data = request.get_json()
            if not data:
                return error_response("Missing request body", 400)
            
            current_password = data.get('current_password')
            new_password = data.get('new_password')
            if not current_password or not new_password:
                return error_response("Current and new password required", 400)
            if len(new_password) < 8:
                return error_response("New password must be at least 8 characters", 400)
            
            user_id = get_jwt_identity()
            success, message = AuthService.change_password(
                user_id, current_password, new_password
            )
            if not success:
                return error_response(message, 401)
            return success_response(message)
        except Exception as e:
            current_app.logger.error(f"Change password error: {str(e)}")
            return error_response("Failed to change password", 500)