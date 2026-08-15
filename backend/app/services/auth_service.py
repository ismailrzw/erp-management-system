# backend/app/services/auth_service.py
"""
Auth Service - Business logic for authentication
"""
from flask import current_app
from flask_jwt_extended import create_access_token
from datetime import timedelta
from bson.objectid import ObjectId  # ← THIS WAS MISSING!
from app.extensions import mongo
from app.models.user import UserFields, verify_password
import bcrypt


class AuthService:
    """Service for authentication operations."""
    
    @staticmethod
    def authenticate_user(email: str, password: str):
        """
        Authenticate a user with email and password.
        
        Returns:
            dict: User data and token if successful
            None: If authentication fails
        """
        try:
            # Find user
            user = mongo.db.users.find_one({
                UserFields.EMAIL: email,
                UserFields.DELETED: False
            })
            
            if not user:
                return None
            
            # Verify password
            stored_hash = user.get(UserFields.PASSWORD_HASH)
            if not stored_hash or not verify_password(password, stored_hash):
                return None
            
            # Generate token
            token = create_access_token(
                identity=str(user['_id']),
                additional_claims={
                    "role": user.get(UserFields.ROLE),
                    "email": user.get(UserFields.EMAIL),
                    "name": user.get(UserFields.NAME)
                },
                expires_delta=timedelta(hours=8)
            )
            
            return {
                "token": token,
                "user": {
                    "id": str(user['_id']),
                    "name": user.get(UserFields.NAME),
                    "email": user.get(UserFields.EMAIL),
                    "role": user.get(UserFields.ROLE)
                }
            }
            
        except Exception as e:
            current_app.logger.error(f"Authentication error: {str(e)}")
            return None
    
    @staticmethod
    def get_user_by_id(user_id: str):
        """Get user by ID. Returns dict or None."""
        try:
            # Convert string to ObjectId
            user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return None
            
            return {
                "id": str(user['_id']),
                "name": user.get(UserFields.NAME),
                "email": user.get(UserFields.EMAIL),
                "role": user.get(UserFields.ROLE)
            }
        except Exception as e:
            current_app.logger.error(f"Get user error: {str(e)}")
            return None
    
    @staticmethod
    def get_user_by_email(email: str):
        """Get user by email. Returns dict or None."""
        try:
            user = mongo.db.users.find_one({
                UserFields.EMAIL: email,
                UserFields.DELETED: False
            })
            if not user:
                return None
            
            return {
                "id": str(user['_id']),
                "name": user.get(UserFields.NAME),
                "email": user.get(UserFields.EMAIL),
                "role": user.get(UserFields.ROLE)
            }
        except Exception as e:
            current_app.logger.error(f"Get user by email error: {str(e)}")
            return None
    
    @staticmethod
    def change_password(user_id: str, current_password: str, new_password: str):
        """
        Change user password.
        
        Returns:
            tuple: (success: bool, message: str)
        """
        try:
            user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return False, "User not found"
            
            # Verify current password
            stored_hash = user.get(UserFields.PASSWORD_HASH)
            if not stored_hash or not verify_password(current_password, stored_hash):
                return False, "Current password is incorrect"
            
            # Hash new password
            new_hash = bcrypt.hashpw(
                new_password.encode('utf-8'),
                bcrypt.gensalt()
            ).decode('utf-8')
            
            # Update password
            mongo.db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {UserFields.PASSWORD_HASH: new_hash}}
            )
            
            return True, "Password changed successfully"
            
        except Exception as e:
            current_app.logger.error(f"Change password error: {str(e)}")
            return False, "Failed to change password"