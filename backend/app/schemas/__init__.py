# backend/app/schemas/__init__.py
"""Schemas package for request validation."""

from .course_schema import CreateCourseSchema, UpdateCourseSchema
from .department_schema import CreateDepartmentSchema, UpdateDepartmentSchema
from .student_schema import CreateStudentSchema, UpdateStudentSchema

__all__ = [
    "CreateCourseSchema",
    "CreateDepartmentSchema",
    "CreateStudentSchema",
    "UpdateCourseSchema",
    "UpdateDepartmentSchema",
    "UpdateStudentSchema",
]