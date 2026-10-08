# backend/app/models/teacher.py
"""Evaluator constants — teachers and evaluators live in the ``users`` collection."""

from typing import ClassVar


class EvaluatorType:
    """Type constants for Project evaluator users."""

    INTERNAL = "internal"
    EXTERNAL = "external"
    ALL: ClassVar[tuple] = (INTERNAL, EXTERNAL)
