# backend/app/services/__init__.py
"""Services package for business logic."""

from .student_service import (
    create_student,
    get_student_by_id,
    list_students,
    update_student,
    soft_delete_student,
    restore_student,
    permanent_delete_student,
    generate_student_email,
    generate_initial_password,
)

__all__ = [
    "create_student",
    "get_student_by_id",
    "list_students",
    "update_student",
    "soft_delete_student",
    "restore_student",
    "permanent_delete_student",
    "generate_student_email",
    "generate_initial_password",
]