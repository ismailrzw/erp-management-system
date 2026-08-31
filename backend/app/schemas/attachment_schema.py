"""Validation schemas for attachment metadata."""

from marshmallow import Schema, fields, validate


class CreateAttachmentSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=1, max=200))


class UpdateAttachmentSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=1, max=200))
