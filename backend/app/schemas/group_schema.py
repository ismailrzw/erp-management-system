# backend/app/schemas/group_schema.py
"""
Marshmallow validation schemas for student group and invitation operations.

Data lifecycle
--------------
1. Raw JSON body arrives at the blueprint endpoint.
2. The appropriate Schema().load() is called — raises ValidationError
   (→ HTTP 422) if any field violates its rules.
3. The clean, typed dict is forwarded to the service layer.

Nothing in this module touches MongoDB; it is a pure validation boundary.
"""

from marshmallow import (
    Schema,
    ValidationError,
    fields,
    pre_load,
    validate,
    validates,
    validates_schema,
)

# ── Group schemas ──────────────────────────────────────────────────────────────


class CreateGroupSchema(Schema):
    """Project identity is assigned by the backend."""
    project_title = fields.Str(required=True, validate=validate.Length(min=3, max=150))


class UpdateGroupSchema(Schema):
    """Only proposal content and an optimistic version may be edited."""
    project_title = fields.Str(validate=validate.Length(min=3, max=150))
    scope = fields.Str(validate=validate.Length(max=20000))
    expected_version = fields.Int()


# ── Invitation schemas ─────────────────────────────────────────────────────────


class InviteMemberSchema(Schema):
    """Validate the payload when a leader sends a group invitation."""

    roll = fields.Str(
        required=True,
        validate=validate.Length(min=3, max=30),
        metadata={"description": "Roll number of the student to invite."},
    )

    @validates("roll")
    def roll_no_spaces(self, value: str) -> None:
        if " " in value:
            raise ValidationError("Roll number must not contain spaces.")


# ── Profile / password schemas ─────────────────────────────────────────────────


class UpdateProfileSchema(Schema):
    """Validate the payload when a student updates their own profile."""

    recovery_email = fields.Email(
        allow_none=True,
        metadata={"description": "Optional recovery / personal email address."},
    )
    # Immutable fields — listed here for documentation; not loaded
    # email, roll, dept, section, course, teacher, password_hash, role

    @pre_load
    def protect_identity(self, data, **kwargs):
        if not isinstance(data, dict):
            raise ValidationError({"_schema": ["Profile data must be an object."]})
        errors = {key: ["This field is read-only."] for key in data if key != "recovery_email"}
        if errors:
            raise ValidationError(errors)
        return data


class ChangePasswordSchema(Schema):
    """Validate the payload when a student changes their password."""

    current_password = fields.Str(
        required=True,
        metadata={"description": "Student's current (or initial) password."},
    )
    new_password = fields.Str(
        required=True,
        validate=validate.Length(min=8, max=128),
        metadata={"description": "New password (8–128 chars)."},
    )
    confirm_password = fields.Str(
        required=True,
        metadata={"description": "Must match new_password exactly."},
    )

    @validates_schema
    def passwords_consistent(self, data: dict, **kwargs) -> None:
        new_pw  = data.get("new_password", "")
        confirm = data.get("confirm_password", "")
        current = data.get("current_password", "")

        if new_pw != confirm:
            raise ValidationError(
                {"confirm_password": ["Passwords do not match."]}
            )
        if current and new_pw and current == new_pw:
            raise ValidationError(
                {"new_password": ["New password must differ from your current password."]}
            )
