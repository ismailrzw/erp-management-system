# backend/app/services/auth_service.py
"""
Auth Service — business logic for authentication.

This is the *only* place in the codebase that:
  1. Queries the database for user credentials
  2. Verifies passwords using bcrypt
  3. Creates JWT access tokens

Both the auth blueprint and any future API consumers must delegate here
rather than performing these operations inline.
"""
import re
from datetime import datetime, timedelta, timezone

from bson.objectid import ObjectId
from flask import current_app
from flask_jwt_extended import create_access_token

from app.extensions import mongo
from app.models.announcement import AnnouncementFields, AnnouncementViewFields
from app.models.user import Role, UserFields, verify_password

# Access-token lifetime — all tokens issued by this service expire in 8 hours.
_TOKEN_EXPIRES = timedelta(hours=8)


class AuthService:
    """Service for authentication and credential-management operations."""

    @staticmethod
    def authenticate_user(email: str, password: str) -> dict | None:
        """
        Authenticate a user by email and password.

        Parameters
        ----------
        email : str
            Email address (handled case-insensitively).
        password : str
            Plaintext password from the request payload.

        Returns
        -------
        dict
            ``{"token": str, "user": {id, name, email, role, dept}}``
            on success.
        None
            On any authentication failure (user not found, wrong password,
            deleted account, DB error).  The caller must return 401.
        """
        try:
            clean_email = email.strip()
            user = mongo.db.users.find_one({
                UserFields.EMAIL: {"$regex": f"^{re.escape(clean_email)}$", "$options": "i"},
                UserFields.DELETED: {"$ne": True},
            })

            if not user:
                return None

            stored_hash = user.get(UserFields.PASSWORD_HASH, "")
            if not stored_hash or not verify_password(password, stored_hash):
                return None

            token = create_access_token(
                identity=str(user["_id"]),
                additional_claims={
                    "role":    user.get(UserFields.ROLE),
                    "dept":    user.get(UserFields.DEPT),
                    "section": user.get(UserFields.SECTION),
                    "course":  user.get(UserFields.COURSE),
                    "name":    user.get(UserFields.NAME, "User"),
                    "email":   user.get(UserFields.EMAIL),
                },
                expires_delta=_TOKEN_EXPIRES,
            )

            # Record login session history and update recent announcements for students
            now = datetime.now(timezone.utc)
            user_id = user["_id"]
            user_role = user.get(UserFields.ROLE)

            prev_login = user.get(UserFields.CURRENT_LOGIN_AT) or user.get(UserFields.LAST_LOGIN_AT)
            update_fields = {
                UserFields.LAST_LOGIN_AT: prev_login or now,
                UserFields.CURRENT_LOGIN_AT: now,
            }
            update_op = {"$set": update_fields}

            if user_role == Role.STUDENT:
                threshold = prev_login if prev_login else (now - timedelta(days=7))
                new_ann_cursor = mongo.db[AnnouncementFields.COLLECTION].find(
                    {
                        "$or": [
                            {AnnouncementFields.CREATED_AT: {"$gt": threshold}},
                            {AnnouncementFields.DATE: {"$gt": threshold.isoformat()}},
                        ]
                    },
                    {AnnouncementFields.ID: 1}
                )
                candidate_ids = [doc[AnnouncementFields.ID] for doc in new_ann_cursor]

                if candidate_ids:
                    viewed_docs = mongo.db[AnnouncementViewFields.COLLECTION].find(
                        {
                            AnnouncementViewFields.USER_ID: user_id,
                            AnnouncementViewFields.ANNOUNCEMENT_ID: {"$in": candidate_ids},
                        },
                        {AnnouncementViewFields.ANNOUNCEMENT_ID: 1}
                    )
                    viewed_ids = {v[AnnouncementViewFields.ANNOUNCEMENT_ID] for v in viewed_docs}
                    unviewed_recent_ids = [cid for cid in candidate_ids if cid not in viewed_ids]

                    if unviewed_recent_ids:
                        update_op["$addToSet"] = {
                            UserFields.RECENT_ANNOUNCEMENTS: {"$each": unviewed_recent_ids}
                        }

            try:
                mongo.db.users.update_one({"_id": user_id}, update_op)
            except Exception as update_err:  # noqa: BLE001
                current_app.logger.warning("Failed to update user login state: %s", update_err)

            return {
                "token": token,
                "user": {
                    "id":    str(user["_id"]),
                    "name":  user.get(UserFields.NAME),
                    "email": user.get(UserFields.EMAIL),
                    "role":  user.get(UserFields.ROLE),
                    "dept":  user.get(UserFields.DEPT),
                },
            }

        except (ValueError, TypeError, KeyError) as exc:
            current_app.logger.error("Authentication data error: %s", exc)
            return None
        except Exception as exc:  # noqa: BLE001
            current_app.logger.error("Authentication error: %s", exc)
            return None

    @staticmethod
    def get_user_by_id(user_id: str) -> dict | None:
        """Return a safe user dict (no password_hash) by MongoDB ObjectId, or None."""
        try:
            user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return None
            return {
                "id":    str(user["_id"]),
                "name":  user.get(UserFields.NAME),
                "email": user.get(UserFields.EMAIL),
                "role":  user.get(UserFields.ROLE),
            }
        except (ValueError, TypeError) as exc:
            current_app.logger.error("Invalid user ID format: %s", exc)
            return None
        except Exception as exc:  # noqa: BLE001
            current_app.logger.error("Get user error: %s", exc)
            return None

    @staticmethod
    def get_user_by_email(email: str) -> dict | None:
        """Return a safe user dict by email, or None."""
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
            current_app.logger.error("Get user by email error: %s", exc)
            return None

    @staticmethod
    def change_password(user_id: str, current_password: str, new_password: str) -> tuple[bool, str]:
        """
        Change a user's password after verifying the current one.

        Returns
        -------
        tuple[bool, str]
            ``(True, "Password changed successfully")`` on success.
            ``(False, <reason>)`` on failure.
        """
        from datetime import datetime, timezone

        import bcrypt

        try:
            user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return False, "User not found."

            stored_hash = user.get(UserFields.PASSWORD_HASH, "")
            if not stored_hash or not verify_password(current_password, stored_hash):
                return False, "Current password is incorrect."

            new_hash = bcrypt.hashpw(
                new_password.encode("utf-8"),
                bcrypt.gensalt(),
            ).decode("utf-8")

            mongo.db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {
                    UserFields.PASSWORD_HASH: new_hash,
                    UserFields.UPDATED_AT: datetime.now(timezone.utc),
                }},
            )
            return True, "Password changed successfully."

        except (ValueError, TypeError) as exc:
            current_app.logger.error("Invalid password data: %s", exc)
            return False, "Invalid user ID format."
        except Exception as exc:  # noqa: BLE001
            current_app.logger.error("Change password error: %s", exc)
            return False, "Failed to change password."