# backend/app/blueprints/manager/iterations.py
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

iterations_ns = Namespace('manager_iterations', description='Manager Iteration Management')

rubric_level_model = iterations_ns.model('RubricLevels', {
    '0': fields.String(example='Not provided'),
    '1': fields.String(example='Vague'),
    '2': fields.String(example='Basic'),
    '3': fields.String(example='Adequate'),
    '4': fields.String(example='Good'),
    '5': fields.String(example='Excellent')
})

rubric_model = iterations_ns.model('Rubric', {
    'question': fields.String(required=True, example='Problem Statement Clarity'),
    'weight': fields.Integer(required=True, example=25),
    'levels': fields.Nested(rubric_level_model, required=True)
})

create_iteration_model = iterations_ns.model('CreateIteration', {
    'title': fields.String(required=True, example='Project Proposal Submission'),
    'details': fields.String(example='Submit a comprehensive proposal...'),
    'course': fields.String(required=True, example='Final Year Project - Fall 2025'),
    'deadline': fields.String(required=True, example='2026-07-10')
})

rubrics_payload_model = iterations_ns.model('RubricsPayload', {
    'rubrics': fields.List(fields.Nested(rubric_model), required=True)
})


def format_dates(doc: dict) -> dict:
    """Helper to convert datetime objects in Mongo documents to ISO strings for JSON serialization."""
    if not doc:
        return doc
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
    if isinstance(doc.get("createdAt"), datetime):
        doc["createdAt"] = doc["createdAt"].isoformat()
    if isinstance(doc.get("updatedAt"), datetime):
        doc["updatedAt"] = doc["updatedAt"].isoformat()
    return doc


def validate_rubric_weights(rubrics: list) -> tuple[bool, str | None]:
    if not rubrics:
        return True, None
    try:
        total = sum(int(r.get("weight", 0)) for r in rubrics)
    except (TypeError, ValueError):
        return False, "All rubric weights/marks must be integers."
    if total <= 0:
        return False, "Total rubric marks/weight must be greater than 0."
    return True, None


