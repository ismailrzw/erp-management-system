# backend/app/schemas/department_schema.py
"""Validation schemas for department data."""

from marshmallow import Schema, fields, validate, validates, ValidationError


class CreateDepartmentSchema(Schema):
    """Schema for creating a new department."""
    
    name = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=100)
    )
    code = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=4)
    )

    @validates("code")
    def validate_code(self, value):
        if not value.isalpha():
            raise ValidationError("Department code must contain only letters.")
        if not value.isupper():
            raise ValidationError("Department code must be uppercase.")


class UpdateDepartmentSchema(Schema):
    """Schema for updating an existing department."""
    
    name = fields.Str(
        validate=validate.Length(min=2, max=100),
        load_default=None
    )
    code = fields.Str(
        validate=validate.Length(min=2, max=4),
        load_default=None
    )