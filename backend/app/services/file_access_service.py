"""Authorize attachment and submission downloads against their academic references."""

from bson import ObjectId

from app.extensions import mongo
from app.services.milestone_service import (
    WorkflowError,
    applicable,
    authorize_group,
    current_user,
    oid,
    refs,
    student_group,
)


def can_read_attachment(user_id, attachment_id):
    user = current_user(user_id)
    if user.get("role") == "pbl_manager":
        return True
    aid = oid(attachment_id)
    group_refs = list(mongo.db.groups.find({"proposal_attachment_id": {"$in": refs(aid)}}))
    for group in group_refs:
        try:
            authorize_group(user, group)
            if group.get("status") != "deleted":
                return True
        except WorkflowError:
            pass
        if user.get("role") == "teacher" and mongo.db.supervisor_requests.find_one({
            "group_id": {"$in": refs(group["_id"])}, "evaluator_id": {"$in": refs(user["_id"])},
        }):
            return True
    if user.get("role") == "teacher" and mongo.db.supervisor_requests.find_one({
        "proposal.attachment.id": str(aid), "evaluator_id": {"$in": refs(user["_id"])},
    }):
        return True
    tasks = list(mongo.db.iterations.find({"$or": [
        {"document_attachment_id": {"$in": refs(aid)}},
        {"document_url": {"$regex": f"/{aid}/download$"}},
    ]}))
    submissions = list(mongo.db.submissions.find({"attachment_id": {"$in": refs(aid)}}))
    for submission in submissions:
        group = mongo.db.groups.find_one({"_id": oid(submission["group_id"]), "status": {"$ne": "deleted"}})
        if group:
            try:
                authorize_group(user, group)
                return True
            except WorkflowError:
                pass
    if tasks:
        if user.get("role") == "student":
            try:
                group = student_group(user)
                return any(applicable(task, group) for task in tasks)
            except ValueError:
                return False
        groups = mongo.db.groups.find({"status": {"$ne": "deleted"}})
        for group in groups:
            try:
                authorize_group(user, group)
                if any(applicable(task, group) for task in tasks):
                    return True
            except WorkflowError:
                pass
    if group_refs or tasks or submissions:
        return False
    attachment = mongo.db.attachments.find_one({"_id": aid})
    if not attachment:
        return False
    if str(attachment.get("uploaded_by")) == str(user["_id"]):
        return True
    if attachment.get("academic_private"):
        return False
    uploader = attachment.get("uploaded_by")
    creator = mongo.db.users.find_one({"_id": ObjectId(str(uploader))}) if ObjectId.is_valid(str(uploader)) else None
    # Preserve general resources published by Manager; student orphan uploads stay private.
    return bool(creator and creator.get("role") == "pbl_manager")


def authorize_attachment(user_id, attachment_id):
    if not can_read_attachment(user_id, attachment_id):
        raise WorkflowError("Attachment not found for your account.", 404)


def visible_attachments(user_id):
    from app.services.attachment_service import list_attachments
    return [item for item in list_attachments() if can_read_attachment(user_id, item["id"])]
