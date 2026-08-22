# backend/app/models/teacher.py
"""Teacher/Evaluator constants — teachers live in the ``users`` collection."""

from typing import ClassVar


class TeacherType:
    """Type constants for teacher/evaluator users."""

    INTERNAL = "Internal Faculty"
    EXTERNAL = "External Industry"
    ALL: ClassVar[tuple] = (INTERNAL, EXTERNAL)