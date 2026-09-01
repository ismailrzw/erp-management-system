# backend/app/blueprints/student/groups.py
"""
Student Group API endpoints.

Groups routes
-------------
GET  /api/student/groups/my                            — get own group with members
POST /api/student/groups/                              — create a new group (leader)
PUT  /api/student/groups/<group_id>                    — update name/project title (leader only)
POST /api/student/groups/<group_id>/leave              — leave the group (non-leader)
POST /api/student/groups/<group_id>/invite             — invite a peer by roll (leader only)
POST /api/student/groups/<group_id>/remove/<member_id> — remove a member (leader only)
GET  /api/student/students/search                      — find peers by roll fragment

Invitations routes
------------------
GET  /api/student/invitations/pending                  — list pending invitations
POST /api/student/invitations/<id>/accept              — accept an invitation
POST /api/student/invitations/<id>/decline             — decline an invitation

Security
--------
  - All endpoints require JWT with role ``student``.
  - Leader-only actions (invite, remove, update) are enforced at the service layer.
  - A student can only be in ONE group at any time.
  - Groups in ``approved`` or ``evaluated`` status are read-only.
"""

from flask import request
from flask_jwt_extended import get_jwt_identity
from flask_restx import Namespace, Resource, fields
from marshmallow import ValidationError

from app.extensions import mongo
from app.models.user import Role
from app.schemas.group_schema import (
    CreateGroupSchema,
    InviteMemberSchema,
    UpdateGroupSchema,
)
from app.services.group_service import (
    create_group,
    get_my_group,
    get_pending_invitations,
    invite_member,
    leave_group,
    remove_member,
    respond_to_invitation,
    search_students,
    update_group,
)
from app.utils.audit import log_audit
from app.utils.decorators import role_required

# ── Namespaces ─────────────────────────────────────────────────────────────────
student_groups_ns = Namespace(
    "student_groups", description="Student group formation and management"
)
student_invitations_ns = Namespace(
    "student_invitations", description="Student group invitation workflow"
)
student_search_ns = Namespace(
    "student_search", description="Student peer discovery"
)

# ── Swagger request/response models ───────────────────────────────────────────
create_group_model = student_groups_ns.model("CreateGroup", {
    "name":          fields.String(required=True, description="Group name (3–100 chars)"),
    "project_title": fields.String(required=True, description="Project title (5–200 chars)"),
})

update_group_model = student_groups_ns.model("UpdateGroup", {
    "name":          fields.String(description="New group name"),
    "project_title": fields.String(description="New project title"),
})

invite_model = student_groups_ns.model("InviteMember", {
    "roll": fields.String(required=True, description="Roll number of the student to invite"),
})


# ══════════════════════════════════════════════════════════════════════════════
# Group endpoints
# ══════════════════════════════════════════════════════════════════════════════

@student_groups_ns.route("/my")
class MyGroup(Resource):

    @student_groups_ns.doc(security="Bearer Auth")
    @role_required(Role.STUDENT)
    def get(self):
        """Get the authenticated student's current group with full member details."""
        student_id = get_jwt_identity()
        try:
            group = get_my_group(student_id)
            if group is None:
                return {"success": True, "message": "You are not currently in a group.", "data": None}, 200
            return {"success": True, "message": "Group retrieved.", "data": group}, 200
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 404
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500


@student_groups_ns.route("/")
class GroupCreate(Resource):

    @student_groups_ns.doc(security="Bearer Auth")
    @student_groups_ns.expect(create_group_model)
    @role_required(Role.STUDENT)
    def post(self):
        """Create a new pending group.  The calling student becomes the leader."""
        # Check 1 — schema validation
        try:
            validated = CreateGroupSchema().load(request.get_json() or {})
        except ValidationError as exc:
            return {"success": False, "message": "Validation failed.", "errors": exc.messages}, 422

        student_id = get_jwt_identity()

        # Check 2 — service layer
        try:
            group = create_group(student_id, validated["name"], validated["project_title"])
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 409
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500

        log_audit(
            mongo.db, student_id, Role.STUDENT, "groups", "create",
            target_id=group["id"],
            new_value={"name": group["name"], "project_title": group["project_title"]},
        )
        return {"success": True, "message": "Group created successfully.", "data": group}, 201


