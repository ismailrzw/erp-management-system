"""Shared task eligibility, submissions, private comments and Supervisor grading."""

from datetime import datetime, time, timedelta, timezone

from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from app.extensions import mongo
from app.services.academic_integrity_service import validate_enrollment
from app.services.academic_write_service import academic_write
from app.services.attachment_service import delete_attachment, upload_attachment
from app.utils.serialization import json_safe

LOCAL_TIMEZONE = timezone(timedelta(hours=5))


class WorkflowError(ValueError):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status_code = status


def oid(value):
    if not ObjectId.is_valid(str(value)):
        raise WorkflowError("Invalid record ID.")
    return ObjectId(str(value))


def refs(value):
    return [oid(value), str(value)]


def current_user(user_id):
    user = mongo.db.users.find_one({"_id": oid(user_id), "deleted": {"$ne": True}})
    if not user:
        raise WorkflowError("Your account is unavailable. Please sign in again.", 401)
    return user


def deadline_utc(value):
    """Legacy date-only means local end-of-day; naive times mean Asia/Karachi."""
    try:
        if isinstance(value, datetime):
            result = value
        elif isinstance(value, str) and len(value) == 10:
            result = datetime.combine(datetime.fromisoformat(value).date(), time(23, 59, 59))
        else:
            result = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return (result if result.tzinfo else result.replace(tzinfo=LOCAL_TIMEZONE)).astimezone(timezone.utc)
    except (ValueError, TypeError) as exc:
        raise WorkflowError("The deadline needs correction by the Manager.", 409) from exc


def student_group(user):
    group = mongo.db.groups.find_one({"member_ids": {"$in": refs(user["_id"])}, "status": {"$ne": "deleted"}})
    if not group:
        raise WorkflowError("Join or create a group to view its milestones.", 403)
    validate_enrollment(group.get("dept", ""), group.get("course", ""))
    if user.get("course") != group.get("course") or user.get("dept") != group.get("dept"):
        raise WorkflowError("Your enrollment and group disagree. Contact the Manager for correction.", 409)
    return group


def applicable(task, group):
    return not task.get("deleted") and task.get("course") in (group.get("course"), "All Courses")


def authorize_group(user, group):
    role = user.get("role")
    if role == "pbl_manager":
        return
    if role == "student" and str(user["_id"]) in [str(m) for m in group.get("member_ids", [])]:
        return
    if role == "teacher" and str(group.get("supervisor_id")) == str(user["_id"]):
        return
    if role == "evaluator" and mongo.db.assignments.find_one({
        "group_id": {"$in": refs(group["_id"])}, "evaluator_id": {"$in": refs(user["_id"])},
    }):
        return
    raise WorkflowError("This group is not available to your account.", 403)


def task_access(user_id, task_id, group_id=None, submit=False):
    user = current_user(user_id)
    if user["role"] == "student":
        group = student_group(user)
        if group_id and str(group["_id"]) != str(group_id):
            raise WorkflowError("Group not found.", 404)
    else:
        group = mongo.db.groups.find_one({"_id": oid(group_id), "status": {"$ne": "deleted"}}) if group_id else None
        if not group:
            raise WorkflowError("Group not found.", 404)
        authorize_group(user, group)
    task = mongo.db.iterations.find_one({"_id": oid(task_id), "deleted": {"$ne": True}})
    if not task or not applicable(task, group):
        raise WorkflowError("Milestone not found for this group.", 404)
    if submit and group.get("status") != "approved":
        raise WorkflowError("Manager approval is required before submission or grading.", 403)
    return user, group, task


def pair_query(group, task):
    return {"group_id": {"$in": refs(group["_id"])}, "iteration_id": {"$in": refs(task["_id"])}}


def group_grade(group, task):
    return mongo.db.evaluations.find_one({**pair_query(group, task), "mode": "supervisor_group"})


def task_view(user, group, task):
    result = dict(task)
    result["id"] = str(task["_id"])
    try:
        deadline = deadline_utc(task.get("deadline"))
    except WorkflowError:
        deadline = None
    result["deadline"] = deadline.isoformat() if deadline else None
    result["deadline_invalid"] = deadline is None
    submission = mongo.db.submissions.find_one(pair_query(group, task))
    grade = group_grade(group, task)
    if submission:
        submission = dict(submission)
        submission["id"] = str(submission["_id"])
        submission["file_url"] = f"/api/files/submissions/{submission['_id']}"
        submitter = mongo.db.users.find_one({"_id": oid(submission["submitted_by"])}) if submission.get("submitted_by") else None
        submission["submitted_by_name"] = submitter.get("name", "Unknown") if submitter else "Unknown"
    result["submission"] = submission
    result["has_submitted"] = bool(submission)
    result["group_status"] = group.get("status")
    locked = bool(grade or mongo.db.evaluations.find_one(pair_query(group, task)))
    result["submission_locked"] = locked
    result["can_submit"] = bool(group.get("status") == "approved" and not locked and deadline)
    result["can_unsubmit"] = bool(submission and not locked and deadline and datetime.now(timezone.utc) < deadline)
    if submission and (not deadline or datetime.now(timezone.utc) >= deadline):
        result["can_submit"] = False
    result["grade"] = grade
    # Keep the existing student evaluation shape for independent legacy marking.
    result["student_evaluation"] = grade or mongo.db.student_evaluations.find_one({
        "iteration_id": task["_id"], "student_id": user["_id"],
    })
    result["comment_recipients"] = []
    for kind, reference in (("supervisor", group.get("supervisor_id")), ("manager", task.get("created_by"))):
        recipient = mongo.db.users.find_one({"_id": oid(reference), "deleted": {"$ne": True}}) if reference and ObjectId.is_valid(str(reference)) else None
        if recipient:
            result["comment_recipients"].append({"id": str(recipient["_id"]), "kind": kind, "name": recipient.get("name")})
    return json_safe(result)


