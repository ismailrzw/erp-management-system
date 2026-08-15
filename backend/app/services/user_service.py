# backend/app/services/user_service.py
"""
User Service - Business logic for user management
"""
from bson.objectid import ObjectId
from flask import current_app

from app.extensions import mongo
from app.models.user import UserFields, hash_password


class UserService:
    """Service for user management operations."""
    
    @staticmethod
    def create_user(name: str, email: str, password: str, role: str, **kwargs):
        """
        Create a new user.
        
        Returns:
            tuple: (created_user_data, error_message)
        """
        try:
            existing = mongo.db.users.find_one({UserFields.EMAIL: email})
            if existing:
                return None, "User with this email already exists"
            
            hashed = hash_password(password)
            
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
            
        except (ValueError, TypeError) as e:
            current_app.logger.error(f"Invalid user data: {e!s}")
            return None, f"Invalid user data: {e!s}"
        except Exception as e:  # noqa: BLE001
            current_app.logger.error(f"Create user error: {e!s}")
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
        except (ValueError, TypeError) as e:
            current_app.logger.error(f"Invalid email format: {e!s}")
            return None
        except Exception as e:  # noqa: BLE001
            current_app.logger.error(f"Get user error: {e!s}")
            return None
    
    @staticmethod
    def delete_user(user_id: str):
        """Soft delete a user."""
        try:
            result = mongo.db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {UserFields.DELETED: True}}
            )
            return result.modified_count > 0
        except (ValueError, TypeError) as e:
            current_app.logger.error(f"Invalid user ID: {e!s}")
            return False
        except Exception as e:  # noqa: BLE001
            current_app.logger.error(f"Delete user error: {e!s}")
            return False