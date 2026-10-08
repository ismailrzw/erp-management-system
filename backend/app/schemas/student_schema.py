# backend/app/schemas/student_schema.py
"""Validation schemas for student data."""

import re

from marshmallow import (
    EXCLUDE,
    Schema,
    ValidationError,
    fields,
    pre_load,
    validate,
    validates,
)

ROLL_REGEX = re.compile(r"^f\d{4}-\d+$", re.IGNORECASE)


class CreateStudentSchema(Schema):
    """Schema for creating a new student."""

    class Meta:
        unknown = EXCLUDE

    name = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=100),
        error_messages={"required": "Student full name is required."},
    )
    roll = fields.Str(
        required=True,
        validate=validate.Length(min=3, max=30),
        error_messages={"required": "Student roll number is required."},
    )
    dept = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=100),
    )
    section = fields.Str(
        required=False,
        load_default="",
    )
    session = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=100),
    )
    course = fields.Str(
        required=False,
        load_default="",
    )
    recovery_email = fields.Email(
        load_default=None,
        allow_none=True,
    )

    @pre_load
    def trim_fields(self, data, **kwargs):
        if not isinstance(data, dict):
            raise ValidationError({"_schema": ["Student data must be an object."]})
        result = {key: value.strip() if isinstance(value, str) else value for key, value in data.items()}
        if isinstance(result.get("roll"), str):
            result["roll"] = result["roll"].lower()
        if isinstance(result.get("dept"), str):
            result["dept"] = result["dept"].upper()
        return result

    @validates("roll")
    def validate_roll(self, value):
        val = value.strip()
        if not val:
            raise ValidationError("Roll number is required.")
        if " " in val:
            raise ValidationError("Roll number must not contain spaces.")
        if not ROLL_REGEX.match(val):
            raise ValidationError("Roll must follow format f{year}-{number}, e.g. f2023-551.")


class UpdateStudentSchema(Schema):
    """Schema for updating an existing student."""

    class Meta:
        unknown = EXCLUDE

    dept = fields.Str(validate=validate.Length(min=1, max=100))
    section = fields.Str(
        validate=validate.Length(min=1, max=2),
    )
    course = fields.Str()
    recovery_email = fields.Email(
        allow_none=True
    )

    @pre_load
    def protect_identity(self, data, **kwargs):
        if not isinstance(data, dict):
            raise ValidationError({"_schema": ["Student data must be an object."]})
        errors = {key: ["This field cannot be changed after student creation."]
                  for key in ("name", "roll", "session", "email", "role", "password_hash") if key in data}
        if errors:
            raise ValidationError(errors)
        return {key: value.strip() if isinstance(value, str) else value for key, value in data.items()}
