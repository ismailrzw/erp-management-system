# backend/app/blueprints/teacher/groups.py
"""
Teacher Groups Management API — Supervised Groups & Sprint Oversight.
"""

from datetime import datetime
from bson import ObjectId
from flask import request
from flask_jwt_extended import get_jwt_identity

from app.blueprints.teacher import teacher_bp
from app.extensions import mongo
from app.models.group import COLLECTION as GROUPS_COLLECTION
from app.models.group import Field as GroupField
from app.models.group import Status as GroupStatus
from app.models.user import Role, UserFields
from app.utils.decorators import role_required


def _serialize_group(doc: dict) -> dict:
    if not doc:
        return None
    res = dict(doc)
    res["id"] = str(res.pop(GroupField.ID, ""))
    for k, v in list(res.items()):
        if isinstance(v, ObjectId):
            res[k] = str(v)
        elif isinstance(v, list):
            res[k] = [str(item) if isinstance(item, ObjectId) else item for item in v]
        elif isinstance(v, datetime):
            res[k] = v.isoformat()

    if res.get(GroupField.PROPOSAL_ATTACHMENT_ID):
        res["proposal_download_url"] = f"/api/attachments/{res[GroupField.PROPOSAL_ATTACHMENT_ID]}/download"
    else:
        res["proposal_download_url"] = None

    return res


@teacher_bp.route("/groups", methods=["GET"], strict_slashes=False)
@teacher_bp.route("/groups/", methods=["GET"], strict_slashes=False)
@role_required(Role.TEACHER)
def get_teacher_groups():
    """List all project groups supervised by the logged-in teacher."""
    try:
        teacher_id = get_jwt_identity()
        t_oid = ObjectId(teacher_id)

        course = request.args.get("course")
        search = request.args.get("search")

        query = {
            "supervisor_id": t_oid,
            GroupField.STATUS: {"$ne": GroupStatus.DELETED},
        }
        if course and course.strip() and course.lower() != "all":
            query[GroupField.COURSE] = course.strip()

        docs = list(mongo.db[GROUPS_COLLECTION].find(query).sort(GroupField.CREATED_AT, -1))

        items = []
        for doc in docs:
            serialized = _serialize_group(doc)
            # Leader info
            leader_oid = doc.get(GroupField.LEADER_ID)
            leader = mongo.db.users.find_one(
                {"_id": leader_oid},
                {UserFields.NAME: 1, UserFields.ROLL: 1, UserFields.EMAIL: 1, UserFields.SECTION: 1},
            ) if leader_oid else None
            if leader:
                serialized["leader_name"] = leader.get(UserFields.NAME, "")
                serialized["leader_roll"] = leader.get(UserFields.ROLL, "")
                serialized["leader_email"] = leader.get(UserFields.EMAIL, "")

            # Member count
            serialized["member_count"] = len(doc.get(GroupField.MEMBER_IDS, []))

            # Search term filter if provided
            if search and search.strip():
                term = search.strip().lower()
                name_match = term in serialized.get("name", "").lower()
                title_match = term in (serialized.get("project_title") or "").lower()
                leader_match = term in (serialized.get("leader_name") or "").lower() or term in (serialized.get("leader_roll") or "").lower()
                if not (name_match or title_match or leader_match):
                    continue

            items.append(serialized)

        return {
            "success": True,
            "message": "Supervised groups retrieved.",
            "data": {"items": items, "total": len(items)},
        }, 200
    except Exception as exc:  # noqa: BLE001
        return {"success": False, "message": str(exc)}, 500


@teacher_bp.route("/groups/<string:group_id>", methods=["GET"], strict_slashes=False)
@role_required(Role.TEACHER)
def get_teacher_group_detail(group_id):
    """Get detailed view of a supervised group, its members, and progress."""
    try:
        teacher_id = get_jwt_identity()
        t_oid = ObjectId(teacher_id)
        g_oid = ObjectId(group_id)

        group = mongo.db[GROUPS_COLLECTION].find_one({
            "_id": g_oid,
            "supervisor_id": t_oid,
            GroupField.STATUS: {"$ne": GroupStatus.DELETED},
        })
        if not group:
            return {"success": False, "message": "Group not found or you are not its supervisor."}, 404

        serialized = _serialize_group(group)

        # Full Member details
        member_oids = group.get(GroupField.MEMBER_IDS, [])
        leader_oid = group.get(GroupField.LEADER_ID)

        members_cursor = mongo.db.users.find(
            {"_id": {"$in": member_oids}},
            {UserFields.NAME: 1, UserFields.ROLL: 1, UserFields.EMAIL: 1, UserFields.SECTION: 1, UserFields.DEPT: 1},
        )
        serialized["members"] = [
            {
                "id": str(m["_id"]),
                "name": m.get(UserFields.NAME, ""),
                "roll": m.get(UserFields.ROLL, ""),
                "email": m.get(UserFields.EMAIL, ""),
                "section": m.get(UserFields.SECTION, ""),
                "dept": m.get(UserFields.DEPT, ""),
                "is_leader": m["_id"] == leader_oid,
            }
            for m in members_cursor
        ]
        serialized["member_count"] = len(serialized["members"])

        # Meetings logs if any
        try:
            meetings = list(mongo.db.meetings.find({"group_id": g_oid}).sort("meeting_date", -1))
            serialized["meetings"] = [
                {
                    "id": str(m["_id"]),
                    "date": m.get("meeting_date", ""),
                    "summary": m.get("summary", ""),
                    "action_items": m.get("action_items", ""),
                }
                for m in meetings
            ]
        except Exception:  # noqa: BLE001
            serialized["meetings"] = []

        return {"success": True, "message": "Group detail retrieved.", "data": serialized}, 200
    except Exception as exc:  # noqa: BLE001
        return {"success": False, "message": str(exc)}, 500
