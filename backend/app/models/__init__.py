# backend/app/models/__init__.py
"""
Models package.

Each module in this package contains *only* field-name constants, role/status
constants, and lightweight pure-Python helpers (e.g., password hashing).
There are no ORM classes — the project uses raw PyMongo dicts for persistence
and Marshmallow schemas for validation.
"""
from .announcement import AnnouncementFields
from .attachment import COLLECTION as ATTACHMENT_COLLECTION
from .attachment import AttachmentFields
from .course import COLLECTION as COURSE_COLLECTION
from .course import Field as CourseField
from .department import DepartmentFields
from .group import COLLECTION as GROUP_COLLECTION
from .group import Field as GroupField
from .group import Status as GroupStatus
from .student import COLLECTION as STUDENT_COLLECTION
from .student import Field as StudentField
from .teacher import TeacherType
from .user import Role, UserFields, hash_password, utcnow, verify_password

__all__ = [
    "ATTACHMENT_COLLECTION",
    "COURSE_COLLECTION",
    "GROUP_COLLECTION",
    "STUDENT_COLLECTION",
    "AnnouncementFields",
    "AttachmentFields",
    "CourseField",
    "DepartmentFields",
    "GroupField",
    "GroupStatus",
    "Role",
    "StudentField",
    "TeacherType",
    "UserFields",
    "hash_password",
    "utcnow",
    "verify_password",
]
