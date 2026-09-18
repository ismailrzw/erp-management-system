# backend/app/blueprints/manager/rubric_templates.py
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from flask import request
from flask_jwt_extended import jwt_required
from flask_restx import Namespace, Resource, fields

from app.extensions import mongo
from app.models.user import Role
from app.utils.decorators import role_required
from app.utils.responses import error_response, success_response

rubric_templates_ns = Namespace(
    'rubric_templates',
    description='Manager Rubric Template Management'
)

# ── Swagger Models ──────────────────────────────────────────
level_model = rubric_templates_ns.model('TemplateLevels', {
    '0': fields.String(example='Not provided'),
    '1': fields.String(example='Vague'),
    '2': fields.String(example='Basic'),
    '3': fields.String(example='Adequate'),
    '4': fields.String(example='Good'),
    '5': fields.String(example='Excellent'),
})

criterion_model = rubric_templates_ns.model('TemplateCriterion', {
    'question': fields.String(required=True, example='Problem Statement Clarity'),
    'weight': fields.Integer(required=True, example=25),
    'levels': fields.Nested(level_model, required=True),
})

create_template_model = rubric_templates_ns.model('CreateRubricTemplate', {
    'name': fields.String(required=True, example='Sprint 1 — Requirements Analysis'),
    'course': fields.String(
        required=False,
        example='All Courses',
        description='Target course name or "All Courses" for cross-course templates',
    ),
    'criteria': fields.List(fields.Nested(criterion_model), required=True),
})


def _validate_criteria_weights(criteria: list) -> tuple[bool, str | None]:
    """Ensure every criterion has a question and that total weight/marks is greater than 0."""
    if not criteria:
        return False, "At least one criterion is required."
    try:
        total = sum(int(c.get("weight", 0)) for c in criteria)
    except (TypeError, ValueError):
        return False, "All criterion weights/marks must be integers."
    if total <= 0:
        return False, "Total criteria marks/weight must be greater than 0."
    for i, c in enumerate(criteria, start=1):
        if not (c.get("question") or "").strip():
            return False, f"Criterion {i} is missing a question/name."
        if int(c.get("weight", 0)) <= 0:
            return False, f"Criterion {i} must have marks/weight greater than 0."
    return True, None


def _format(doc: dict) -> dict:
    if not doc:
        return doc
    doc["_id"] = str(doc["_id"])
    for key in ("createdAt", "updatedAt"):
        if isinstance(doc.get(key), datetime):
            doc[key] = doc[key].isoformat()
    return doc


# ── CRUD Routes ─────────────────────────────────────────────
@rubric_templates_ns.route('')
class RubricTemplateListResource(Resource):

    @jwt_required()
    @role_required(Role.MANAGER)
    @rubric_templates_ns.doc(security='Bearer Auth')
    @rubric_templates_ns.param('course', 'Filter templates by course name')
    def get(self):
        """List all rubric templates, optionally filtered by course."""
        course = request.args.get('course')
        query = {}
        if course:
            query['course'] = course

        templates = list(
            mongo.db.rubric_templates.find(query).sort('createdAt', -1)
        )
        for t in templates:
            _format(t)
        return success_response("Rubric templates retrieved.", data=templates)

    @jwt_required()
    @role_required(Role.MANAGER)
    @rubric_templates_ns.doc(security='Bearer Auth')
    @rubric_templates_ns.expect(create_template_model)
    def post(self):
        """Create a new rubric template."""
        data = request.get_json() or {}

        name = (data.get("name") or "").strip()
        course = (data.get("course") or "All Courses").strip()
        criteria = data.get("criteria", [])

        if not name:
            return error_response("Template name is required.", 400)

        valid, err = _validate_criteria_weights(criteria)
        if not valid:
            return error_response(err, 422)

        # Assign sequential IDs to criteria
        for i, c in enumerate(criteria, start=1):
            c["id"] = i

        now = datetime.now(timezone.utc)
        doc = {
            "name": name,
            "course": course,
            "criteria": criteria,
            "createdAt": now,
            "updatedAt": now,
        }

        result = mongo.db.rubric_templates.insert_one(doc)
        doc["_id"] = str(result.inserted_id)
        _format(doc)
        return success_response("Rubric template created.", data=doc, status=201)


@rubric_templates_ns.route('/<string:template_id>')
class RubricTemplateDetailResource(Resource):

    @jwt_required()
    @role_required(Role.MANAGER)
    @rubric_templates_ns.doc(security='Bearer Auth')
    def get(self, template_id):
        """Get a single rubric template."""
        try:
            oid = ObjectId(template_id)
        except (InvalidId, TypeError, ValueError):
            return error_response("Invalid template ID.", 400)

        doc = mongo.db.rubric_templates.find_one({"_id": oid})
        if not doc:
            return error_response("Rubric template not found.", 404)

        _format(doc)
        return success_response("Rubric template retrieved.", data=doc)

    @jwt_required()
    @role_required(Role.MANAGER)
    @rubric_templates_ns.doc(security='Bearer Auth')
    @rubric_templates_ns.expect(create_template_model)
    def put(self, template_id):
        """Update a rubric template (name, course, criteria)."""
        try:
            oid = ObjectId(template_id)
        except (InvalidId, TypeError, ValueError):
            return error_response("Invalid template ID.", 400)

        data = request.get_json() or {}
        update = {}

        if data.get("name"):
            update["name"] = data["name"].strip()
        if "course" in data:
            update["course"] = (data["course"] or "All Courses").strip()
        if "criteria" in data:
            criteria = data["criteria"]
            valid, err = _validate_criteria_weights(criteria)
            if not valid:
                return error_response(err, 422)
            for i, c in enumerate(criteria, start=1):
                c["id"] = i
            update["criteria"] = criteria

        update["updatedAt"] = datetime.now(timezone.utc)

        result = mongo.db.rubric_templates.update_one(
            {"_id": oid}, {"$set": update}
        )
        if result.matched_count == 0:
            return error_response("Rubric template not found.", 404)

        updated = mongo.db.rubric_templates.find_one({"_id": oid})
        _format(updated)
        return success_response("Rubric template updated.", data=updated)

    @jwt_required()
    @role_required(Role.MANAGER)
    @rubric_templates_ns.doc(security='Bearer Auth')
    def delete(self, template_id):
        """Delete a rubric template (blocked if linked to iterations)."""
        try:
            oid = ObjectId(template_id)
        except (InvalidId, TypeError, ValueError):
            return error_response("Invalid template ID.", 400)

        linked = mongo.db.iterations.count_documents(
            {"rubric_template_id": oid}
        )
        if linked > 0:
            return error_response(
                f"Cannot delete template. {linked} iteration(s) reference it.",
                400,
            )

        result = mongo.db.rubric_templates.delete_one({"_id": oid})
        if result.deleted_count == 0:
            return error_response("Rubric template not found.", 404)

        return success_response("Rubric template deleted.")