@iterations_ns.route('')
class IterationListResource(Resource):
    @jwt_required()
    @role_required(Role.MANAGER)
    @iterations_ns.doc(security='Bearer Auth')
    @iterations_ns.param('course', 'Filter iterations by course name')
    def get(self):
        """Get all iterations, optionally filtered by course. Enriched with submission stats."""
        course = request.args.get('course')
        query = {}
        if course:
            query['course'] = course

        iterations = list(mongo.db.iterations.find(query).sort('createdAt', -1))
        for item in iterations:
            format_dates(item)

            # Enrich with submission stats and cross-course/department breakdown
            iter_course = item.get('course')
            group_query = {"status": "approved"}
            if iter_course and iter_course != 'All Courses':
                group_query["course"] = iter_course

            approved_groups = list(mongo.db.groups.find(group_query))
            total_groups = len(approved_groups)

            iter_oid = ObjectId(item['_id']) if isinstance(item['_id'], str) else item['_id']
            subs = list(mongo.db.submissions.find({"iteration_id": iter_oid}))
            submitted_group_ids = {str(s.get("group_id")): s for s in subs}
            submitted_count = len(subs)
            late_count = sum(1 for s in subs if s.get("is_late"))
            pending_count = max(0, total_groups - submitted_count)

            # Compute by_course breakdown
            by_course_map = {}
            for g in approved_groups:
                c_name = g.get("course", "Unassigned")
                d_name = g.get("dept", "General")
                key = (c_name, d_name)
                if key not in by_course_map:
                    by_course_map[key] = {
                        "course": c_name,
                        "dept": d_name,
                        "total_groups": 0,
                        "submitted_count": 0,
                        "late_count": 0,
                        "pending_count": 0,
                    }
                row = by_course_map[key]
                row["total_groups"] += 1
                gid_str = str(g["_id"])
                if gid_str in submitted_group_ids:
                    row["submitted_count"] += 1
                    if submitted_group_ids[gid_str].get("is_late"):
                        row["late_count"] += 1
                else:
                    row["pending_count"] += 1

            item['submission_stats'] = {
                'total_groups': total_groups,
                'submitted_count': submitted_count,
                'late_count': late_count,
                'pending_count': pending_count,
                'by_course': list(by_course_map.values()),
            }

        return success_response("Iterations retrieved successfully.", data=iterations)

    @jwt_required()
    @role_required(Role.MANAGER)
    @iterations_ns.doc(security='Bearer Auth')
    @iterations_ns.expect(create_iteration_model)
    def post(self):
        """Create a new iteration milestone."""
        data = request.get_json() or {}
        title = (data.get('title') or '').strip()
        course = (data.get('course') or '').strip()
        deadline = (data.get('deadline') or '').strip()
        details = (data.get('details') or '').strip()
        document_url = (data.get('document_url') or '').strip()
        document_name = (data.get('document_name') or '').strip()
        template_id_str = (data.get('rubric_template_id') or '').strip()

        if not title or not course or not deadline:
            return error_response("Title, course, and deadline are required.", 400)

        # Pre-populate rubrics from template if provided
        rubrics = []
        rubric_template_id = None
        if template_id_str:
            try:
                tpl_oid = ObjectId(template_id_str)
            except (InvalidId, TypeError, ValueError):
                return error_response("Invalid rubric template ID.", 400)
            tpl = mongo.db.rubric_templates.find_one({"_id": tpl_oid})
            if tpl:
                rubrics = tpl.get("criteria", [])
                rubric_template_id = tpl_oid

        now = datetime.now(timezone.utc)
        doc = {
            "title": title,
            "details": details,
            "document_url": document_url,
            "document_name": document_name,
            "course": course,
            "deadline": deadline,
            "rubrics": rubrics,
            "rubric_template_id": rubric_template_id,
            "createdAt": now,
            "updatedAt": now
        }

        result = mongo.db.iterations.insert_one(doc)
        doc['_id'] = str(result.inserted_id)
        if doc.get('rubric_template_id'):
            doc['rubric_template_id'] = str(doc['rubric_template_id'])
        format_dates(doc)
        return success_response("Iteration created successfully.", data=doc, status=201)


@iterations_ns.route('/<string:iteration_id>')
class IterationDetailResource(Resource):
    @jwt_required()
    @role_required(Role.MANAGER)
    @iterations_ns.doc(security='Bearer Auth')
    def get(self, iteration_id):
        """Get single iteration details."""
        try:
            item = mongo.db.iterations.find_one({"_id": ObjectId(iteration_id)})
        except (InvalidId, TypeError, ValueError):
            return error_response("Invalid iteration ID.", 400)

        if not item:
            return error_response("Iteration not found.", 404)

        format_dates(item)
        return success_response("Iteration retrieved.", data=item)

    @jwt_required()
    @role_required(Role.MANAGER)
    @iterations_ns.doc(security='Bearer Auth')
    @iterations_ns.expect(create_iteration_model)
    def put(self, iteration_id):
        """Update iteration title, details, document attachment, and/or deadline."""
        try:
            oid = ObjectId(iteration_id)
        except (InvalidId, TypeError, ValueError):
            return error_response("Invalid iteration ID.", 400)

        data = request.get_json() or {}
        update_fields = {}
        if data.get('title'):
            update_fields['title'] = data['title'].strip()
        if 'details' in data:
            update_fields['details'] = data['details'].strip()
        if 'document_url' in data:
            update_fields['document_url'] = (data['document_url'] or '').strip()
        if 'document_name' in data:
            update_fields['document_name'] = (data['document_name'] or '').strip()
        if data.get('deadline'):
            update_fields['deadline'] = data['deadline'].strip()
        if data.get('course'):
            update_fields['course'] = data['course'].strip()

        update_fields['updatedAt'] = datetime.now(timezone.utc)

        result = mongo.db.iterations.update_one(
            {"_id": oid},
            {"$set": update_fields}
        )
        if result.matched_count == 0:
            return error_response("Iteration not found.", 404)

        updated = mongo.db.iterations.find_one({"_id": oid})
        format_dates(updated)
        return success_response("Iteration updated successfully.", data=updated)

    @jwt_required()
    @role_required(Role.MANAGER)
    @iterations_ns.doc(security='Bearer Auth')
    def delete(self, iteration_id):
        """Delete iteration (blocked if submissions exist)."""
        try:
            oid = ObjectId(iteration_id)
        except (InvalidId, TypeError, ValueError):
            return error_response("Invalid iteration ID.", 400)

        sub_count = mongo.db.submissions.count_documents({"iteration_id": oid})
        if sub_count > 0:
            return error_response(f"Cannot delete iteration. {sub_count} submission(s) exist for it.", 400)

        result = mongo.db.iterations.delete_one({"_id": oid})
        if result.deleted_count == 0:
            return error_response("Iteration not found.", 404)

        return success_response("Iteration deleted successfully.")


