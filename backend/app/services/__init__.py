# backend/app/services/__init__.py
"""
Services package — business logic layer.

Each module in this package is responsible for one domain entity.
Services receive clean, validated data from schemas (already loaded by
the blueprint) and perform database queries, password hashing, and other
business logic.  They return plain Python dicts; they never touch HTTP.

Import from here to keep blueprint imports concise, e.g.:
    from app.services import create_student, authenticate_user
"""

# Authentication
# Announcements
from .announcement_service import (
    create_announcement,
    delete_announcement,
    get_announcement_by_id,
    list_announcements,
    update_announcement,
)

# Attachments
from .attachment_service import (
    delete_attachment,
    download_attachment,
    get_attachment_by_id,
    list_attachments,
    update_attachment,
    upload_attachment,
)
from .auth_service import AuthService

# Bulk import
from .bulk_import_service import bulk_create_students, parse_excel

# Courses
from .course_service import (
    create_course,
    get_course_by_id,
    list_courses,
    permanent_delete_course,
    restore_course,
    soft_delete_course,
    update_course,
)

# Departments
from .department_service import (
    create_department,
    get_department_by_id,
    list_departments,
    permanent_delete_department,
    restore_department,
    soft_delete_department,
    update_department,
)

# Students
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

# Teachers / Evaluators
from .teacher_service import (
    create_teacher,
    get_teacher_by_id,
    list_teachers,
    permanent_delete_teacher,
    restore_teacher,
    soft_delete_teacher,
    update_teacher,
)

# General user management
from .user_service import UserService

__all__ = [
    "AuthService",
    "UserService",
    "bulk_create_students",
    "create_announcement",
    "create_course",
    "create_department",
    "create_student",
    "create_teacher",
    "delete_announcement",
    "delete_attachment",
    "download_attachment",
    "generate_initial_password",
    "generate_student_email",
    "get_announcement_by_id",
    "get_attachment_by_id",
    "get_course_by_id",
    "get_department_by_id",
    "get_student_by_id",
    "get_teacher_by_id",
    "list_announcements",
    "list_attachments",
    "list_courses",
    "list_departments",
    "list_students",
    "list_teachers",
    "parse_excel",
    "permanent_delete_course",
    "permanent_delete_department",
    "permanent_delete_student",
    "permanent_delete_teacher",
    "restore_course",
    "restore_department",
    "restore_student",
    "restore_teacher",
    "soft_delete_course",
    "soft_delete_department",
    "soft_delete_student",
    "soft_delete_teacher",
    "update_announcement",
    "update_attachment",
    "update_course",
    "update_department",
    "update_student",
    "update_teacher",
    "upload_attachment",
]