# backend/app/blueprints/manager/sprints.py
"""Sprint management namespace for manager portal."""

import re
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from flask import request
from flask_jwt_extended import jwt_required
from flask_restx import Namespace, Resource, fields

from app.extensions import mongo
from app.models.sprint import COLLECTION_SPRINTS, SprintField
from app.models.user import Role
from app.services.academic_write_service import academic_write
from app.utils.decorators import role_required
from app.utils.responses import error_response, success_response

sprints_ns = Namespace('manager_sprints', description='Manager Sprint Containers Management')

create_sprint_model = sprints_ns.model('CreateSprint', {
    'name': fields.String(required=True, example='Sprint 1 — Requirement Analysis'),
    'description': fields.String(example='Define problem statement and system requirements.'),
})

update_sprint_model = sprints_ns.model('UpdateSprint', {
    'name': fields.String(required=True, example='Sprint 1 — Requirement Analysis'),
    'description': fields.String(example='Updated description...'),
})


def format_sprint(doc: dict) -> dict:
    if not doc:
        return doc
    res = dict(doc)
    res["id"] = str(res.pop("_id"))
    if isinstance(res.get("created_at"), datetime):
        res["created_at"] = res["created_at"].isoformat()
    if isinstance(res.get("updated_at"), datetime):
        res["updated_at"] = res["updated_at"].isoformat()
    return res


@sprints_ns.route('')
class SprintListResource(Resource):
    @jwt_required()
    @role_required(Role.MANAGER)
    @sprints_ns.doc(security='Bearer Auth')
    @sprints_ns.param('course', 'Filter sprints by course name')
    def get(self):
        """List all active sprints with associated milestone counts."""
        course = request.args.get('course')
        query = {"deleted": {"$ne": True}}
        if course and course != "All Courses":
            query["$or"] = [{"course": course}, {"course": "All Courses"}, {"course": {"$exists": False}}]

        sprint_docs = list(mongo.db[COLLECTION_SPRINTS].find(query).sort([('order', 1), ('name', 1)]))

        sprints = []
        for s in sprint_docs:
            formatted = format_sprint(s)
            # Count milestones belonging to this sprint
            m_count = mongo.db.iterations.count_documents({
                "sprint_name": formatted["name"],
                "deleted": {"$ne": True},
            })
            formatted["milestones_count"] = m_count
            sprints.append(formatted)

        return success_response("Sprints fetched successfully.", data=sprints, status=200)

    @jwt_required()
    @role_required(Role.MANAGER)
    @sprints_ns.doc(security='Bearer Auth')
    @sprints_ns.expect(create_sprint_model, validate=True)
    @academic_write
    def post(self):
        """Create a new sprint container with name and description."""
        data = request.get_json() or {}
        name = (data.get('name') or '').strip()
        description = (data.get('description') or '').strip()
        course = 'All Courses'
        order = mongo.db.sprints.count_documents({}) + 1

        if not name:
            return error_response("Sprint name is required.", status=400)

        # Check for duplicates
        existing = mongo.db[COLLECTION_SPRINTS].find_one({
            "name": {"$regex": f"^{re.escape(name)}$", "$options": "i"},
            "course": course,
            "deleted": {"$ne": True},
        })
        if existing:
            return error_response(f"A sprint named '{name}' already exists for {course}.", status=409)

        now = datetime.now(timezone.utc)
        sprint_doc = {
            SprintField.NAME: name,
            SprintField.DESCRIPTION: description,
            SprintField.COURSE: course,
            SprintField.ORDER: order,
            SprintField.DELETED: False,
            SprintField.CREATED_AT: now,
            SprintField.UPDATED_AT: now,
        }

        result = mongo.db[COLLECTION_SPRINTS].insert_one(sprint_doc)
        sprint_doc["_id"] = result.inserted_id
        formatted = format_sprint(sprint_doc)
        formatted["milestones_count"] = 0

        return success_response("Sprint created successfully.", data=formatted, status=201)


