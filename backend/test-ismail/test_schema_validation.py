#!/usr/bin/env python3
"""
Direct schema validation test script.

Run from the backend root with venv activated:
    python test-ismail/test_schema_validation.py

This tests every Marshmallow schema in the project with both valid and
invalid payloads, INDEPENDENT of the HTTP API and the database.  If every
test passes, it proves Layer 1 (schema validation) is working correctly.
"""
import io
import os
import sys

# Fix Windows encoding so emoji/unicode characters print correctly
if sys.stdout.encoding != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# Add backend root to path so we can import app modules
BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from marshmallow import ValidationError

from app.schemas.announcement_schema import (
    CreateAnnouncementSchema,
)
from app.schemas.attachment_schema import CreateAttachmentSchema

# ── Import all schemas ──────────────────────────────────────
from app.schemas.auth_schema import ChangePasswordSchema, LoginSchema
from app.schemas.course_schema import CreateCourseSchema
from app.schemas.department_schema import CreateDepartmentSchema
from app.schemas.student_schema import CreateStudentSchema, UpdateStudentSchema
from app.schemas.teacher_schema import CreateTeacherSchema, UpdateTeacherSchema

# ── Test infrastructure ─────────────────────────────────────
results = []
total_pass = 0
total_fail = 0


def test_valid(schema_cls, payload, test_id, description):
    """Test that a payload is ACCEPTED by the schema."""
    global total_pass, total_fail
    try:
        data = schema_cls().load(payload)
        results.append(("✅ PASS", test_id, description, f"Loaded OK → {data}"))
        total_pass += 1
    except ValidationError as exc:
        results.append(("❌ FAIL", test_id, description, f"UNEXPECTED rejection: {exc.messages}"))
        total_fail += 1


def test_invalid(schema_cls, payload, test_id, description, expected_fields=None):
    """Test that a payload is REJECTED by the schema."""
    global total_pass, total_fail
    try:
        data = schema_cls().load(payload)
        results.append(("❌ FAIL", test_id, description, f"SHOULD have been rejected but loaded: {data}"))
        total_fail += 1
    except ValidationError as exc:
        if expected_fields:
            missing = [f for f in expected_fields if f not in exc.messages]
            if missing:
                results.append(("❌ FAIL", test_id, description,
                                f"Expected errors on {expected_fields} but got: {list(exc.messages.keys())}"))
                total_fail += 1
                return
        results.append(("✅ PASS", test_id, description, f"Correctly rejected: {exc.messages}"))
        total_pass += 1


def print_section(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}")


# ════════════════════════════════════════════════════════════
#  1. LoginSchema
# ════════════════════════════════════════════════════════════
print_section("1. LoginSchema")

test_valid(LoginSchema,
    {"email": "zamanaziz@bnu.edu.pk", "password": "11223344"},
    "LOGIN-V1", "Valid email and password")

test_valid(LoginSchema,
    {"email": "UPPER@BNU.EDU.PK", "password": "x"},
    "LOGIN-V2", "Uppercase email accepted (normalised by @validates)")

test_invalid(LoginSchema,
    {"email": "zamanaziz@bnu.edu.pk"},
    "LOGIN-I1", "Missing password", ["password"])

test_invalid(LoginSchema,
    {"password": "11223344"},
    "LOGIN-I2", "Missing email", ["email"])

test_invalid(LoginSchema,
    {"email": "not-an-email", "password": "x"},
    "LOGIN-I3", "Malformed email format", ["email"])

test_invalid(LoginSchema,
    {},
    "LOGIN-I4", "Empty payload", ["email", "password"])


# ════════════════════════════════════════════════════════════
#  2. ChangePasswordSchema
# ════════════════════════════════════════════════════════════
print_section("2. ChangePasswordSchema")

test_valid(ChangePasswordSchema,
    {"currentPassword": "old123", "newPassword": "newpass123"},
    "CHPWD-V1", "Valid password change")

test_invalid(ChangePasswordSchema,
    {"currentPassword": "old", "newPassword": "abc"},
    "CHPWD-I1", "newPassword too short (3 chars, min=6)", ["newPassword"])

test_invalid(ChangePasswordSchema,
    {"newPassword": "newpass123"},
    "CHPWD-I2", "Missing currentPassword", ["currentPassword"])

test_invalid(ChangePasswordSchema,
    {},
    "CHPWD-I3", "Empty payload", ["currentPassword", "newPassword"])


# ════════════════════════════════════════════════════════════
#  3. CreateStudentSchema
# ════════════════════════════════════════════════════════════
print_section("3. CreateStudentSchema")

VALID_STUDENT = {
    "name": "Muhammad Ismail Rana",
    "roll": "BSEF23F-551",
    "dept": "SE",
    "section": "A",
    "session": "Fall 2023",
    "course": "Project Based Learning",
    "teacher": "Dr. Ahmed Khan",
}

test_valid(CreateStudentSchema,
    VALID_STUDENT,
    "STU-V1", "All required fields present")

