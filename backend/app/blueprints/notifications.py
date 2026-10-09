"""Persistent, audience-scoped announcement history for every authenticated role."""

from datetime import datetime, timezone

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity

from app.extensions import mongo
from app.models.user import Role
from app.services.milestone_service import current_user, oid, refs
from app.utils.decorators import role_required
from app.utils.responses import error_response, success_response
from app.utils.serialization import json_safe

notifications_bp = Blueprint("notifications", __name__)


def audience_query(user):
    if user.get("role") in ("pbl_manager", "dean"):
        return {}
    groups = []
    if user.get("role") == "student":
        groups = list(mongo.db.groups.find({"member_ids": {"$in": refs(user["_id"])}, "status": {"$ne": "deleted"}}))
    elif user.get("role") == "teacher":
        groups = list(mongo.db.groups.find({"supervisor_id": {"$in": refs(user["_id"])}, "status": {"$ne": "deleted"}}))
    elif user.get("role") == "evaluator":
        assignments = mongo.db.assignments.find({"evaluator_id": {"$in": refs(user["_id"])}})
        ids = [oid(a["group_id"]) for a in assignments]
        groups = list(mongo.db.groups.find({"_id": {"$in": ids}, "status": {"$ne": "deleted"}}))
    code = user.get("dept", "")
    return {"$or": [
        {"scope": {"$in": ["broadcast", None]}}, {"scope": {"$exists": False}},
        {"scope": "department", "target_ids": {"$in": list({code, code.upper(), code.lower()}) if code else []}},
        {"scope": "group", "target_ids": {"$in": [str(group["_id"]) for group in groups]}},
    ]}


def history(user_id, page=1, limit=20):
    user = current_user(user_id)
    query = audience_query(user)
    views = list(mongo.db.announcement_views.find({"user_id": user["_id"]}))
    viewed = {str(view["announcement_id"]): view.get("viewed_at") for view in views}
    documents = list(mongo.db.announcements.find(query).sort("created_at", -1).skip((page - 1) * limit).limit(limit))
    items = []
    for document in documents:
        item = dict(document)
        item["id"] = str(item.pop("_id"))
        item["is_read"] = item["id"] in viewed
        item["is_recent"] = not item["is_read"]
        item["read_at"] = viewed.get(item["id"])
        items.append(item)
    unread = mongo.db.announcements.count_documents({"$and": [query, {
        "_id": {"$nin": [oid(key) for key in viewed]},
    }]})
    return json_safe({"items": items, "total": mongo.db.announcements.count_documents(query),
                      "page": page, "unread_count": unread})


@notifications_bp.route("", methods=["GET"])
@role_required(*Role.ALL)
def feed():
    try:
        page = max(1, int(request.args.get("page", 1)))
        limit = min(50, max(1, int(request.args.get("limit", 20))))
        return success_response(data=history(get_jwt_identity(), page, limit))
    except ValueError as exc:
        return error_response(str(exc), getattr(exc, "status_code", 400))


@notifications_bp.route("/<announcement_id>/read", methods=["POST"])
@role_required(*Role.ALL)
def read(announcement_id):
    try:
        user = current_user(get_jwt_identity())
        document = mongo.db.announcements.find_one({"$and": [{"_id": oid(announcement_id)}, audience_query(user)]})
        if not document:
            return error_response("Announcement not found.", 404)
        mongo.db.announcement_views.update_one({"user_id": user["_id"], "announcement_id": document["_id"]}, {
            "$setOnInsert": {"viewed_at": datetime.now(timezone.utc)},
        }, upsert=True)
        return success_response("Announcement marked read.")
    except ValueError as exc:
        return error_response(str(exc), getattr(exc, "status_code", 400))