@iterations_ns.route('/<string:iteration_id>/rubrics')
class IterationRubricsResource(Resource):
    @jwt_required()
    @role_required(Role.MANAGER)
    @iterations_ns.doc(security='Bearer Auth')
    @iterations_ns.expect(rubrics_payload_model)
    def post(self, iteration_id):
        """Replace the entire rubric set for an iteration. Total marks can be custom set by manager."""
        try:
            oid = ObjectId(iteration_id)
        except (InvalidId, TypeError, ValueError):
            return error_response("Invalid iteration ID.", 400)

        data = request.get_json() or {}
        rubrics = data.get("rubrics", [])

        valid, err = validate_rubric_weights(rubrics)
        if not valid:
            return error_response(err, 422)

        default_lvl = {
            "0": "Not submitted / Unsatisfactory",
            "1": "Minimal effort / Major deficiencies",
            "2": "Basic attempt / Needs improvement",
            "3": "Satisfactory / Meets expectations",
            "4": "Good quality / Minor gaps",
            "5": "Exemplary / Fully comprehensive"
        }

        for i, r in enumerate(rubrics, start=1):
            r["id"] = i
            if "levels" not in r or not isinstance(r["levels"], dict):
                r["levels"] = {**default_lvl}
            else:
                for k, v in default_lvl.items():
                    if k not in r["levels"] or not r["levels"][k]:
                        r["levels"][k] = v

        result = mongo.db.iterations.update_one(
            {"_id": oid},
            {"$set": {"rubrics": rubrics, "updatedAt": datetime.now(timezone.utc)}}
        )
        if result.matched_count == 0:
            return error_response("Iteration not found.", 404)

        return success_response("Rubrics saved successfully.", data={"rubrics": rubrics})


@iterations_ns.route('/<string:iteration_id>/rubrics/<int:rubric_id>')
class SingleRubricDeleteResource(Resource):
    @jwt_required()
    @role_required(Role.MANAGER)
    @iterations_ns.doc(security='Bearer Auth')
    def delete(self, iteration_id, rubric_id):
        """Remove one rubric criterion from an iteration."""
        try:
            oid = ObjectId(iteration_id)
        except (InvalidId, TypeError, ValueError):
            return error_response("Invalid iteration ID.", 400)

        iteration = mongo.db.iterations.find_one({"_id": oid})
        if not iteration:
            return error_response("Iteration not found.", 404)

        rubrics = iteration.get("rubrics", [])
        updated_rubrics = [r for r in rubrics if r.get("id") != rubric_id]

        mongo.db.iterations.update_one(
            {"_id": oid},
            {"$set": {"rubrics": updated_rubrics, "updatedAt": datetime.now(timezone.utc)}}
        )
        return success_response("Rubric criterion removed.", data={"rubrics": updated_rubrics})