@student_groups_ns.route("/<string:group_id>")
class GroupDetail(Resource):

    @student_groups_ns.doc(security="Bearer Auth")
    @student_groups_ns.expect(update_group_model)
    @role_required(Role.STUDENT)
    def put(self, group_id):
        """Update group name and/or project title.  Leader only.\n\nOnly pending groups can be modified."""
        # Check 1 — schema validation
        try:
            validated = UpdateGroupSchema().load(request.get_json() or {})
        except ValidationError as exc:
            return {"success": False, "message": "Validation failed.", "errors": exc.messages}, 422

        if not any(v is not None for v in validated.values()):
            return {"success": False, "message": "No fields provided to update."}, 400

        student_id = get_jwt_identity()

        # Check 2 — service layer (enforces leader constraint internally)
        try:
            group = update_group(group_id, student_id, validated)
        except ValueError as exc:
            msg = str(exc)
            code = 403 if "leader" in msg.lower() else 404 if "not found" in msg.lower() else 400
            return {"success": False, "message": msg}, code
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500

        log_audit(
            mongo.db, student_id, Role.STUDENT, "groups", "update",
            target_id=group_id, new_value=validated,
        )
        return {"success": True, "message": "Group updated.", "data": group}, 200


@student_groups_ns.route("/<string:group_id>/leave")
class GroupLeave(Resource):

    @student_groups_ns.doc(security="Bearer Auth")
    @role_required(Role.STUDENT)
    def post(self, group_id):
        """Leave a group.  Non-leader members only.  Leaders cannot leave."""
        student_id = get_jwt_identity()
        try:
            result = leave_group(student_id, group_id)
        except ValueError as exc:
            msg = str(exc)
            code = 400 if "leader" in msg.lower() else 404
            return {"success": False, "message": msg}, code
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500

        log_audit(mongo.db, student_id, Role.STUDENT, "groups", "leave", target_id=group_id)
        return {"success": True, "message": "You have left the group.", "data": result}, 200


@student_groups_ns.route("/<string:group_id>/invite")
class GroupInvite(Resource):

    @student_groups_ns.doc(security="Bearer Auth")
    @student_groups_ns.expect(invite_model)
    @role_required(Role.STUDENT)
    def post(self, group_id):
        """Invite a student by roll number.  Leader only."""
        # Check 1 — schema validation
        try:
            validated = InviteMemberSchema().load(request.get_json() or {})
        except ValidationError as exc:
            return {"success": False, "message": "Validation failed.", "errors": exc.messages}, 422

        student_id = get_jwt_identity()

        # Check 2 — service layer
        try:
            result = invite_member(group_id, student_id, validated["roll"])
        except ValueError as exc:
            msg = str(exc)
            code = 403 if "leader" in msg.lower() else 409 if "already" in msg.lower() else 400
            return {"success": False, "message": msg}, code
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500

        log_audit(
            mongo.db, student_id, Role.STUDENT, "group_invitations", "create",
            target_id=result["invitation_id"],
            new_value={"group_id": group_id, "invited_roll": validated["roll"]},
        )
        return {"success": True, "message": f"Invitation sent to {result['invited_name']}.", "data": result}, 201


@student_groups_ns.route("/<string:group_id>/remove/<string:member_id>")
class GroupRemoveMember(Resource):

    @student_groups_ns.doc(security="Bearer Auth")
    @role_required(Role.STUDENT)
    def post(self, group_id, member_id):
        """Remove a specific member from the group.  Leader only."""
        student_id = get_jwt_identity()
        try:
            result = remove_member(group_id, student_id, member_id)
        except ValueError as exc:
            msg = str(exc)
            code = 403 if "leader" in msg.lower() else 404 if "not found" in msg.lower() else 400
            return {"success": False, "message": msg}, code
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500

        log_audit(
            mongo.db, student_id, Role.STUDENT, "groups", "remove_member",
            target_id=group_id, new_value={"removed_member_id": member_id},
        )
        return {"success": True, "message": "Member removed from group.", "data": result}, 200


