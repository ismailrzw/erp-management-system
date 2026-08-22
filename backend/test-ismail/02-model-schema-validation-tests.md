# Model & Schema Layer Validation — Direct Testing Guide

> **Purpose**: This document lets you test the Marshmallow schema validation layer
> **independently** of the HTTP API. This proves that invalid data is rejected
> at the schema level before it ever reaches the database.

---

## Quick Start

Run the test script from the backend root (with your venv activated):

```bash
cd backend
source venv/Scripts/activate  # Windows Git Bash
# OR
venv\Scripts\activate         # Windows CMD/PowerShell

python test-ismail/test_schema_validation.py
```

The script tests every schema with both valid and invalid payloads and prints
a clear PASS/FAIL table.

---

## What the Script Tests

### 1. LoginSchema

| # | Payload | Expected | Validates |
|---|---------|----------|-----------|
| V1 | `{"email": "zamanaziz@bnu.edu.pk", "password": "11223344"}` | ✅ Loads OK | Valid credentials structure |
| V2 | `{"email": "UPPER@BNU.EDU.PK", "password": "x"}` | ✅ Loads OK | Uppercase email accepted and normalised by `@validates` |
| I1 | `{"email": "zamanaziz@bnu.edu.pk"}` | ❌ ValidationError | `password` required |
| I2 | `{"password": "11223344"}` | ❌ ValidationError | `email` required |
| I3 | `{"email": "not-an-email", "password": "x"}` | ❌ ValidationError | `fields.Email` rejects bad format |
| I4 | `{}` | ❌ ValidationError | Both fields required |

### 2. ChangePasswordSchema

| # | Payload | Expected | Validates |
|---|---------|----------|-----------|
| V1 | `{"currentPassword": "old123", "newPassword": "newpass123"}` | ✅ Loads OK | Both fields present, newPassword ≥ 6 chars |
| I1 | `{"currentPassword": "old", "newPassword": "abc"}` | ❌ ValidationError | `newPassword` min length = 6 |
| I2 | `{"newPassword": "newpass123"}` | ❌ ValidationError | `currentPassword` required |
| I3 | `{}` | ❌ ValidationError | Both fields required |

### 3. CreateStudentSchema

| # | Payload | Expected | Validates |
|---|---------|----------|-----------|
| V1 | Full valid student (see script) | ✅ Loads OK | All required fields present |
| V2 | Valid student with `recovery_email` | ✅ Loads OK | Optional email field |
| I1 | Name = `"A"` (1 char) | ❌ ValidationError | `Length(min=2)` |
| I2 | Roll = `"BSE F23 551"` (has spaces) | ❌ ValidationError | `@validates("roll")` — no spaces |
| I3 | Section = `"ABC"` (3 chars) | ❌ ValidationError | `Length(max=2)` |
| I4 | Missing `roll` field | ❌ ValidationError | `roll` required |
| I5 | `recovery_email` = `"not-email"` | ❌ ValidationError | `fields.Email` |

### 4. CreateDepartmentSchema

| # | Payload | Expected | Validates |
|---|---------|----------|-----------|
| V1 | `{"name": "Computer Science", "code": "CS"}` | ✅ Loads OK | Valid |
| V2 | `{"name": "Electrical Engineering", "code": "ELEC"}` | ✅ Loads OK | 4-char code (max) |
| I1 | `{"name": "Test", "code": "ee"}` | ❌ ValidationError | Regex: uppercase only |
| I2 | `{"name": "Test", "code": "CIVIL"}` | ❌ ValidationError | Regex: max 4 chars |
| I3 | `{"name": "Test", "code": "C"}` | ❌ ValidationError | Regex: min 2 chars |
| I4 | `{"code": "CS"}` | ❌ ValidationError | `name` required |

### 5. CreateCourseSchema

| # | Payload | Expected | Validates |
|---|---------|----------|-----------|
| V1 | Full valid course | ✅ Loads OK | All fields valid |
| I1 | `min_group: 5, max_group: 2` | ❌ ValidationError | `@validates_schema` — max < min |
| I2 | `min_group: 0` | ❌ ValidationError | `Range(min=1)` |
| I3 | `deadline: "15/12/2026"` | ❌ ValidationError | Not ISO format |
| I4 | Missing `name` | ❌ ValidationError | `name` required |

### 6. CreateTeacherSchema

| # | Payload | Expected | Validates |
|---|---------|----------|-----------|
| V1 | `{"name": "Dr. Khan", "email": "khan@bnu.edu.pk", "dept": "CS", "type": "Internal Faculty"}` | ✅ Loads OK | Valid |
| I1 | `type: "Freelancer"` | ❌ ValidationError | `OneOf(TeacherType.ALL)` |
| I2 | Missing `email` | ❌ ValidationError | `email` required |
| I3 | `email: "not-email"` | ❌ ValidationError | `fields.Email` |

### 7. UpdateTeacherSchema

| # | Payload | Expected | Validates |
|---|---------|----------|-----------|
| V1 | `{"name": "Updated Name", "dept": "SE"}` | ✅ Loads OK | Valid partial update |
| V2 | `{"email": "new@email.com"}` | ❌ ValidationError | `email` is not a declared field → rejected as unknown |
| I1 | `{"type": "Freelancer"}` | ❌ ValidationError | `OneOf` still validates if type is present |

### 8. CreateAnnouncementSchema

| # | Payload | Expected | Validates |
|---|---------|----------|-----------|
| V1 | `{"title": "Welcome", "content": "Hello world"}` | ✅ Loads OK | Valid |
| V2 | `{"title": "With Date", "content": "Body", "date": "2026-08-20"}` | ✅ Loads OK | Optional date |
| I1 | `{"content": "No title"}` | ❌ ValidationError | `title` required |
| I2 | `{"title": "X", "content": "Body"}` | ❌ ValidationError | `Length(min=2)` on title |

### 9. CreateAttachmentSchema

| # | Payload | Expected | Validates |
|---|---------|----------|-----------|
| V1 | `{"title": "Sprint 0 Document"}` | ✅ Loads OK | Valid |
| I1 | `{"title": ""}` | ❌ ValidationError | `Length(min=1)` |
| I2 | `{}` | ❌ ValidationError | `title` required |

---

## Understanding the Results

When the test script runs, each test prints one of:

- `✅ PASS` — The schema behaved as expected (loaded valid data or rejected invalid data)
- `❌ FAIL` — The schema did NOT behave as expected (accepted bad data or rejected good data)

**All tests should show `✅ PASS`.** If any show `❌ FAIL`, there is a bug in the
schema validation layer that needs to be investigated.

---

## How This Relates to the 3-Layer Validation Architecture

```
┌──────────────────────────────────┐
│   Layer 1: Schema Validation     │  ← THIS IS WHAT THIS SCRIPT TESTS
│   (Marshmallow schemas)          │
│   Rejects: bad types, missing    │
│   fields, format violations      │
├──────────────────────────────────┤
│   Layer 2: Service Validation    │  ← Tested via API (document 01)
│   (Business logic in services)   │
│   Rejects: duplicates, foreign   │
│   key violations, state errors   │
├──────────────────────────────────┤
│   Layer 3: DB Constraints        │  ← MongoDB unique indexes
│   (Unique indexes on email/roll) │
│   Last line of defence           │
└──────────────────────────────────┘
```

A request must pass through **all 3 layers** to be persisted. This script
proves Layer 1 is working correctly in isolation.