@iterations_ns.route('/<string:iteration_id>/submissions')
class IterationSubmissionsResource(Resource):
    @jwt_required()
    @role_required(Role.MANAGER)
    @iterations_ns.doc(security='Bearer Auth')
    def get(self, iteration_id):
        """Get all group submissions for a specific iteration (group-wise view)."""
        try:
            oid = ObjectId(iteration_id)
        except (InvalidId, TypeError, ValueError):
            return error_response("Invalid iteration ID.", 400)

        iteration = mongo.db.iterations.find_one({"_id": oid})
        if not iteration:
            return error_response("Iteration not found.", 404)

        course = iteration.get("course")

        # Fetch all approved groups — if "All Courses", get all; otherwise filter by course
        group_query = {"status": "approved"}
        if course and course != "All Courses":
            group_query["course"] = course

        all_groups = list(mongo.db.groups.find(group_query))

        # Fetch all submissions for this iteration
        submissions = list(mongo.db.submissions.find({"iteration_id": oid}))
        # Index submissions by group_id for fast lookup
        subs_by_group = {str(s["group_id"]): s for s in submissions}

        result = []
        course_breakdown = {}

        for group in all_groups:
            group_id_str = str(group["_id"])
            group_name = group.get("name", "Unnamed Group")
            project_title = group.get("project_title", "")
            group_course = group.get("course", course or "General")
            group_dept = group.get("dept", "General")

            sub = subs_by_group.get(group_id_str)
            is_sub = bool(sub)
            is_late = bool(sub.get("is_late")) if sub else False

            # Track cross-course and department statistics
            key = (group_course, group_dept)
            if key not in course_breakdown:
                course_breakdown[key] = {
                    "course": group_course,
                    "dept": group_dept,
                    "total_groups": 0,
                    "submitted_count": 0,
                    "late_count": 0,
                    "pending_count": 0,
                }
            cb = course_breakdown[key]
            cb["total_groups"] += 1
            if is_sub:
                cb["submitted_count"] += 1
                if is_late:
                    cb["late_count"] += 1
            else:
                cb["pending_count"] += 1

            if sub:
                # Resolve submitter name
                submitter_name = "Unknown"
                submitter_id = sub.get("submitted_by")
                if submitter_id:
                    user = mongo.db.users.find_one({"_id": ObjectId(submitter_id)})
                    if user:
                        submitter_name = (
                            user.get("full_name") or
                            user.get("name") or
                            user.get("email", "Unknown")
                        )

                submitted_at = sub.get("submitted_at")
                result.append({
                    "group_id": group_id_str,
                    "group_name": group_name,
                    "project_title": project_title,
                    "course": group_course,
                    "dept": group_dept,
                    "submitted": True,
                    "is_late": is_late,
                    "submitted_by": submitter_name,
                    "submitted_at": submitted_at.isoformat() if submitted_at else None,
                    "file_name": sub.get("file_name"),
                    "file_url": sub.get("file_url"),
                    "file_size": sub.get("file_size"),
                    "note": sub.get("note", ""),
                })
            else:
                result.append({
                    "group_id": group_id_str,
                    "group_name": group_name,
                    "project_title": project_title,
                    "course": group_course,
                    "dept": group_dept,
                    "submitted": False,
                    "is_late": False,
                    "submitted_by": None,
                    "submitted_at": None,
                    "file_name": None,
                    "file_url": None,
                    "file_size": None,
                    "note": None,
                })

        summary = {
            "total_groups": len(all_groups),
            "submitted_count": sum(1 for r in result if r["submitted"]),
            "late_count": sum(1 for r in result if r.get("is_late")),
            "pending_count": sum(1 for r in result if not r["submitted"]),
            "iteration_title": iteration.get("title"),
            "iteration_deadline": iteration.get("deadline"),
            "course": course,
            "by_course": list(course_breakdown.values()),
        }

        return success_response(
            "Submissions retrieved successfully.",
            data={"summary": summary, "submissions": result}
        )