# ══════════════════════════════════════════════════════════════════════════════
# Invitation endpoints
# ══════════════════════════════════════════════════════════════════════════════

@student_invitations_ns.route("/pending")
class PendingInvitations(Resource):

    @student_invitations_ns.doc(security="Bearer Auth")
    @role_required(Role.STUDENT)
    def get(self):
        """List all pending group invitations for the authenticated student (pull model)."""
        student_id = get_jwt_identity()
        try:
            invitations = get_pending_invitations(student_id)
            return {
                "success": True,
                "message": "Pending invitations retrieved.",
                "data": {"items": invitations, "total": len(invitations)},
            }, 200
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500


@student_invitations_ns.route("/<string:invitation_id>/accept")
class AcceptInvitation(Resource):

    @student_invitations_ns.doc(security="Bearer Auth")
    @role_required(Role.STUDENT)
    def post(self, invitation_id):
        """Accept a pending group invitation.  Atomically adds student to the group."""
        student_id = get_jwt_identity()
        try:
            result = respond_to_invitation(invitation_id, student_id, accept=True)
        except ValueError as exc:
            msg = str(exc)
            code = 409 if "already" in msg.lower() or "capacity" in msg.lower() else 404
            return {"success": False, "message": msg}, code
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500

        log_audit(
            mongo.db, student_id, Role.STUDENT, "group_invitations", "accept",
            target_id=invitation_id, new_value={"group_id": result.get("group_id")},
        )
        return {"success": True, "message": f"You have joined '{result['group_name']}'.", "data": result}, 200


@student_invitations_ns.route("/<string:invitation_id>/decline")
class DeclineInvitation(Resource):

    @student_invitations_ns.doc(security="Bearer Auth")
    @role_required(Role.STUDENT)
    def post(self, invitation_id):
        """Decline a pending group invitation."""
        student_id = get_jwt_identity()
        try:
            result = respond_to_invitation(invitation_id, student_id, accept=False)
        except ValueError as exc:
            msg = str(exc)
            code = 409 if "already" in msg.lower() else 404
            return {"success": False, "message": msg}, code
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500

        log_audit(
            mongo.db, student_id, Role.STUDENT, "group_invitations", "decline",
            target_id=invitation_id,
        )
        return {"success": True, "message": "Invitation declined.", "data": result}, 200


# ══════════════════════════════════════════════════════════════════════════════
# Peer discovery endpoint
# ══════════════════════════════════════════════════════════════════════════════

@student_search_ns.route("/")
class StudentSearch(Resource):

    @student_search_ns.doc(security="Bearer Auth")
    @role_required(Role.STUDENT)
    def get(self):
        """
        Search students by roll number fragment (same dept + section).

        Query params
        ------------
        roll  — roll number prefix/fragment to search (required, min 1 char)
        """
        student_id = get_jwt_identity()

        # Get the calling student's dept + section to scope the search
        from bson import ObjectId

        from app.extensions import mongo as _mongo
        from app.models.user import UserFields
        caller = _mongo.db[UserFields.COLLECTION].find_one(
            {"_id": ObjectId(student_id)},
            {UserFields.DEPT: 1, UserFields.SECTION: 1},
        )
        if caller is None:
            return {"success": False, "message": "Student account not found."}, 404

        roll_fragment = request.args.get("roll", "").strip()
        if not roll_fragment:
            return {"success": False, "message": "Query parameter 'roll' is required."}, 400

        try:
            results = search_students(
                roll_fragment,
                caller.get(UserFields.DEPT, ""),
                caller.get(UserFields.SECTION, ""),
            )
            return {
                "success": True,
                "message": "Search results retrieved.",
                "data": {"items": results, "total": len(results)},
            }, 200
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500