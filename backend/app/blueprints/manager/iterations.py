# backend/app/blueprints/manager/iterations.py
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from flask import request
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_restx import Namespace, Resource, fields

from app.extensions import mongo
from app.models.user import Role
from app.services.academic_write_service import academic_write
from app.services.milestone_setup_service import (
    graded,
    update_task,
    validate_task_payload,
)
from app.utils.decorators import role_required
from app.utils.responses import error_response, success_response
from app.utils.serialization import json_safe

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
    'deadline': fields.String(required=True, example='2026-07-10'),
    'is_group_formation': fields.Boolean(default=False, description='Set as group formation cutoff milestone'),
    'late_penalty_percent': fields.Integer(default=0, description='Penalty deduction percent for late group formation'),
    'sprint_id': fields.String(description='Selected Sprint context assigned by its Add Milestone action'),
})

student_eval_model = iterations_ns.model('StudentEvaluationInput', {
    'student_id': fields.String(required=True, example='60c72b2f9b1d8b2bad57e123'),
    'scores': fields.Raw(required=True, example={'1': 4, '2': 5}),
    'feedback': fields.String(example='Defaulter remarks and feedback.'),
    'is_defaulter': fields.Boolean(default=True),
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
    if not isinstance(rubrics, list) or any(not isinstance(r, dict) or not (r.get("question") or "").strip() or isinstance(r.get("weight"), bool) or not isinstance(r.get("weight"), int) or r["weight"] <= 0 for r in rubrics):
        return False, "Each criterion requires a question and integer marks greater than 0."
    if len({str(r["id"]) for r in rubrics if "id" in r}) != sum(1 for r in rubrics if "id" in r):
        return False, "Rubric criterion IDs must be unique."
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
        query = {"deleted": {"$ne": True}}
        if course:
            query['course'] = course

        iterations = list(mongo.db.iterations.find(query).sort([('sprint_name', 1), ('milestone_order', 1), ('createdAt', -1)]))
        for item in iterations:
            format_dates(item)
            if not item.get('sprint_name'):
                item['sprint_name'] = 'Sprint 1'
            if not item.get('milestone_order'):
                item['milestone_order'] = 1
            if not item.get('milestone_type'):
                item['milestone_type'] = 'group_formation' if item.get('is_group_formation') else 'deliverable'

            # Enrich with submission stats and cross-course/department breakdown
            iter_course = item.get('course')
            group_query = {"status": {"$in": ["approved", "pending"]}}
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
    @academic_write
    def post(self):
        """Create a new iteration milestone."""
        try:
            data = validate_task_payload(request.get_json() or {})
            # Automatic metadata cannot be overridden by the caller.
            now = datetime.now(timezone.utc)
            document = {key: data[key] for key in (
                "title", "course", "course_id", "deadline", "details", "document_url", "document_name",
                "document_attachment_id", "sprint_id", "sprint_name", "milestone_order", "late_penalty_percent", "rubric_template_id", "rubrics",
            ) if key in data}
            document.update({"createdAt": now, "updatedAt": now, "created_by": ObjectId(get_jwt_identity()),
                             "rubrics": data.get("rubrics", []), "version": 1, "deleted": False,
                             "is_group_formation": bool(data.get("is_group_formation", False)),
                             "milestone_type": "group_formation" if data.get("is_group_formation") else "deliverable"})
            document["_id"] = mongo.db.iterations.insert_one(document).inserted_id
            return success_response("Milestone created.", data=json_safe(document), status=201)
        except ValueError as exc:
            return error_response(str(exc), getattr(exc, "status_code", 400))


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
        if not item.get('sprint_name'):
            item['sprint_name'] = 'Sprint 1'
        if not item.get('milestone_order'):
            item['milestone_order'] = 1
        if not item.get('milestone_type'):
            item['milestone_type'] = 'group_formation' if item.get('is_group_formation') else 'deliverable'

        return success_response("Iteration retrieved.", data=json_safe(item))

    @jwt_required()
    @role_required(Role.MANAGER)
    @iterations_ns.doc(security='Bearer Auth')
    @iterations_ns.expect(create_iteration_model)
    @academic_write
    def put(self, iteration_id):
        """Update iteration title, details, document attachment, and/or deadline."""
        try:
            ObjectId(iteration_id)
        except (InvalidId, TypeError, ValueError):
            return error_response("Invalid iteration ID.", 400)

        try:
            return success_response("Milestone updated.", data=update_task(iteration_id, request.get_json() or {}))
        except ValueError as exc:
            return error_response(str(exc), getattr(exc, "status_code", 400))

    @jwt_required()
    @role_required(Role.MANAGER)
    @iterations_ns.doc(security='Bearer Auth')
    @academic_write
    def delete(self, iteration_id):
        """Delete iteration (blocked if submissions exist)."""
        try:
            oid = ObjectId(iteration_id)
        except (InvalidId, TypeError, ValueError):
            return error_response("Invalid iteration ID.", 400)

        sub_count = sum(mongo.db[collection].count_documents({"iteration_id": {"$in": [oid, iteration_id]}})
                        for collection in ("submissions", "evaluations", "student_evaluations", "milestone_comments"))
        sub_count += mongo.db.submission_history.count_documents({"submission.iteration_id": {"$in": [oid, iteration_id]}})
        if sub_count > 0:
            return error_response(f"Cannot delete iteration. {sub_count} submission(s) exist for it.", 400)

        result = mongo.db.iterations.update_one({"_id": oid, "deleted": {"$ne": True}}, {"$set": {"deleted": True}})
        if result.matched_count == 0:
            return error_response("Iteration not found.", 404)

        return success_response("Iteration deleted successfully.")


@iterations_ns.route('/<string:iteration_id>/rubrics')
class IterationRubricsResource(Resource):
    @jwt_required()
    @role_required(Role.MANAGER)
    @iterations_ns.doc(security='Bearer Auth')
    @iterations_ns.expect(rubrics_payload_model)
    @academic_write
    def post(self, iteration_id):
        """Replace the entire rubric set for an iteration. Total marks can be custom set by manager."""
        try:
            oid = ObjectId(iteration_id)
        except (InvalidId, TypeError, ValueError):
            return error_response("Invalid iteration ID.", 400)

        data = request.get_json() or {}
        if graded(iteration_id):
            return error_response("Graded rubrics are locked.", 409)
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
            r["id"] = r.get("id", i)
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
    @academic_write
    def delete(self, iteration_id, rubric_id):
        """Remove one rubric criterion from an iteration."""
        try:
            oid = ObjectId(iteration_id)
        except (InvalidId, TypeError, ValueError):
            return error_response("Invalid iteration ID.", 400)

        iteration = mongo.db.iterations.find_one({"_id": oid})
        if not iteration:
            return error_response("Iteration not found.", 404)

        if graded(iteration_id):
            return error_response("Graded rubrics are locked.", 409)
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
        group_query = {"status": {"$in": ["approved", "pending"]}}
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

            formation_status = group.get("formation_status", "on_time")

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
                    "formation_status": formation_status,
                    "is_formation_late": formation_status == "late",
                    "submitted": True,
                    "is_late": is_late,
                    "submitted_by": submitter_name,
                    "submitted_at": submitted_at.isoformat() if submitted_at else None,
                    "file_name": sub.get("file_name"),
                    "file_url": f"/api/files/submissions/{sub['_id']}",
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
                    "formation_status": formation_status,
                    "is_formation_late": formation_status == "late",
                    "submitted": False,
                    "is_late": False,
                    "submitted_by": None,
                    "submitted_at": None,
                    "file_name": None,
                    "file_url": None,
                    "file_size": None,
                    "note": None,
                })

        # If this is a group formation milestone, fetch ungrouped students in the course
        from app.services.student_service import list_ungrouped_students
        target_course = course if course and course != "All Courses" else None
        ungrouped_students = list_ungrouped_students(course=target_course)

        # Attach student evaluations (e.g. graded defaulters)
        student_evals = list(mongo.db.student_evaluations.find({"iteration_id": oid}))
        evals_by_student = {str(e.get("student_id")): e for e in student_evals}
        for st in ungrouped_students:
            st_id = str(st.get("id") or st.get("_id", ""))
            ev = evals_by_student.get(st_id)
            if ev:
                st["evaluation"] = {
                    "id": str(ev["_id"]),
                    "scores": ev.get("scores", {}),
                    "total_weighted_score": ev.get("total_weighted_score", 0),
                    "max_possible_score": ev.get("max_possible_score", 0),
                    "percentage": ev.get("percentage", 0),
                    "feedback": ev.get("feedback", ""),
                    "graded_at": ev.get("graded_at").isoformat() if ev.get("graded_at") else None,
                }
            else:
                st["evaluation"] = None

        summary = {
            "total_groups": len(all_groups),
            "submitted_count": sum(1 for r in result if r["submitted"]),
            "late_count": sum(1 for r in result if r.get("is_late")),
            "pending_count": sum(1 for r in result if not r["submitted"]),
            "late_formation_count": sum(1 for r in result if r.get("is_formation_late")),
            "iteration_title": iteration.get("title"),
            "iteration_deadline": iteration.get("deadline"),
            "is_group_formation": iteration.get("is_group_formation", False),
            "late_penalty_percent": iteration.get("late_penalty_percent", 0),
            "course": course,
            "by_course": list(course_breakdown.values()),
        }

        return success_response(
            "Submissions retrieved successfully.",
            data={
                "summary": summary,
                "submissions": result,
                "ungrouped_students": ungrouped_students,
                "rubrics": iteration.get("rubrics", []),
                "is_group_formation": iteration.get("is_group_formation", False),
                "late_penalty_percent": iteration.get("late_penalty_percent", 0),
            }
        )