@sprints_ns.route('/<string:sprint_id>')
@sprints_ns.param('sprint_id', 'MongoDB Sprint ID')
class SprintDetailResource(Resource):
    @jwt_required()
    @role_required(Role.MANAGER)
    @sprints_ns.doc(security='Bearer Auth')
    def get(self, sprint_id):
        """Get single sprint details."""
        try:
            oid = ObjectId(sprint_id)
        except (InvalidId, TypeError):
            return error_response("Invalid sprint ID.", status=400)

        sprint = mongo.db[COLLECTION_SPRINTS].find_one({"_id": oid, "deleted": {"$ne": True}})
        if not sprint:
            return error_response("Sprint not found.", status=404)

        formatted = format_sprint(sprint)
        m_count = mongo.db.iterations.count_documents({"sprint_name": formatted["name"], "deleted": {"$ne": True}})
        formatted["milestones_count"] = m_count
        return success_response("Sprint retrieved.", data=formatted, status=200)

    @jwt_required()
    @role_required(Role.MANAGER)
    @sprints_ns.doc(security='Bearer Auth')
    @sprints_ns.expect(update_sprint_model, validate=True)
    @academic_write
    def put(self, sprint_id):
        """Update an existing sprint name or description."""
        try:
            oid = ObjectId(sprint_id)
        except (InvalidId, TypeError):
            return error_response("Invalid sprint ID.", status=400)

        data = request.get_json() or {}
        name = (data.get('name') or '').strip()
        description = (data.get('description') or '').strip()

        if not name:
            return error_response("Sprint name is required.", status=400)

        sprint = mongo.db[COLLECTION_SPRINTS].find_one({"_id": oid, "deleted": {"$ne": True}})
        if not sprint:
            return error_response("Sprint not found.", status=404)

        if set(data) - {"name", "description"}:
            return error_response("Only Sprint Name and Description can be edited.", status=422)
        duplicate = mongo.db.sprints.find_one({"_id": {"$ne": oid}, "name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}, "deleted": {"$ne": True}})
        if duplicate:
            return error_response("A Sprint with this name already exists.", status=409)
        old_name = sprint.get("name")
        update_fields = {
            SprintField.NAME: name,
            SprintField.DESCRIPTION: description,
            SprintField.UPDATED_AT: datetime.now(timezone.utc),
        }

        mongo.db[COLLECTION_SPRINTS].update_one({"_id": oid}, {"$set": update_fields})

        # If sprint name changed, update associated iterations
        if old_name and old_name != name:
            mongo.db.iterations.update_many(
                {"$or": [{"sprint_id": {"$in": [oid, sprint_id]}}, {"sprint_name": old_name, "sprint_id": {"$exists": False}}]},
                {"$set": {"sprint_name": name, "updatedAt": datetime.now(timezone.utc)}}
            )

        updated = mongo.db[COLLECTION_SPRINTS].find_one({"_id": oid})
        return success_response("Sprint updated successfully.", data=format_sprint(updated), status=200)

    @jwt_required()
    @role_required(Role.MANAGER)
    @sprints_ns.doc(security='Bearer Auth')
    @academic_write
    def delete(self, sprint_id):
        """Delete a sprint."""
        try:
            oid = ObjectId(sprint_id)
        except (InvalidId, TypeError):
            return error_response("Invalid sprint ID.", status=400)

        sprint = mongo.db[COLLECTION_SPRINTS].find_one({"_id": oid, "deleted": {"$ne": True}})
        if not sprint:
            return error_response("Sprint not found.", status=404)

        children = mongo.db.iterations.count_documents({"$or": [
            {"sprint_id": {"$in": [oid, sprint_id]}}, {"sprint_name": sprint.get("name")},
        ]})
        if children:
            return error_response(f"Cannot delete sprint: {children} milestone(s) still reference it.", status=409)

        # Soft delete sprint
        mongo.db[COLLECTION_SPRINTS].update_one(
            {"_id": oid},
            {"$set": {"deleted": True, "updated_at": datetime.now(timezone.utc)}}
        )

        return success_response(f"Sprint '{sprint.get('name')}' deleted successfully.", data={"id": sprint_id}, status=200)
