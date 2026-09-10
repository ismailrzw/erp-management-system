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

import re

from marshmallow import (
    Schema,
    ValidationError,
    fields,
    validate,
    validates,
    validates_schema,
)

# ── Group schemas ──────────────────────────────────────────────────────────────

class CreateGroupSchema(Schema):
    """Validate the payload when a student creates a new group."""

    name = fields.Str(
        required=True,
        validate=validate.Length(min=3, max=100),
        metadata={"description": "Human-readable group name (3–100 chars)."},
    )
    project_title = fields.Str(
        required=True,
        validate=validate.Length(min=5, max=200),
        metadata={"description": "Proposed project title (5–200 chars)."},
    )

    @validates("name")
    def name_safe_chars(self, value: str) -> None:
        """Allow letters, digits, spaces, hyphens, and underscores only."""
        if not re.match(r"^[\w\s\-]+$", value.strip()):
            raise ValidationError(
                "Group name may only contain letters, numbers, spaces, hyphens, and underscores."
            )

    @validates("project_title")
    def project_title_not_blank(self, value: str) -> None:
        if not value.strip():
            raise ValidationError("Project title must not be blank.")


class UpdateGroupSchema(Schema):
    """Validate the payload when a group leader updates group details."""

    name = fields.Str(
        validate=validate.Length(min=3, max=100),
        load_default=None,
    )
    project_title = fields.Str(
        validate=validate.Length(min=5, max=200),
        load_default=None,
    )

    @validates("name")
    def name_safe_chars(self, value: str) -> None:
        if value and not re.match(r"^[\w\s\-]+$", value.strip()):
            raise ValidationError(
                "Group name may only contain letters, numbers, spaces, hyphens, and underscores."
            )


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

    name = fields.Str(
        validate=validate.Length(min=2, max=100),
        load_default=None,
        metadata={"description": "Full name (2–100 chars)."},
    )
    recovery_email = fields.Email(
        load_default=None,
        allow_none=True,
        metadata={"description": "Optional recovery / personal email address."},
    )
    # Immutable fields — listed here for documentation; not loaded
    # email, roll, dept, section, course, teacher, password_hash, role


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
