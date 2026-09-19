# backend/app/models/supervisor_request.py
"""
Supervisor Request Model — constants for supervisor request workflow.
"""

COLLECTION = "supervisor_requests"


class SupervisorRequestStatus:
    PENDING   = "pending"
    ACCEPTED  = "accepted"
    REJECTED  = "rejected"
    CANCELLED = "cancelled"


class SupervisorRequestFields:
    COLLECTION       = "supervisor_requests"
    ID               = "_id"
    GROUP_ID         = "group_id"
    EVALUATOR_ID     = "evaluator_id"
    REQUESTED_BY     = "requested_by"
    STATUS           = "status"
    REQUEST_MESSAGE  = "request_message"
    REJECTION_REASON = "rejection_reason"
    CREATED_AT       = "created_at"
    RESPONDED_AT     = "responded_at"
