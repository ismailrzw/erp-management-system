"""Validation schemas for announcement data."""

from marshmallow import Schema, fields, validate
from app.models.announcement import AnnouncementScope


class CreateAnnouncementSchema(Schema):
    """Validates payload for creating an announcement."""
    title = fields.String(required=True, validate=validate.Length(min=2, max=200))
    content = fields.String(required=True, validate=validate.Length(min=1))
    date = fields.String(required=False, allow_none=True)
    scope = fields.String(
        required=False,
        load_default=AnnouncementScope.BROADCAST,
        validate=validate.OneOf(AnnouncementScope.ALL),
    )
    target_ids = fields.List(fields.String(), required=False, load_default=list)


class UpdateAnnouncementSchema(Schema):
    """Validates payload for updating an announcement. All fields optional."""
    title = fields.String(required=False, validate=validate.Length(min=2, max=200))
    content = fields.String(required=False, validate=validate.Length(min=1))
    date = fields.String(required=False, allow_none=True)
    scope = fields.String(
        required=False,
        validate=validate.OneOf(AnnouncementScope.ALL),
    )
    target_ids = fields.List(fields.String(), required=False)