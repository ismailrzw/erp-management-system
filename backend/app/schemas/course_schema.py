# backend/app/schemas/course_schema.py
"""Validation schemas for course data."""

from marshmallow import Schema, fields, validate, validates, ValidationError


class CreateCourseSchema(Schema):
    """Schema for creating a new course."""
    
    name = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=100)
    )
    dept = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=10)
    )
    min_group = fields.Int(
        required=True,
        validate=validate.Range(min=1)
    )
    max_group = fields.Int(
        required=True,
        validate=validate.Range(min=1)
    )
    deadline = fields.Str(
        required=True
    )


class UpdateCourseSchema(Schema):
    """Schema for updating an existing course."""
    
    name = fields.Str(
        validate=validate.Length(min=2, max=100),
        load_default=None
    )
    dept = fields.Str(
        validate=validate.Length(min=2, max=10),
        load_default=None
    )
    min_group = fields.Int(
        validate=validate.Range(min=1),
        load_default=None
    )
    max_group = fields.Int(
        validate=validate.Range(min=1),
        load_default=None
    )
    deadline = fields.Str(load_default=None)