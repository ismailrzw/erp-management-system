"""Schemas package for request validation."""

from .student_schema import CreateStudentSchema, UpdateStudentSchema
from .department_schema import CreateDepartmentSchema, UpdateDepartmentSchema
from .course_schema import CreateCourseSchema, UpdateCourseSchema

__all__ = [
    "CreateStudentSchema",
    "UpdateStudentSchema",
    "CreateDepartmentSchema",
    "UpdateDepartmentSchema",
    "CreateCourseSchema",
    "UpdateCourseSchema",
]