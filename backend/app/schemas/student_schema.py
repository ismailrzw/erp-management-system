# backend/app/schemas/student_schema.py
"""Validation schemas for student data."""

import re

from marshmallow import Schema, ValidationError, fields, validate, validates

ROLL_REGEX = re.compile(r"^f\d{4}-\d+$", re.IGNORECASE)


class CreateStudentSchema(Schema):
    """Schema for creating a new student."""

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
        required=False,
        load_default="",
    )
    section = fields.Str(
        required=False,
        load_default="",
    )
    session = fields.Str(
        required=False,
        load_default="",
    )
    course = fields.Str(
        required=False,
        load_default="",
    )
    teacher = fields.Str(
        required=False,
        load_default="",
    )
    recovery_email = fields.Email(
        load_default=None,
        allow_none=True,
    )

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

    name = fields.Str(
        validate=validate.Length(min=2, max=100),
        load_default=None
    )
    section = fields.Str(
        validate=validate.Length(min=1, max=2),
        load_default=None
    )
    course = fields.Str(load_default=None)
    teacher = fields.Str(load_default=None)
    recovery_email = fields.Email(
        load_default=None,
        allow_none=True
    )
    # email, roll, dept, password_hash, role cannot be updated
