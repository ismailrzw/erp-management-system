# backend/app/blueprints/evaluator/__init__.py
"""
Evaluator Blueprint Package — Sprint 4.

All evaluator routes are registered on this blueprint at /api/evaluator/.
"""
from flask import Blueprint

evaluator_bp = Blueprint("evaluator", __name__)

from app.blueprints.evaluator import (
    evaluations,  # noqa: F401
    exhibition,  # noqa: F401
    meetings,  # noqa: F401
    routes,  # noqa: F401
    supervisor_requests,  # noqa: F401
)
