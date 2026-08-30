"""Validation schemas for announcement data."""

from marshmallow import Schema, fields, validate


class CreateAnnouncementSchema(Schema):
    """Validates payload for creating an announcement."""
    title = fields.String(required=True, validate=validate.Length(min=2, max=200))
    content = fields.String(required=True, validate=validate.Length(min=1))
    date = fields.String(required=False, allow_none=True)


class UpdateAnnouncementSchema(Schema):
    """Validates payload for updating an announcement. All fields optional."""
    title = fields.String(required=False, validate=validate.Length(min=2, max=200))
    content = fields.String(required=False, validate=validate.Length(min=1))
    date = fields.String(required=False, allow_none=True)