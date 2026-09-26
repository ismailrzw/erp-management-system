# backend/app/blueprints/manager/groups.py
"""
Manager Project Group Management Blueprint & RESTX Namespace.

Endpoints:
----------
GET  /api/manager/groups/                 — List all groups with pagination, search, and status filter
GET  /api/manager/groups/<group_id>       — Get single group details
POST /api/manager/groups/<group_id>/approve — Approve a project group
POST /api/manager/groups/<group_id>/reject  — Reject a project group with feedback
"""

from flask import request
from flask_jwt_extended import get_jwt_identity
from flask_restx import Namespace, Resource, fields

from app.extensions import mongo
from app.models.user import Role
from app.services.manager_group_service import (
    approve_group,
    get_manager_group_detail,
    list_manager_groups,
    reject_group,
)
from app.utils.audit import log_audit
from app.utils.decorators import role_required

manager_groups_ns = Namespace(
    "manager_groups", description="Manager Project Group Approval and Oversight"
)

# Swagger Models
reject_model = manager_groups_ns.model("RejectGroup", {
    "reason": fields.String(required=True, description="Reason / feedback for rejecting the group"),
})


@manager_groups_ns.route("/")
class ManagerGroupList(Resource):

    @manager_groups_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def get(self):
        """
        List all project groups with pagination and status filters.
        """
        page = request.args.get("page", 1, type=int)
        limit = request.args.get("limit", 10, type=int)
        status = request.args.get("status", None)
        course = request.args.get("course", None)
        dept = request.args.get("dept", None)
        search = request.args.get("search", None)

        try:
            result = list_manager_groups(
                page=page,
                limit=limit,
                status=status,
                course=course,
                dept=dept,
                search=search,
            )
            return {
                "success": True,
                "message": "Project groups retrieved successfully.",
                "data": result,
            }, 200
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500


@manager_groups_ns.route("/<string:group_id>")
class ManagerGroupDetail(Resource):

    @manager_groups_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def get(self, group_id):
        """
        Get detailed information for a single project group.
        """
        try:
            group = get_manager_group_detail(group_id)
            return {
                "success": True,
                "message": "Group details retrieved.",
                "data": group,
            }, 200
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 404
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500


@manager_groups_ns.route("/<string:group_id>/approve")
class ManagerGroupApprove(Resource):

    @manager_groups_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def post(self, group_id):
        """
        Approve a pending or rejected project group.
        """
        manager_id = get_jwt_identity()
        try:
            group = approve_group(manager_id, group_id)
            log_audit(
                mongo.db,
                manager_id,
                Role.MANAGER,
                "groups",
                "approve",
                target_id=group_id,
                new_value={"status": "approved"},
            )
            return {
                "success": True,
                "message": f"Group '{group.get('name')}' has been approved.",
                "data": group,
            }, 200
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 400
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500


@manager_groups_ns.route("/<string:group_id>/reject")
class ManagerGroupReject(Resource):

    @manager_groups_ns.doc(security="Bearer Auth")
    @manager_groups_ns.expect(reject_model)
    @role_required(Role.MANAGER)
    def post(self, group_id):
        """
        Reject a project group with explanatory guidance feedback.
        """
        manager_id = get_jwt_identity()
        payload = request.get_json() or {}
        reason = payload.get("reason", "").strip()

        if not reason:
            return {"success": False, "message": "Rejection reason / feedback is required."}, 422

        try:
            group = reject_group(manager_id, group_id, reason)
            log_audit(
                mongo.db,
                manager_id,
                Role.MANAGER,
                "groups",
                "reject",
                target_id=group_id,
                new_value={"status": "rejected", "reason": reason},
            )
            return {
                "success": True,
                "message": f"Group '{group.get('name')}' has been rejected with feedback.",
                "data": group,
            }, 200
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 400
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500


