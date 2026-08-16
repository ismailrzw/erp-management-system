# backend/app/models/exhibition_evaluation.py
"""Field constants for the exhibition_evaluations collection."""

COLLECTION = "exhibition_evaluations"


class Field:
    ID = "_id"
    GROUP_ID = "group_id"
    EVALUATOR_ID = "evaluator_id"
    SCORES = "scores"
    TOTAL_WEIGHTED_SCORE = "total_weighted_score"
    COMMENT = "comment"
    LOCKED = "locked"
    SUBMITTED_AT = "submitted_at"
