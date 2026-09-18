# backend/app/blueprints/evaluator/__init__.py
"""
Evaluator Blueprint Package — Sprint 4.

All evaluator routes are registered on this blueprint at /api/evaluator/.
"""
from flask import Blueprint

evaluator_bp = Blueprint("evaluator", __name__)

from app.blueprints.evaluator import routes               # noqa: E402, F401
from app.blueprints.evaluator import evaluations          # noqa: E402, F401
from app.blueprints.evaluator import exhibition           # noqa: E402, F401
from app.blueprints.evaluator import meetings             # noqa: E402, F401
from app.blueprints.evaluator import supervisor_requests  # noqa: E402, F401
