# backend/app/services/user_service.py
"""
User Service - Business logic for user management
"""
from flask import current_app
from app.extensions import mongo
from app.models.user import UserFields, Role, hash_password


class UserService:
    """Service for user management operations."""
    
    @staticmethod
    def create_user(name: str, email: str, password: str, role: str, **kwargs):
        """
        Create a new user.
        
        Returns:
            dict: Created user data
            None: If creation fails
        """
        try:
            # Check if user exists
            existing = mongo.db.users.find_one({UserFields.EMAIL: email})
            if existing:
                return None, "User with this email already exists"
            
            # Hash password
            hashed = hash_password(password)
            
            # Create user document
            user_data = {
                UserFields.NAME: name,
                UserFields.EMAIL: email,
                UserFields.PASSWORD_HASH: hashed,
                UserFields.ROLE: role,
                UserFields.DELETED: False,
                **kwargs
            }
            
            result = mongo.db.users.insert_one(user_data)
            
            return {
                "id": str(result.inserted_id),
                "name": name,
                "email": email,
                "role": role
            }, None
            
        except Exception as e:
            current_app.logger.error(f"Create user error: {str(e)}")
            return None, str(e)
    
    @staticmethod
    def get_user_by_email(email: str):
        """Get user by email."""
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
            current_app.logger.error(f"Get user error: {str(e)}")
            return None
    
    @staticmethod
    def delete_user(user_id: str):
        """Soft delete a user."""
        try:
            result = mongo.db.users.update_one(
                {"_id": user_id},
                {"$set": {UserFields.DELETED: True}}
            )
            return result.modified_count > 0
        except Exception as e:
            current_app.logger.error(f"Delete user error: {str(e)}")
            return False