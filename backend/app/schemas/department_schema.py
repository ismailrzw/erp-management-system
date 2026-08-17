"""Validation schemas for department data."""

from marshmallow import Schema, fields, validate


class CreateDepartmentSchema(Schema):
    """Validates payload for creating a department."""
    name = fields.String(required=True, validate=validate.Length(min=2, max=100))
    code = fields.String(
        required=True,
        validate=validate.Regexp(r"^[A-Z]{2,4}$", error="Code must be 2-4 uppercase letters."),
    )


class UpdateDepartmentSchema(Schema):
    """Validates payload for updating a department. All fields optional."""
    name = fields.String(required=False, validate=validate.Length(min=2, max=100))
    code = fields.String(
        required=False,
        validate=validate.Regexp(r"^[A-Z]{2,4}$", error="Code must be 2-4 uppercase letters."),
    )