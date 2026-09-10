# backend/app/schemas/auth_schema.py
"""
Marshmallow validation schemas for authentication endpoints.

These schemas enforce API-level validation (Check 1 in the data lifecycle)
so that invalid payloads are rejected before any database query is executed.
"""

from marshmallow import Schema, fields, validate, validates


class LoginSchema(Schema):
    """Validates the payload for POST /api/auth/login."""

    email = fields.Email(
        required=True,
        error_messages={"required": "Email is required.", "null": "Email must not be null."},
    )
    password = fields.Str(
        required=True,
        validate=validate.Length(min=1),
        error_messages={"required": "Password is required."},
    )

    @validates("email")
    def normalise_email(self, value: str) -> str:
        """Lowercase and strip the email so the service layer receives a clean value."""
        return value.strip().lower()


class ChangePasswordSchema(Schema):
    """Validates the payload for POST /api/auth/change-password."""

    currentPassword = fields.Str(
        required=True,
        validate=validate.Length(min=1),
        error_messages={"required": "currentPassword is required."},
    )
    newPassword = fields.Str(
        required=True,
        validate=validate.Length(
            min=6,
            error="New password must be at least 6 characters.",
        ),
        error_messages={"required": "newPassword is required."},
    )

    @validates("newPassword")
    def new_password_not_same_field(self, value: str) -> None:
        """Placeholder hook — extend here for 'must differ from current' logic."""
        # Currently a no-op; validation is purely length-based at the schema layer.
