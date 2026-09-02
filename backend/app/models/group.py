# backend/app/models/group.py
"""
Field and status constants for the groups and group_invitations collections.

Collections
-----------
- ``groups``             : one document per student group.
- ``group_invitations``  : one document per pending/resolved invitation.

Required MongoDB indexes (created by the seed script):
    db.groups.create_index([("dept", 1), ("section", 1), ("course", 1)])
    db.groups.create_index("leader_id")
    db.groups.create_index("member_ids")
    db.group_invitations.create_index([("invited_user_id", 1), ("status", 1)])
    db.group_invitations.create_index("group_id")
    db.group_invitations.create_index(
        [("group_id", 1), ("invited_user_id", 1)],
        unique=True,
        partialFilterExpression={"status": "pending"}
    )  # prevents duplicate pending invitations for the same student
"""

COLLECTION               = "groups"
INVITATIONS_COLLECTION   = "group_invitations"
JOIN_REQUESTS_COLLECTION = "join_requests"


# ── Group status constants ────────────────────────────────────────────────
class Status:
    """Allowed values for groups.status."""
    PENDING   = "pending"
    APPROVED  = "approved"
    REJECTED  = "rejected"
    EVALUATED = "evaluated"
    DELETED   = "deleted"


# ── Invitation status constants ───────────────────────────────────────────
class InvitationStatus:
    """Allowed values for group_invitations.status."""
    PENDING   = "pending"
    ACCEPTED  = "accepted"
    DECLINED  = "declined"
    CANCELLED = "cancelled"


# ── Join Request status constants ─────────────────────────────────────────
class JoinRequestStatus:
    """Allowed values for join_requests.status."""
    PENDING   = "pending"
    ACCEPTED  = "accepted"
    REJECTED  = "rejected"
    CANCELLED = "cancelled"


# ── Group document field constants ────────────────────────────────────────
class Field:
    """MongoDB field-name constants for the groups collection."""
    ID               = "_id"
    NAME             = "name"
    PROJECT_TITLE    = "project_title"
    COURSE           = "course"
    DEPT             = "dept"
    SECTION          = "section"
    LEADER_ID        = "leader_id"
    MEMBER_IDS       = "member_ids"
    STATUS           = "status"
    EVALUATED        = "evaluated"
    VERSION          = "version"
    APPROVED_BY      = "approved_by"
    APPROVED_AT      = "approved_at"
    REJECTED_BY      = "rejected_by"
    REJECTED_AT      = "rejected_at"
    REJECTION_REASON = "rejection_reason"
    CREATED_AT       = "created_at"
    UPDATED_AT       = "updated_at"
    # Soft field added to users collection when a student joins a group.
    # Enables O(1) "am I in a group?" lookup without scanning groups.member_ids.
    GROUP_ID         = "group_id"


# ── Invitation document field constants ──────────────────────────────────
class InvitationField:
    """MongoDB field-name constants for the group_invitations collection."""
    ID           = "_id"
    GROUP_ID     = "group_id"
    INVITED_BY   = "invited_by"
    INVITED_USER = "invited_user_id"
    STATUS       = "status"
    CREATED_AT   = "created_at"
    RESPONDED_AT = "responded_at"


# ── Join Request document field constants ────────────────────────────────
class JoinRequestField:
    """MongoDB field-name constants for the join_requests collection."""
    ID           = "_id"
    GROUP_ID     = "group_id"
    STUDENT_ID   = "student_id"
    STATUS       = "status"
    MESSAGE      = "message"
    CREATED_AT   = "created_at"
    RESPONDED_AT = "responded_at"

