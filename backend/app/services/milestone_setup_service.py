"""Manager milestone validation without changing existing iteration API names."""

from datetime import datetime, timezone

from app.extensions import mongo
from app.services.milestone_service import WorkflowError, deadline_utc, oid
from app.utils.serialization import json_safe


def validate_task_payload(data, existing=None):
    result = dict(data)
    for name in ("title", "course", "details", "document_name", "document_url"):
        if name in result:
            if not isinstance(result[name], str):
                raise WorkflowError(f"{name} must be text.", 422)
            result[name] = result[name].strip()
    combined = {**(existing or {}), **result}
    if not combined.get("title") or len(combined["title"]) > 200:
        raise WorkflowError("Milestone Title is required (maximum 200 characters).", 422)
    course = combined.get("course")
    if course != "All Courses":
        record = mongo.db.courses.find_one({"name": course, "deleted": {"$ne": True}})
        if not record or not mongo.db.departments.find_one({"code": record["dept"], "deleted": {"$ne": True}}):
            raise WorkflowError("Select an active Target Course.", 422)
        result["course_id"] = record["_id"]
    else:
        result["course_id"] = None
    if "deadline" in result or not existing:
        result["deadline"] = deadline_utc(combined.get("deadline")).isoformat()
    if "late_penalty_percent" in result or not existing:
        value = result.get("late_penalty_percent", 0)
        if isinstance(value, bool) or not isinstance(value, int) or not 0 <= value <= 100:
            raise WorkflowError("Late penalty must be an integer percentage between 0 and 100.", 422)
        result["late_penalty_percent"] = value
    if not existing:
        sprint = mongo.db.sprints.find_one({"_id": oid(result["sprint_id"]), "deleted": {"$ne": True}}) if result.get("sprint_id") else mongo.db.sprints.find_one({"name": result.get("sprint_name"), "deleted": {"$ne": True}})
        if not sprint:
            raise WorkflowError("Create a Sprint first, then use its Add Milestone action.", 409)
        result["sprint_id"] = sprint["_id"]
        result["sprint_name"] = sprint["name"]
        previous = mongo.db.iterations.find({"$or": [{"sprint_id": sprint["_id"]}, {"sprint_name": sprint["name"]}]})
        result["milestone_order"] = max((int(item.get("milestone_order", 0)) for item in previous), default=0) + 1
    elif any(key in data for key in ("sprint_id", "sprint_name", "milestone_order", "milestone_type")):
        raise WorkflowError("Sprint association and milestone order are assigned automatically.", 422)
    reference = result.get("rubric_template_id")
    if reference:
        template = mongo.db.rubric_templates.find_one({"_id": oid(reference), "deleted": {"$ne": True}})
        if not template or template.get("course") not in (None, "All Courses", course):
            raise WorkflowError("The selected rubric template does not apply to this Target Course.", 422)
        result["rubric_template_id"] = template["_id"]
        result["rubrics"] = template.get("criteria", [])
    attachment = result.get("document_attachment_id")
    if attachment:
        record = mongo.db.attachments.find_one({"_id": oid(attachment)})
        if not record:
            raise WorkflowError("Instruction document not found.", 422)
        result["document_attachment_id"] = record["_id"]
        result["document_name"] = record["original_filename"]
        result["document_url"] = f"/api/manager/attachments/{record['_id']}/download"
    return result


def graded(task_id):
    return bool(mongo.db.evaluations.find_one({"iteration_id": oid(task_id)}) or
                mongo.db.student_evaluations.find_one({"iteration_id": oid(task_id)}))


def update_task(task_id, data):
    task = mongo.db.iterations.find_one({"_id": oid(task_id), "deleted": {"$ne": True}})
    if not task:
        raise WorkflowError("Milestone not found.", 404)
    if data.get("expected_version") is not None and data["expected_version"] != task.get("version", 1):
        raise WorkflowError("This milestone changed. Refresh before saving.", 409)
    if graded(task_id):
        raise WorkflowError("Graded milestone policy and criteria are locked to preserve academic results.", 409)
    allowed = {"title", "course", "deadline", "details", "document_url", "document_name", "document_attachment_id", "late_penalty_percent", "rubric_template_id"}
    if set(data) - allowed - {"expected_version"}:
        raise WorkflowError("This edit includes fields that are assigned automatically.", 422)
    if "course" in data and data["course"] != task.get("course") and mongo.db.submissions.find_one({"iteration_id": task["_id"]}):
        raise WorkflowError("Target Course cannot change after group submissions exist.", 409)
    update = validate_task_payload({key: value for key, value in data.items() if key in allowed}, task)
    mongo.db.milestone_changes.insert_one({"iteration_id": task["_id"], "previous": task, "changed_at": datetime.now(timezone.utc)})
    mongo.db.iterations.update_one({"_id": task["_id"]}, {"$set": {**update, "updatedAt": datetime.now(timezone.utc)}, "$inc": {"version": 1}})
    return json_safe(mongo.db.iterations.find_one({"_id": task["_id"]}))
