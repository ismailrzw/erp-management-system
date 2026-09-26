# backend/app/blueprints/teacher/__init__.py
"""
Teacher Blueprint Package.

All teacher (supervisor) routes are registered on this blueprint at /api/teacher/.
"""
from flask import Blueprint

teacher_bp = Blueprint("teacher", __name__)

from app.blueprints.teacher import (
    dashboard,  # noqa: F401
    groups,  # noqa: F401
    profile,  # noqa: F401
    students,  # noqa: F401
    supervisor_requests,  # noqa: F401
)