test_valid(CreateStudentSchema,
    {**VALID_STUDENT, "recovery_email": "personal@gmail.com"},
    "STU-V2", "Valid with optional recovery_email")

test_valid(CreateStudentSchema,
    {**VALID_STUDENT, "roll": "BSEF23F-552", "recovery_email": None},
    "STU-V3", "recovery_email explicitly null (allowed)")

test_invalid(CreateStudentSchema,
    {**VALID_STUDENT, "name": "A"},
    "STU-I1", "Name too short (1 char, min=2)", ["name"])

test_invalid(CreateStudentSchema,
    {**VALID_STUDENT, "roll": "BSE F23 551"},
    "STU-I2", "Roll with spaces", ["roll"])

test_invalid(CreateStudentSchema,
    {**VALID_STUDENT, "section": "ABC"},
    "STU-I3", "Section too long (3 chars, max=2)", ["section"])

test_invalid(CreateStudentSchema,
    {"name": "Incomplete Student"},
    "STU-I4", "Missing roll, dept, section, session, course, teacher",
    ["roll", "dept", "section", "session", "course", "teacher"])

test_invalid(CreateStudentSchema,
    {**VALID_STUDENT, "recovery_email": "not-email"},
    "STU-I5", "Invalid recovery_email format", ["recovery_email"])

test_invalid(CreateStudentSchema,
    {**VALID_STUDENT, "dept": "X"},
    "STU-I6", "Dept too short (1 char, min=2)", ["dept"])


# ════════════════════════════════════════════════════════════
#  4. UpdateStudentSchema
# ════════════════════════════════════════════════════════════
print_section("4. UpdateStudentSchema")

test_valid(UpdateStudentSchema,
    {"name": "Updated Name", "section": "B"},
    "USTU-V1", "Valid partial update")

test_valid(UpdateStudentSchema,
    {"recovery_email": "new@gmail.com"},
    "USTU-V2", "Update only recovery_email")

test_invalid(UpdateStudentSchema,
    {"name": "A"},
    "USTU-I1", "Name too short (1 char, min=2)", ["name"])

test_invalid(UpdateStudentSchema,
    {"recovery_email": "bad-email"},
    "USTU-I2", "Invalid email format", ["recovery_email"])


# ════════════════════════════════════════════════════════════
#  5. CreateDepartmentSchema
# ════════════════════════════════════════════════════════════
print_section("5. CreateDepartmentSchema")

test_valid(CreateDepartmentSchema,
    {"name": "Computer Science", "code": "CS"},
    "DEPT-V1", "Valid 2-char code")

test_valid(CreateDepartmentSchema,
    {"name": "Electrical Engineering", "code": "ELEC"},
    "DEPT-V2", "Valid 4-char code (max)")

test_invalid(CreateDepartmentSchema,
    {"name": "Test", "code": "ee"},
    "DEPT-I1", "Lowercase code (regex: uppercase only)", ["code"])

test_invalid(CreateDepartmentSchema,
    {"name": "Test", "code": "CIVIL"},
    "DEPT-I2", "Code 5 chars (regex: max 4)", ["code"])

test_invalid(CreateDepartmentSchema,
    {"name": "Test", "code": "C"},
    "DEPT-I3", "Code 1 char (regex: min 2)", ["code"])

test_invalid(CreateDepartmentSchema,
    {"code": "CS"},
    "DEPT-I4", "Missing name field", ["name"])

test_invalid(CreateDepartmentSchema,
    {"name": "X", "code": "CS"},
    "DEPT-I5", "Name too short (1 char, min=2)", ["name"])


# ════════════════════════════════════════════════════════════
#  6. CreateCourseSchema
# ════════════════════════════════════════════════════════════
print_section("6. CreateCourseSchema")

VALID_COURSE = {
    "name": "Project Based Learning",
    "dept": "CS",
    "min_group": 3,
    "max_group": 5,
    "deadline": "2026-12-15",
}

test_valid(CreateCourseSchema,
    VALID_COURSE,
    "CRS-V1", "All fields valid")

test_valid(CreateCourseSchema,
    {**VALID_COURSE, "min_group": 1, "max_group": 1},
    "CRS-V2", "min_group == max_group (edge case, valid)")

test_invalid(CreateCourseSchema,
    {**VALID_COURSE, "min_group": 5, "max_group": 2},
    "CRS-I1", "max_group < min_group")

test_invalid(CreateCourseSchema,
    {**VALID_COURSE, "min_group": 0},
    "CRS-I2", "min_group = 0 (Range min=1)", ["min_group"])

test_invalid(CreateCourseSchema,
    {**VALID_COURSE, "deadline": "15/12/2026"},
    "CRS-I3", "Non-ISO deadline format", ["deadline"])

test_invalid(CreateCourseSchema,
    {"dept": "CS", "min_group": 2, "max_group": 4, "deadline": "2026-12-01"},
    "CRS-I4", "Missing name field", ["name"])