@iterations_ns.route('/<string:iteration_id>/student-evaluations')
class StudentEvaluationsResource(Resource):
    @jwt_required()
    @role_required(Role.MANAGER)
    @iterations_ns.doc(security='Bearer Auth')
    def get(self, iteration_id):
        """Get all individual student evaluations (such as graded defaulters) for this iteration."""
        try:
            oid = ObjectId(iteration_id)
        except (InvalidId, TypeError, ValueError):
            return error_response("Invalid iteration ID.", 400)

        records = list(mongo.db.student_evaluations.find({"iteration_id": oid}).sort("graded_at", -1))
        for r in records:
            r["_id"] = str(r["_id"])
            r["iteration_id"] = str(r["iteration_id"])
            r["student_id"] = str(r["student_id"])
            if r.get("evaluator_id"):
                r["evaluator_id"] = str(r["evaluator_id"])
            if isinstance(r.get("graded_at"), datetime):
                r["graded_at"] = r["graded_at"].isoformat()
            if isinstance(r.get("updated_at"), datetime):
                r["updated_at"] = r["updated_at"].isoformat()

        return success_response("Student evaluations retrieved.", data=records)

    @jwt_required()
    @role_required(Role.MANAGER)
    @iterations_ns.doc(security='Bearer Auth')
    @iterations_ns.expect(student_eval_model)
    @academic_write
    def post(self, iteration_id):
        """Submit or update a rubric-based evaluation for an individual student (e.g. ungrouped defaulter)."""
        manager_id = get_jwt_identity()
        try:
            oid = ObjectId(iteration_id)
        except (InvalidId, TypeError, ValueError):
            return error_response("Invalid iteration ID.", 400)

        data = request.get_json() or {}
        student_id_str = (data.get('student_id') or '').strip()
        if not student_id_str:
            return error_response("student_id is required.", 400)

        try:
            st_oid = ObjectId(student_id_str)
        except (InvalidId, TypeError, ValueError):
            return error_response("Invalid student_id.", 400)

        student = mongo.db.users.find_one({"_id": st_oid})
        if not student:
            return error_response("Student not found.", 404)

        iteration = mongo.db.iterations.find_one({"_id": oid})
        if not iteration:
            return error_response("Iteration not found.", 404)

        rubrics = iteration.get("rubrics", [])
        if not rubrics:
            return error_response("This iteration has no rubrics configured yet. Please configure rubrics first.", 400)

        scores_input = data.get("scores", {})
        if not isinstance(scores_input, dict):
            return error_response("scores must be an object/dict.", 400)

        rubric_map = {str(r.get("id", idx)): int(r.get("weight", 0)) for idx, r in enumerate(rubrics, 1)}
        max_possible_score = sum(rubric_map.values())

        scores = {}
        total_weighted_score = 0.0
        for r_id_str, weight in rubric_map.items():
            raw_val = scores_input.get(r_id_str, 0)
            try:
                score_val = max(0, min(5, int(raw_val)))
            except (ValueError, TypeError):
                score_val = 0
            scores[r_id_str] = score_val
            total_weighted_score += (score_val / 5.0) * weight

        total_weighted_score = round(total_weighted_score, 2)
        percentage = round((total_weighted_score / max_possible_score) * 100, 1) if max_possible_score > 0 else 0.0

        manager_user = mongo.db.users.find_one({"_id": ObjectId(manager_id)}) or {}
        now = datetime.now(timezone.utc)

        eval_doc = {
            "iteration_id": oid,
            "student_id": st_oid,
            "student_roll": student.get("roll", ""),
            "student_name": student.get("name", "") or student.get("full_name", ""),
            "student_email": student.get("email", ""),
            "course": iteration.get("course"),
            "scores": scores,
            "rubric_snapshot": rubrics,
            "total_weighted_score": total_weighted_score,
            "max_possible_score": max_possible_score,
            "percentage": percentage,
            "feedback": (data.get("feedback") or "").strip(),
            "is_defaulter": bool(data.get("is_defaulter", True)),
            "evaluator_id": ObjectId(manager_id),
            "evaluator_role": Role.MANAGER,
            "evaluator_name": manager_user.get("full_name") or manager_user.get("name") or "PBL Manager",
            "updated_at": now,
        }

        existing = mongo.db.student_evaluations.find_one({"iteration_id": oid, "student_id": st_oid})
        if not existing:
            eval_doc["graded_at"] = now

        mongo.db.student_evaluations.update_one(
            {"iteration_id": oid, "student_id": st_oid},
            {"$set": eval_doc},
            upsert=True
        )

        saved = mongo.db.student_evaluations.find_one({"iteration_id": oid, "student_id": st_oid})
        saved["_id"] = str(saved["_id"])
        saved["iteration_id"] = str(saved["iteration_id"])
        saved["student_id"] = str(saved["student_id"])
        if saved.get("evaluator_id"):
            saved["evaluator_id"] = str(saved["evaluator_id"])
        if isinstance(saved.get("graded_at"), datetime):
            saved["graded_at"] = saved["graded_at"].isoformat()
        if isinstance(saved.get("updated_at"), datetime):
            saved["updated_at"] = saved["updated_at"].isoformat()

        return success_response("Student evaluation saved successfully.", data=saved, status=200)
