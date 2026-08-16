"""Validation schemas for student data."""

from marshmallow import Schema, fields, validate, validates, ValidationError


class CreateStudentSchema(Schema):
    """Schema for creating a new student."""
    
    name = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=100)
    )
    roll = fields.Str(
        required=True,
        validate=validate.Length(min=3, max=30)
    )
    dept = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=10)
    )
    section = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=2)
    )
    session = fields.Str(
        required=True
    )
    course = fields.Str(
        required=True
    )
    teacher = fields.Str(
        required=True
    )
    recovery_email = fields.Email(
        load_default=None,
        allow_none=True
    )

    @validates("roll")
    def validate_roll(self, value):
        """Roll number should not contain spaces."""
        if " " in value:
            raise ValidationError("Roll number must not contain spaces.")


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
    # Note: email, roll, dept, password_hash, role cannot be updated