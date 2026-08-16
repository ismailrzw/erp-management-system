# backend/app/models/evaluation.py
"""Field constants for the evaluations collection."""

COLLECTION = "evaluations"


class Field:
    ID = "_id"
    GROUP_ID = "group_id"
    ITERATION_ID = "iteration_id"
    EVALUATOR_ID = "evaluator_id"
    SCORES = "scores"
    TOTAL_WEIGHTED_SCORE = "total_weighted_score"
    COMMENT = "comment"
    LOCKED = "locked"
    SUBMITTED_AT = "submitted_at"