test_invalid(CreateCourseSchema,
    {**VALID_COURSE, "deadline": "not-a-date"},
    "CRS-I5", "Completely invalid deadline string", ["deadline"])

test_invalid(CreateCourseSchema,
    {**VALID_COURSE, "min_group": "three"},
    "CRS-I6", "min_group is a string instead of int", ["min_group"])


# ════════════════════════════════════════════════════════════
#  7. CreateTeacherSchema
# ════════════════════════════════════════════════════════════
print_section("7. CreateTeacherSchema")

VALID_TEACHER = {
    "name": "Dr. Ahmed Khan",
    "email": "ahmed.khan@bnu.edu.pk",
    "dept": "CS",
    "type": "Internal Faculty",
}

test_valid(CreateTeacherSchema,
    VALID_TEACHER,
    "TCH-V1", "Valid internal faculty")

test_valid(CreateTeacherSchema,
    {**VALID_TEACHER, "type": "External Industry", "email": "ext@company.com"},
    "TCH-V2", "Valid external industry")

test_invalid(CreateTeacherSchema,
    {**VALID_TEACHER, "type": "Freelancer"},
    "TCH-I1", "Invalid type (not in OneOf)", ["type"])

test_invalid(CreateTeacherSchema,
    {"name": "No Email"},
    "TCH-I2", "Missing email, dept, type", ["email", "dept", "type"])

test_invalid(CreateTeacherSchema,
    {**VALID_TEACHER, "email": "not-an-email"},
    "TCH-I3", "Malformed email", ["email"])

test_invalid(CreateTeacherSchema,
    {**VALID_TEACHER, "name": ""},
    "TCH-I4", "Empty name (Length min=1)", ["name"])


# ════════════════════════════════════════════════════════════
#  8. UpdateTeacherSchema
# ════════════════════════════════════════════════════════════
print_section("8. UpdateTeacherSchema")

test_valid(UpdateTeacherSchema,
    {"name": "Updated Name", "dept": "SE"},
    "UTCH-V1", "Valid partial update")

# email is NOT a declared field and default unknown=RAISE, so it is rejected
test_invalid(UpdateTeacherSchema,
    {"email": "new@email.com"},
    "UTCH-V2", "Email field rejected (unknown field)", ["email"])

test_invalid(UpdateTeacherSchema,
    {"type": "Freelancer"},
    "UTCH-I1", "Invalid type value", ["type"])


# ════════════════════════════════════════════════════════════
#  9. CreateAnnouncementSchema
# ════════════════════════════════════════════════════════════
print_section("9. CreateAnnouncementSchema")

test_valid(CreateAnnouncementSchema,
    {"title": "Welcome to PBL", "content": "Hello everyone."},
    "ANN-V1", "Valid announcement")

test_valid(CreateAnnouncementSchema,
    {"title": "With Date", "content": "Body text", "date": "2026-08-20"},
    "ANN-V2", "Valid with optional date")

test_invalid(CreateAnnouncementSchema,
    {"content": "No title here"},
    "ANN-I1", "Missing title", ["title"])

test_invalid(CreateAnnouncementSchema,
    {"title": "X", "content": "Body"},
    "ANN-I2", "Title too short (1 char, min=2)", ["title"])

test_invalid(CreateAnnouncementSchema,
    {},
    "ANN-I3", "Empty payload", ["title", "content"])


# ════════════════════════════════════════════════════════════
#  10. CreateAttachmentSchema
# ════════════════════════════════════════════════════════════
print_section("10. CreateAttachmentSchema")

test_valid(CreateAttachmentSchema,
    {"title": "Sprint 0 Document"},
    "ATT-V1", "Valid attachment title")

test_invalid(CreateAttachmentSchema,
    {"title": ""},
    "ATT-I1", "Empty title (Length min=1)", ["title"])

test_invalid(CreateAttachmentSchema,
    {},
    "ATT-I2", "Missing title field", ["title"])


# ════════════════════════════════════════════════════════════
#  RESULTS SUMMARY
# ════════════════════════════════════════════════════════════

print(f"\n{'='*70}")
print("  RESULTS SUMMARY")
print(f"{'='*70}")
print(f"{'Status':<10} {'ID':<12} {'Description':<45} Detail")
print(f"{'-'*10} {'-'*12} {'-'*45} {'-'*40}")

for status, test_id, desc, detail in results:
    # Truncate detail for readability
    detail_short = detail[:60] + "..." if len(detail) > 60 else detail
    print(f"{status:<10} {test_id:<12} {desc:<45} {detail_short}")

print(f"\n{'─'*70}")
print(f"  Total: {total_pass + total_fail}  |  ✅ Passed: {total_pass}  |  ❌ Failed: {total_fail}")
if total_fail == 0:
    print("  🎉 ALL TESTS PASSED — Schema validation layer is working correctly!")
else:
    print(f"  ⚠️  {total_fail} TEST(S) FAILED — Investigate the schema definitions above.")
print(f"{'─'*70}\n")
