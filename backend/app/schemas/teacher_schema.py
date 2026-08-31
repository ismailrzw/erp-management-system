# backend/app/schemas/teacher_schema.py
"""
Marshmallow validation schemas for teacher/evaluator data.

Design decisions
----------------
* ``email`` is intentionally absent from ``UpdateTeacherSchema``.
  A teacher's email is immutable after creation (it is the login credential
  and the unique database key).  Excluding the field from the schema is
  the clearest way to enforce this rule — any ``email`` key in a PUT
  payload is silently ignored by ``Schema.load(unknown=EXCLUDE)``, and an
  explicit Marshmallow ``@validates`` that unconditionally raises is a
  confusing anti-pattern that causes valid payloads to be rejected.
"""

from marshmallow import Schema, fields, validate

from app.models.teacher import TeacherType


class CreateTeacherSchema(Schema):
    """Validates the payload for POST /api/manager/teachers/."""

    name  = fields.String(required=True, validate=validate.Length(min=1, max=100))
    email = fields.Email(required=True)
    dept  = fields.String(required=True, validate=validate.Length(min=1, max=50))
    type  = fields.String(required=True, validate=validate.OneOf(TeacherType.ALL))


class UpdateTeacherSchema(Schema):
    """Validates the payload for PUT /api/manager/teachers/<id>.

    ``email`` is excluded — teacher emails are immutable.
    Any extra keys in the request body are silently dropped (``unknown=EXCLUDE``
    is the Marshmallow default when unknown is not set; we rely on the service
    layer never writing untrusted keys to the DB).
    """

    name = fields.String(required=False, validate=validate.Length(min=1, max=100))
    dept = fields.String(required=False, validate=validate.Length(min=1, max=50))
    type = fields.String(required=False, validate=validate.OneOf(TeacherType.ALL))