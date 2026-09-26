# backend/app/schemas/teacher_schema.py
"""
Marshmallow validation schemas for teacher (supervisor) and evaluator data.

Design decisions
----------------
* Teachers are university faculty members who supervise groups all semester.
  They do not have an internal/external type since they are always university staff.
* Evaluators evaluate on Exhibition/Showcase Day and have an evaluator_type ("internal" | "external").
* Email is immutable after creation.
"""

from marshmallow import Schema, fields, validate

from app.models.teacher import EvaluatorType


class CreateTeacherSchema(Schema):
    """Validates payload for creating a teacher / supervisor (POST /api/manager/teachers/)."""

    name    = fields.String(required=True, validate=validate.Length(min=2, max=120))
    email   = fields.Email(required=True)
    dept    = fields.String(required=True, validate=validate.Length(min=1, max=50))
    domains = fields.List(fields.String(), load_default=[])


class UpdateTeacherSchema(Schema):
    """Validates payload for updating a teacher (PUT /api/manager/teachers/<id>)."""

    name    = fields.String(required=False, validate=validate.Length(min=2, max=120))
    dept    = fields.String(required=False, validate=validate.Length(min=1, max=50))
    domains = fields.List(fields.String(), required=False)


class CreateEvaluatorSchema(Schema):
    """Validates payload for creating an exhibition-day evaluator (POST /api/manager/evaluators/)."""

    name           = fields.String(required=True, validate=validate.Length(min=2, max=120))
    email          = fields.Email(required=True)
    dept           = fields.String(required=True, validate=validate.Length(min=1, max=50))
    evaluator_type = fields.String(required=True, validate=validate.OneOf(EvaluatorType.ALL))
    domains        = fields.List(fields.String(), load_default=[])


class UpdateEvaluatorSchema(Schema):
    """Validates payload for updating an evaluator (PUT /api/manager/evaluators/<id>)."""

    name           = fields.String(required=False, validate=validate.Length(min=2, max=120))
    dept           = fields.String(required=False, validate=validate.Length(min=1, max=50))
    evaluator_type = fields.String(required=False, validate=validate.OneOf(EvaluatorType.ALL))
    domains        = fields.List(fields.String(), required=False)
