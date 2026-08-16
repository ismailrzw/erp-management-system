# backend/app/models/assignment.py
"""Field constants for the assignments collection."""

COLLECTION = "assignments"


class Field:
    ID = "_id"
    EVALUATOR_ID = "evaluator_id"
    GROUP_ID = "group_id"
    ITERATION_IDS = "iteration_ids"
    ASSIGNED_AT = "assigned_at"
    ASSIGNED_BY = "assigned_by"