@academic_write
def submit_task(student_id, task_id, file, note="", expected_submission=None):
    user, group, task = task_access(student_id, task_id, submit=True)
    if user["role"] != "student":
        raise WorkflowError("Only current group members can submit.", 403)
    deadline_utc(task["deadline"])
    existing = mongo.db.submissions.find_one(pair_query(group, task))
    if group_grade(group, task) or mongo.db.evaluations.find_one(pair_query(group, task)):
        raise WorkflowError("Graded submissions are locked.", 409)
    if existing and datetime.now(timezone.utc) >= deadline_utc(task["deadline"]):
        raise WorkflowError("An existing submission cannot be changed after the deadline.", 409)
    if (existing and str(existing["_id"]) != str(expected_submission)) or (not existing and expected_submission):
        raise WorkflowError("Another member changed the submission. Refresh before trying again.", 409)
    try:
        mongo.db.submissions.create_index([("group_id", 1), ("iteration_id", 1)], unique=True)
    except DuplicateKeyError as exc:
        raise WorkflowError("Duplicate historical submissions need Manager correction.", 409) from exc
    attachment = upload_attachment(file, f"Milestone — {task['title']}", str(user["_id"]))
    now = datetime.now(timezone.utc)
    try:
        # Commit-time approval, target and deadline checks also cover uploads crossing the deadline.
        task_access(student_id, task_id, submit=True)
        if existing and now >= deadline_utc(task["deadline"]):
            raise WorkflowError("The deadline passed while uploading; the previous submission is preserved.", 409)
        document = {
            "group_id": group["_id"], "iteration_id": task["_id"], "submitted_by": user["_id"],
            "attachment_id": oid(attachment["id"]), "file_name": attachment["original_filename"],
            "file_url": attachment.get("file_url"), "file_size": attachment["size"], "note": note[:20000],
            "submitted_at": now, "is_late": now > deadline_utc(task["deadline"]),
            "deadline_snapshot": deadline_utc(task["deadline"]), "late_penalty_percent": task.get("late_penalty_percent", 0),
        }
        if existing:
            mongo.db.submission_history.insert_one({"submission": existing, "action": "replace", "at": now, "actor": user["_id"]})
            mongo.db.submissions.update_one({"_id": existing["_id"]}, {"$set": document})
        else:
            mongo.db.submissions.insert_one(document)
    except Exception:
        delete_attachment(attachment["id"])
        raise
    return task_view(user, group, task)


@academic_write
def unsubmit_task(student_id, task_id, expected_submission):
    user, group, task = task_access(student_id, task_id, submit=True)
    submission = mongo.db.submissions.find_one(pair_query(group, task))
    if not submission or str(submission["_id"]) != str(expected_submission):
        raise WorkflowError("The submission changed. Refresh first.", 409)
    if datetime.now(timezone.utc) >= deadline_utc(task["deadline"]) or mongo.db.evaluations.find_one(pair_query(group, task)):
        raise WorkflowError("This submission is locked after grading or the deadline.", 409)
    mongo.db.submission_history.insert_one({"submission": submission, "action": "unsubmit", "at": datetime.now(timezone.utc), "actor": user["_id"]})
    mongo.db.submissions.delete_one({"_id": submission["_id"]})
    return task_view(user, group, task)


