# backend/app/schemas/course_schema.py
"""Validation schemas for course data."""

from datetime import date

from marshmallow import (
    Schema,
    ValidationError,
    fields,
    validate,
    validates,
    validates_schema,
)


def _parse_deadline(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError) as exc:
        raise ValidationError("deadline must be an ISO-format date, e.g. '2026-08-15'.") from exc


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

    @validates("deadline")
    def validate_deadline(self, value, **kwargs):
        _parse_deadline(value)

    @validates_schema
    def validate_group_sizes(self, data, **kwargs):
        min_group = data.get("min_group")
        max_group = data.get("max_group")
        if min_group is not None and max_group is not None and max_group < min_group:
            raise ValidationError("max_group must be greater than or equal to min_group.", field_name="max_group")


class UpdateCourseSchema(Schema):
    """Schema for updating an existing course. All fields optional."""

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

    @validates("deadline")
    def validate_deadline(self, value, **kwargs):
        if value is not None:
            _parse_deadline(value)

    @validates_schema
    def validate_group_sizes(self, data, **kwargs):
        min_group = data.get("min_group")
        max_group = data.get("max_group")
        if min_group is not None and max_group is not None and max_group < min_group:
            raise ValidationError("max_group must be greater than or equal to min_group.", field_name="max_group")