from flask import request, jsonify, Blueprint
from flask_jwt_extended import create_access_token
from app.extensions import mongo
from app.utils.responses import success_response, error_response
import bcrypt

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return error_response("Email and password required", 400)
    
    # Check in students collection
    user = mongo.db.students.find_one({"email": email})
    role = "student"
    
    if not user:
        # Check in teachers collection
        user = mongo.db.teachers.find_one({"email": email})
        role = "evaluator"
    
    if not user:
        return error_response("Invalid credentials", 401)
    
    # Verify password (for now, compare plaintext - add bcrypt later)
    if user.get('password') != password:
        return error_response("Invalid credentials", 401)
    
    # Create JWT token
    token = create_access_token(
        identity=str(user['_id']),
        additional_claims={
            "role": role,
            "email": user['email'],
            "name": user.get('name', 'User')
        }
    )
    
    return success_response(
        "Login successful",
        data={
            "token": token,
            "user": {
                "id": str(user['_id']),
                "name": user.get('name'),
                "email": user['email'],
                "role": role
            }
        }
    )