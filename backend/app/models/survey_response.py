# backend/app/models/survey_response.py
"""Field constants for the survey_responses collection."""

COLLECTION = "survey_responses"


class Field:
    ID = "_id"
    SURVEY_ID = "survey_id"
    STUDENT_ID = "student_id"
    ANSWERS = "answers"
    SUBMITTED_AT = "submitted_at"
