# backend/app/services/__init__.py
"""Services package for business logic."""

from .student_service import (
    create_student,
    generate_initial_password,
    generate_student_email,
    get_student_by_id,
    list_students,
    permanent_delete_student,
    restore_student,
    soft_delete_student,
    update_student,
)

__all__ = [
    "create_student",
    "generate_initial_password",
    "generate_student_email",
    "get_student_by_id",
    "list_students",
    "permanent_delete_student",
    "restore_student",
    "soft_delete_student",
    "update_student",
]