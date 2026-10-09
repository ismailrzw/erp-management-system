# backend/app/schemas/teacher_schema.py
"""
Marshmallow validation schemas for teacher (supervisor) and evaluator data.

Design decisions
----------------
* Teachers are university faculty members who supervise groups all semester.
  They do not have an internal/external type since they are always university staff.
* Evaluators evaluate on project milestones and have an evaluator_type ("internal" | "external").
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
    """Type-specific validation is completed against active academic data in the service."""
    name = fields.String(required=True, validate=validate.Length(min=2, max=120))
    email = fields.Email(required=True)
    dept = fields.String(load_default="")
    evaluator_type = fields.String(required=True, validate=validate.OneOf(EvaluatorType.ALL))
    domains = fields.List(fields.String(), load_default=[])
    company_name = fields.String(load_default="", validate=validate.Length(max=200))
    post = fields.String(load_default="", validate=validate.Length(max=200))


class UpdateEvaluatorSchema(Schema):
    name = fields.String(validate=validate.Length(min=2, max=120))
    dept = fields.String()
    evaluator_type = fields.String(validate=validate.OneOf(EvaluatorType.ALL))
    domains = fields.List(fields.String())
    company_name = fields.String(validate=validate.Length(max=200))
    post = fields.String(validate=validate.Length(max=200))
