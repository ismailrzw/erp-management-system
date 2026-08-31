# backend/app/schemas/__init__.py
"""
Schemas package — Marshmallow validation schemas (API-level Check 1).

All schemas in this package handle the *first* validation gate in the data
lifecycle: they inspect raw incoming JSON, reject malformed or missing fields
with a structured 422 response, and return a clean Python dict to the caller.

Import from here to keep blueprint imports concise, e.g.:
    from app.schemas import CreateStudentSchema, LoginSchema
"""

# Auth
# Announcements
from .announcement_schema import CreateAnnouncementSchema, UpdateAnnouncementSchema

# Attachments
from .attachment_schema import CreateAttachmentSchema, UpdateAttachmentSchema
from .auth_schema import ChangePasswordSchema, LoginSchema

# Courses
from .course_schema import CreateCourseSchema, UpdateCourseSchema

# Departments
from .department_schema import CreateDepartmentSchema, UpdateDepartmentSchema

# Students
from .student_schema import CreateStudentSchema, UpdateStudentSchema

# Teachers / Evaluators
from .teacher_schema import CreateTeacherSchema, UpdateTeacherSchema

__all__ = [
    "ChangePasswordSchema",
    "CreateAnnouncementSchema",
    "CreateAttachmentSchema",
    "CreateCourseSchema",
    "CreateDepartmentSchema",
    "CreateStudentSchema",
    "CreateTeacherSchema",
    "LoginSchema",
    "UpdateAnnouncementSchema",
    "UpdateAttachmentSchema",
    "UpdateCourseSchema",
    "UpdateDepartmentSchema",
    "UpdateStudentSchema",
    "UpdateTeacherSchema",
]