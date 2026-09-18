# backend/app/schemas/auth_schema.py
"""
Marshmallow validation schemas for authentication endpoints.

These schemas enforce API-level validation (Check 1 in the data lifecycle)
so that invalid payloads are rejected before any database query is executed.
"""

from marshmallow import Schema, fields, validate, validates


class LoginSchema(Schema):
    """Validates the payload for POST /api/auth/login."""

    # Supports either email_or_roll or legacy email field
    email_or_roll = fields.Str(
        required=False,
        load_default=None,
    )
    email = fields.Str(
        required=False,
        load_default=None,
    )
    password = fields.Str(
        required=True,
        validate=validate.Length(min=1),
        error_messages={"required": "Password is required."},
    )

    @validates("password")
    def validate_identity(self, _):
        # Validation handled at load step or in route
        pass


class SetPasswordSchema(Schema):
    """Validates the payload for POST /api/auth/set-password."""

    token = fields.Str(
        required=True,
        validate=validate.Length(min=10),
        error_messages={"required": "Token is required."},
    )
    new_password = fields.Str(
        required=True,
        validate=validate.Length(
            min=6,
            error="New password must be at least 6 characters.",
        ),
        error_messages={"required": "New password is required."},
    )


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
