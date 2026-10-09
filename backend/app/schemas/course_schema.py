# backend/app/schemas/course_schema.py
"""Validation schemas for course data."""

from marshmallow import (
    EXCLUDE,
    Schema,
    ValidationError,
    fields,
    validate,
    validates_schema,
)


class CreateCourseSchema(Schema):
    """Schema for creating a new course."""

    class Meta:
        unknown = EXCLUDE

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

    @validates_schema
    def validate_groups(self, data, **kwargs):
        min_group = data.get("min_group")
        max_group = data.get("max_group")
        if min_group is not None and max_group is not None and max_group < min_group:
            raise ValidationError("max_group must be greater than or equal to min_group.", field_name="max_group")


class UpdateCourseSchema(Schema):
    """Schema for updating an existing course. All fields optional."""

    class Meta:
        unknown = EXCLUDE

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

    @validates_schema
    def validate_groups(self, data, **kwargs):
        min_group = data.get("min_group")
        max_group = data.get("max_group")
        if min_group is not None and max_group is not None and max_group < min_group:
            raise ValidationError("max_group must be greater than or equal to min_group.", field_name="max_group")
