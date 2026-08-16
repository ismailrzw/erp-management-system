# backend/app/models/meeting.py
"""Field constants for the meetings collection."""

COLLECTION = "meetings"


class Field:
    ID = "_id"
    GROUP_ID = "group_id"
    ITERATION_ID = "iteration_id"
    EVALUATOR_ID = "evaluator_id"
    TITLE = "title"
    DATE = "date"
    START_TIME = "start_time"
    END_TIME = "end_time"
    AGENDA = "agenda"
    MINUTES = "minutes"
    NEXT_MEETING = "next_meeting"
    CREATED_AT = "created_at"
