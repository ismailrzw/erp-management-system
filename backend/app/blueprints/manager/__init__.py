# backend/app/blueprints/manager/__init__.py
"""Manager blueprints package."""

from .dashboard import dashboard_bp, dashboard_ns
from .students import students_bp, students_ns

__all__ = [
    "dashboard_bp",
    "dashboard_ns",
    "students_bp",
    "students_ns",
]