send_mail_model = manager_groups_ns.model("SendMailPayload", {
    "target": fields.String(required=True, description="Target audience: all_groups, specific_groups, ungrouped"),
    "group_ids": fields.List(fields.String(), required=False, description="List of group IDs if target is specific_groups"),
    "subject": fields.String(required=True, description="Email subject"),
    "body": fields.String(required=True, description="Email body message"),
})


@manager_groups_ns.route("/send-mail")
class ManagerGroupSendMail(Resource):

    @manager_groups_ns.doc(security="Bearer Auth")
    @manager_groups_ns.expect(send_mail_model)
    @role_required(Role.MANAGER)
    def post(self):
        """
        Send communication emails to students (all groups, specific groups, or ungrouped).
        """
        from bson import ObjectId
        from app.models.group import COLLECTION as GROUPS_COLLECTION, Field as GroupField, Status as GroupStatus
        from app.models.user import UserFields
        from app.services.email_service import send_manager_bulk_mail

        payload = request.get_json() or {}
        raw_target = payload.get("target") or payload.get("recipient_filter") or ""
        target = raw_target.strip().lower()
        if target == "all":
            target = "all_groups"

        subject = payload.get("subject", "").strip()
        body = payload.get("body", "").strip()
        group_ids = payload.get("group_ids", [])

        if not subject:
            return {"success": False, "message": "Email subject is required."}, 422
        if not body:
            return {"success": False, "message": "Email body is required."}, 422
        if not target:
            return {"success": False, "message": "Target audience must be specified."}, 422

        recipients = []

        if target == "all_groups":
            groups = list(mongo.db[GROUPS_COLLECTION].find({
                GroupField.STATUS: {"$ne": GroupStatus.DELETED},
            }))
            student_oids = set()
            for g in groups:
                for m in g.get(GroupField.MEMBER_IDS, []):
                    student_oids.add(m)

            students = list(mongo.db.users.find(
                {"_id": {"$in": list(student_oids)}},
                {UserFields.NAME: 1, UserFields.EMAIL: 1},
            ))
            recipients = [{"email": s.get(UserFields.EMAIL), "name": s.get(UserFields.NAME, "Student")} for s in students if s.get(UserFields.EMAIL)]

        elif target == "specific_groups":
            if not group_ids:
                return {"success": False, "message": "At least one group ID must be selected."}, 422

            g_oids = []
            for gid in group_ids:
                try:
                    g_oids.append(ObjectId(gid))
                except Exception:
                    pass

            groups = list(mongo.db[GROUPS_COLLECTION].find({
                "_id": {"$in": g_oids},
                GroupField.STATUS: {"$ne": GroupStatus.DELETED},
            }))
            student_oids = set()
            for g in groups:
                for m in g.get(GroupField.MEMBER_IDS, []):
                    student_oids.add(m)

            students = list(mongo.db.users.find(
                {"_id": {"$in": list(student_oids)}},
                {UserFields.NAME: 1, UserFields.EMAIL: 1},
            ))
            recipients = [{"email": s.get(UserFields.EMAIL), "name": s.get(UserFields.NAME, "Student")} for s in students if s.get(UserFields.EMAIL)]

        elif target == "ungrouped":
            # Find students without a group
            from app.services.student_service import get_ungrouped_students
            ungrouped = get_ungrouped_students()
            recipients = [{"email": s.get("email"), "name": s.get("name", "Student")} for s in ungrouped if s.get("email")]

        else:
            return {"success": False, "message": f"Unsupported target '{target}'."}, 422

        sent_count = 0
        for r in recipients:
            try:
                success = send_manager_bulk_mail(
                    to_email=r["email"],
                    recipient_name=r["name"],
                    subject=subject,
                    body=body,
                )
                if success:
                    sent_count += 1
            except Exception:
                pass

        return {
            "success": True,
            "message": f"Emails dispatched successfully to {sent_count} recipient(s).",
            "data": {
                "sent_count": sent_count,
                "emails_dispatched": sent_count,
                "total_recipients": len(recipients),
                "target": target,
            },
        }, 200

