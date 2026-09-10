# backend/app/services/user_service.py
"""
User Service — general user management operations.

Note: For authentication-specific operations (login, change-password, get
by email for auth purposes) see ``auth_service.py``.  This service handles
lower-level user CRUD that may be shared across different roles.
"""
from datetime import datetime, timezone

from bson.objectid import ObjectId
from flask import current_app

from app.extensions import mongo
from app.models.user import UserFields, hash_password


class UserService:
    """Service for general user management operations."""

    @staticmethod
    def create_user(name: str, email: str, password: str, role: str, **kwargs) -> tuple[dict | None, str | None]:
        """
        Create a new user in the ``users`` collection.

        Returns
        -------
        tuple[dict | None, str | None]
            ``(user_data, None)`` on success.
            ``(None, error_message)`` on failure.
        """
        try:
            existing = mongo.db.users.find_one({UserFields.EMAIL: email})
            if existing:
                return None, "User with this email already exists."

            hashed = hash_password(password)

            user_data = {
                UserFields.NAME:          name,
                UserFields.EMAIL:         email,
                UserFields.PASSWORD_HASH: hashed,
                UserFields.ROLE:          role,
                UserFields.DELETED:       False,
                UserFields.CREATED_AT:    datetime.now(timezone.utc),
                UserFields.UPDATED_AT:    datetime.now(timezone.utc),
                **kwargs,
            }

            result = mongo.db.users.insert_one(user_data)

            return {
                "id":    str(result.inserted_id),
                "name":  name,
                "email": email,
                "role":  role,
            }, None

        except (ValueError, TypeError) as exc:
            current_app.logger.error("Invalid user data: %s", exc)
            return None, f"Invalid user data: {exc!s}"
        except Exception as exc:  # noqa: BLE001
            current_app.logger.error("Create user error: %s", exc)
            return None, str(exc)

    @staticmethod
    def get_user_by_email(email: str) -> dict | None:
        """Return a safe user dict (no password_hash) by email, or None."""
        try:
            user = mongo.db.users.find_one({
                UserFields.EMAIL: email,
                UserFields.DELETED: False,
            })
            if not user:
                return None
            return {
                "id":    str(user["_id"]),
                "name":  user.get(UserFields.NAME),
                "email": user.get(UserFields.EMAIL),
                "role":  user.get(UserFields.ROLE),
            }
        except (ValueError, TypeError) as exc:
            current_app.logger.error("Invalid email format: %s", exc)
            return None
        except Exception as exc:  # noqa: BLE001
            current_app.logger.error("Get user error: %s", exc)
            return None

    @staticmethod
    def delete_user(user_id: str) -> bool:
        """Soft-delete a user by ID.  Returns True if the document was modified."""
        try:
            result = mongo.db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {
                    UserFields.DELETED:    True,
                    UserFields.DELETED_AT: datetime.now(timezone.utc),
                    UserFields.UPDATED_AT: datetime.now(timezone.utc),
                }},
            )
            return result.modified_count > 0
        except (ValueError, TypeError) as exc:
            current_app.logger.error("Invalid user ID: %s", exc)
            return False
        except Exception as exc:  # noqa: BLE001
            current_app.logger.error("Delete user error: %s", exc)
            return False