@academic_write
def grade_task(teacher_id, group_id, task_id, scores, feedback=""):
    user, group, task = task_access(teacher_id, task_id, group_id, submit=True)
    if user["role"] != "teacher" or str(group.get("supervisor_id")) != str(user["_id"]):
        raise WorkflowError("Only the assigned Supervisor can submit this group grade.", 403)
    submission = mongo.db.submissions.find_one(pair_query(group, task))
    if not submission:
        raise WorkflowError("No group submission is available to grade.", 409)
    if group_grade(group, task):
        raise WorkflowError("This Supervisor grade is already submitted and locked.", 409)
    rubrics = task.get("rubrics") or []
    keys = {str(r["id"]) for r in rubrics}
    if not rubrics or not isinstance(scores, dict) or set(scores) != keys:
        raise WorkflowError("Provide a score for every Manager-defined rubric criterion.", 422)
    if any(isinstance(v, bool) or not isinstance(v, int) or not 0 <= v <= 5 for v in scores.values()):
        raise WorkflowError("Rubric scores must be integers from 0 to 5.", 422)
    raw = round(sum(scores[str(r["id"])] / 5 * float(r["weight"]) for r in rubrics), 2)
    if "deadline_snapshot" not in submission or "late_penalty_percent" not in submission:
        raise WorkflowError("The Manager must confirm the historical submission deadline and penalty before grading.", 409)
    penalty = submission["late_penalty_percent"] if submission.get("is_late") else 0
    deduction = round(raw * penalty / 100, 2)
    final = max(0, round(raw - deduction, 2))
    maximum = sum(float(r["weight"]) for r in rubrics)
    grade = {"group_id": group["_id"], "iteration_id": task["_id"], "evaluator_id": user["_id"],
             "evaluator_name": user.get("name"), "scores": scores, "rubric_snapshot": rubrics,
             "raw_score": raw, "late_penalty_percent": penalty, "deduction": deduction, "final_score": final,
             "total_weighted_score": final, "max_possible_score": maximum, "percentage": round(final / maximum * 100, 2),
             "feedback": feedback[:20000], "mode": "supervisor_group", "locked": True,
             "submitted_at": datetime.now(timezone.utc)}
    grade["_id"] = mongo.db.evaluations.insert_one(grade).inserted_id
    return json_safe(grade)


def comments_for(user_id, task_id, group_id=None):
    user, group, task = task_access(user_id, task_id, group_id)
    query = {**pair_query(group, task), "$or": [{"student_id": user["_id"]}, {"recipient_id": user["_id"]}]}
    return json_safe(list(mongo.db.milestone_comments.find(query).sort("created_at", 1)))


@academic_write
def post_comment(user_id, task_id, body, group_id=None):
    user, group, task = task_access(user_id, task_id, group_id)
    content = (body.get("content") or "").strip()
    if not 1 <= len(content) <= 5000:
        raise WorkflowError("Private comments must contain 1–5000 characters.", 422)
    if user["role"] == "student":
        recipient_id = oid(body.get("recipient_id"))
        if str(recipient_id) not in [str(group.get("supervisor_id")), str(task.get("created_by"))]:
            raise WorkflowError("Select the assigned Supervisor or milestone creator.", 403)
        current_user(recipient_id)
        student_id = user["_id"]
    else:
        parent = mongo.db.milestone_comments.find_one({"_id": oid(body.get("reply_to")), **pair_query(group, task)})
        if not parent or str(parent["recipient_id"]) != str(user["_id"]):
            raise WorkflowError("You can only reply to a private comment addressed to you.", 403)
        student_id, recipient_id = parent["student_id"], user["_id"]
    key = body.get("client_key")
    if not isinstance(key, str) or not 1 <= len(key) <= 100:
        raise WorkflowError("A comment retry identifier is required.", 422)
    mongo.db.milestone_comments.update_one({"author_id": user["_id"], "client_key": key}, {"$setOnInsert": {
        "group_id": group["_id"], "iteration_id": task["_id"], "student_id": student_id,
        "recipient_id": recipient_id, "author_id": user["_id"], "author_name": user.get("name"),
        "content": content, "created_at": datetime.now(timezone.utc),
    }}, upsert=True)
    return comments_for(user_id, task_id, str(group["_id"]))


@academic_write
def confirm_submission_policy(manager_id, group_id, task_id, body):
    user, group, task = task_access(manager_id, task_id, group_id)
    if user["role"] != "pbl_manager":
        raise WorkflowError("Only the Manager can confirm historical submission policy.", 403)
    submission = mongo.db.submissions.find_one(pair_query(group, task))
    if not submission or mongo.db.evaluations.find_one(pair_query(group, task)):
        raise WorkflowError("Only an existing, ungraded submission can be corrected.", 409)
    if "deadline_snapshot" in submission and "late_penalty_percent" in submission:
        raise WorkflowError("The submission already has a recorded policy.", 409)
    percent = body.get("late_penalty_percent")
    if isinstance(percent, bool) or not isinstance(percent, int) or not 0 <= percent <= 100:
        raise WorkflowError("Confirm a penalty percentage between 0 and 100.", 422)
    deadline = deadline_utc(body.get("deadline"))
    submitted = submission.get("submitted_at")
    if not isinstance(submitted, datetime):
        raise WorkflowError("The historical submission timestamp needs correction.", 409)
    submitted = submitted if submitted.tzinfo else submitted.replace(tzinfo=timezone.utc)
    mongo.db.submission_history.insert_one({**submission, "archived_at": datetime.now(timezone.utc), "reason": "Manager-confirmed historical policy"})
    mongo.db.submissions.update_one({"_id": submission["_id"]}, {"$set": {
        "deadline_snapshot": deadline, "late_penalty_percent": percent, "is_late": submitted > deadline,
        "policy_confirmed_by": user["_id"], "policy_confirmed_at": datetime.now(timezone.utc),
    }})
    return task_view(user, group, task)
