"""Validation schemas for teacher/evaluator data."""

from marshmallow import Schema, ValidationError, fields, validate, validates

from app.models.teacher import TeacherType


class CreateTeacherSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    email = fields.Email(required=True)
    dept = fields.String(required=True, validate=validate.Length(min=1, max=50))
    type = fields.String(required=True, validate=validate.OneOf(TeacherType.ALL))


class UpdateTeacherSchema(Schema):
    name = fields.String(required=False, validate=validate.Length(min=1, max=100))
    email = fields.Email(required=False)
    dept = fields.String(required=False, validate=validate.Length(min=1, max=50))
    type = fields.String(required=False, validate=validate.OneOf(TeacherType.ALL))

    @validates("email")
    def reject_email_change(self, value, **kwargs):
        raise ValidationError("Email cannot be changed after creation.")