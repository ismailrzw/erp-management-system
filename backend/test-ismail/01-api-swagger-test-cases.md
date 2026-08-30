# API Endpoint Test Cases — Swagger Manual Testing Guide

> **Prerequisites**
> 1. The backend server is running (`flask run` or `docker compose up`).
> 2. Swagger UI is accessible at `http://localhost:5000/api/docs`.
> 3. The manager account has been seeded (email: `zamanaziz@bnu.edu.pk`, password: `11223344`).
> 4. You must **Authorize** in Swagger first using the JWT token obtained from the Login endpoint.

---

## How to Use This Document

1. Start by running **TC-AUTH-01** to get a JWT token.
2. Click the **Authorize** button in Swagger UI, paste the token as `Bearer <token>`.
3. Work through each section in order — some tests depend on IDs returned by earlier tests.
4. Each test case lists the **payload**, the **expected HTTP status**, and a **rationale** for why it should pass or fail.
5. Placeholders like `{student_id}` mean you should paste the real ID from a previous response.

---

## 1. Authentication Operations

### ✅ Valid Test Cases

#### TC-AUTH-01 · Login — Valid Credentials
```
POST /api/auth/login
```
```json
{
  "email": "zamanaziz@bnu.edu.pk",
  "password": "11223344"
}
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `200` | Returns `{ data: { token, user } }`. **Copy the `token` value** — you need it for all subsequent requests. |

---

#### TC-AUTH-02 · Get Current User
```
GET /api/auth/me
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `200` | Returns `{ data: { id, name, email, role, dept } }`. Role should be `pbl_manager`. |

---

#### TC-AUTH-03 · Change Password — Valid
```
POST /api/auth/change-password
```
```json
{
  "currentPassword": "11223344",
  "newPassword": "NewPass123"
}
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `200` | Password changed. ⚠️ If you run this, log in again with `NewPass123` to continue testing. Change it back afterward. |

---

### ❌ Invalid Test Cases

#### TC-AUTH-04 · Login — Wrong Password
```
POST /api/auth/login
```
```json
{
  "email": "zamanaziz@bnu.edu.pk",
  "password": "wrongpassword"
}
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `401` | Service-layer password verification rejects incorrect hash. |

---

#### TC-AUTH-05 · Login — Non-Existent Email
```
POST /api/auth/login
```
```json
{
  "email": "nobody@bnu.edu.pk",
  "password": "11223344"
}
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `401` | Service-layer DB lookup returns no user. |

---

#### TC-AUTH-06 · Login — Missing Password Field
```
POST /api/auth/login
```
```json
{
  "email": "zamanaziz@bnu.edu.pk"
}
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `400` | **Schema layer** — `LoginSchema` rejects missing `password` field. |

---

#### TC-AUTH-07 · Login — Invalid Email Format
```
POST /api/auth/login
```
```json
{
  "email": "not-an-email",
  "password": "11223344"
}
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `400` | **Schema layer** — `fields.Email` rejects malformed email string. |

---

#### TC-AUTH-08 · Login — Empty Body
```
POST /api/auth/login
```
```json
{}
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `400` | **Schema layer** — Both `email` and `password` are `required=True`. |

---

#### TC-AUTH-09 · Change Password — New Password Too Short
```
POST /api/auth/change-password
```
```json
{
  "currentPassword": "11223344",
  "newPassword": "abc"
}
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `400` | **Schema layer** — `ChangePasswordSchema` enforces `min=6` on `newPassword`. |

---

#### TC-AUTH-10 · Get Me — No Token
```
GET /api/auth/me
```
*Do NOT send the Authorization header.*
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `401` | JWT middleware rejects requests without a valid token. |

---

## 2. Manager Dashboard

#### TC-DASH-01 · Get Dashboard Stats
```
GET /api/manager/dashboard/
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `200` | Returns student counts, department counts, etc. |

---

## 3. Departments (Create These FIRST — Courses Depend on Them)

### ✅ Valid Test Cases

#### TC-DEPT-01 · Create Department — Computer Science
```
POST /api/manager/departments/
```
```json
{
  "name": "Computer Science",
  "code": "CS"
}
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `201` | **Save the returned `id`** — you will need it for update/delete tests and course creation. |

---

#### TC-DEPT-02 · Create Department — Software Engineering
```
POST /api/manager/departments/
```
```json
{
  "name": "Software Engineering",
  "code": "SE"
}
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `201` | Second valid department. |

---

#### TC-DEPT-03 · Create Department — Mechanical Engineering
```
POST /api/manager/departments/
```
```json
{
  "name": "Mechanical Engineering",
  "code": "ME"
}
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `201` | Third valid department. |

---

#### TC-DEPT-04 · List All Departments
```
GET /api/manager/departments/
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `200` | Should list CS, SE, ME (all 3 created above). |

---

#### TC-DEPT-05 · Get Department by ID
```
GET /api/manager/departments/{department_id}
```
*Use the ID from TC-DEPT-01.*
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `200` | Returns the CS department. |

---

#### TC-DEPT-06 · Update Department
```
PUT /api/manager/departments/{department_id}
```
*Use the ME department ID from TC-DEPT-03.*
```json
{
  "name": "Mechanical & Industrial Engineering"
}
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `200` | Name updated; code should remain `ME`. |

---

### ❌ Invalid Test Cases

#### TC-DEPT-07 · Create Department — Duplicate Code
```
POST /api/manager/departments/
```
```json
{
  "name": "Another CS Department",
  "code": "CS"
}
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `409` | **Service layer** — duplicate code constraint. |

---

#### TC-DEPT-08 · Create Department — Lowercase Code
```
POST /api/manager/departments/
```
```json
{
  "name": "Electrical Engineering",
  "code": "ee"
}
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `422` | **Schema layer** — `Regexp(r"^[A-Z]{2,4}$")` rejects lowercase letters. |

---

#### TC-DEPT-09 · Create Department — Code Too Long (5 chars)
```
POST /api/manager/departments/
```
```json
{
  "name": "Civil Engineering",
  "code": "CIVIL"
}
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `422` | **Schema layer** — Code regex allows 2–4 chars only. |

---

#### TC-DEPT-10 · Create Department — Missing Name
```
POST /api/manager/departments/
```
```json
{
  "code": "EE"
}
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `422` | **Schema layer** — `name` is `required=True`. |

---

#### TC-DEPT-11 · Get Department — Non-Existent ID
```
GET /api/manager/departments/64b64c8f0e2b2c3d4e5f6789
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `404` | Service returns `None` for unknown ObjectId. |

---

## 4. Courses (Requires Departments to Exist First)

### ✅ Valid Test Cases

#### TC-COURSE-01 · Create Course — Project Based Learning
```
POST /api/manager/courses/
```
```json
{
  "name": "Project Based Learning",
  "dept": "CS",
  "min_group": 3,
  "max_group": 5,
  "deadline": "2026-12-15"
}
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `201` | **Save the returned `id`**. |

---

#### TC-COURSE-02 · Create Course — Software Design Patterns
```
POST /api/manager/courses/
```
```json
{
  "name": "Software Design Patterns",
  "dept": "SE",
  "min_group": 2,
  "max_group": 4,
  "deadline": "2027-01-20"
}
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `201` | Second valid course. |

---

#### TC-COURSE-03 · List All Courses
```
GET /api/manager/courses/
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `200` | Should contain the 2 courses created above. |

---

#### TC-COURSE-04 · Update Course Deadline
```
PUT /api/manager/courses/{course_id}
```
*Use the ID from TC-COURSE-01.*
```json
{
  "deadline": "2027-03-01"
}
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `200` | Deadline extended to 2027-03-01. |

---

### ❌ Invalid Test Cases

#### TC-COURSE-05 · Create Course — Non-Existent Department
```
POST /api/manager/courses/
```
```json
{
  "name": "Physics 101",
  "dept": "PHY",
  "min_group": 2,
  "max_group": 4,
  "deadline": "2026-12-01"
}
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `409` | **Service layer** — `_department_exists("PHY")` returns `False`. |

---

#### TC-COURSE-06 · Create Course — max_group < min_group
```
POST /api/manager/courses/
```
```json
{
  "name": "Bad Group Size Course",
  "dept": "CS",
  "min_group": 5,
  "max_group": 2,
  "deadline": "2026-12-01"
}
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `422` | **Schema layer** — `@validates_schema` catches `max_group < min_group`. |

---

#### TC-COURSE-07 · Create Course — min_group = 0
```
POST /api/manager/courses/
```
```json
{
  "name": "Zero Min Course",
  "dept": "CS",
  "min_group": 0,
  "max_group": 3,
  "deadline": "2026-12-01"
}
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `422` | **Schema layer** — `Range(min=1)` rejects `0`. |

---

#### TC-COURSE-08 · Create Course — Invalid Deadline Format
```
POST /api/manager/courses/
```
```json
{
  "name": "Bad Date Course",
  "dept": "CS",
  "min_group": 2,
  "max_group": 4,
  "deadline": "15/12/2026"
}
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `422` | **Schema layer** — `_parse_deadline` expects ISO format `YYYY-MM-DD`. |

---

#### TC-COURSE-09 · Create Course — Duplicate Name
```
POST /api/manager/courses/
```
```json
{
  "name": "Project Based Learning",
  "dept": "CS",
  "min_group": 2,
  "max_group": 4,
  "deadline": "2026-12-01"
}
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `409` | **Service layer** — duplicate course name. |

---

## 5. Teachers / Evaluators

### ✅ Valid Test Cases

#### TC-TEACH-01 · Create Teacher — Internal Faculty
```
POST /api/manager/teachers/
```
```json
{
  "name": "Dr. Ahmed Khan",
  "email": "ahmed.khan@bnu.edu.pk",
  "dept": "CS",
  "type": "Internal Faculty"
}
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `201` | Returns `initial_password`. **Save the `id`**. |

---

#### TC-TEACH-02 · Create Teacher — External Industry
```
POST /api/manager/teachers/
```
```json
{
  "name": "Eng. Sarah Ali",
  "email": "sarah.ali@industry.com",
  "dept": "SE",
  "type": "External Industry"
}
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `201` | External evaluator created. |

---

#### TC-TEACH-03 · Create Teacher — Third Evaluator
```
POST /api/manager/teachers/
```
```json
{
  "name": "Prof. Bilal Raza",
  "email": "bilal.raza@bnu.edu.pk",
  "dept": "ME",
  "type": "Internal Faculty"
}
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `201` | Third valid teacher. |

---

#### TC-TEACH-04 · List All Teachers
```
GET /api/manager/teachers/
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `200` | Lists all 3 teachers. No `password_hash` in response. |

---

#### TC-TEACH-05 · Update Teacher — Change Department
```
PUT /api/manager/teachers/{teacher_id}
```
*Use the ID from TC-TEACH-03.*
```json
{
  "dept": "SE"
}
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `200` | Dept changed from ME to SE. |

---

### ❌ Invalid Test Cases

#### TC-TEACH-06 · Create Teacher — Invalid Type
```
POST /api/manager/teachers/
```
```json
{
  "name": "Invalid Type Teacher",
  "email": "invalid.type@bnu.edu.pk",
  "dept": "CS",
  "type": "Freelancer"
}
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `422` | **Schema layer** — `OneOf(TeacherType.ALL)` rejects `"Freelancer"`. Valid values: `"Internal Faculty"`, `"External Industry"`. |

---

#### TC-TEACH-07 · Create Teacher — Duplicate Email
```
POST /api/manager/teachers/
```
```json
{
  "name": "Duplicate Email",
  "email": "ahmed.khan@bnu.edu.pk",
  "dept": "CS",
  "type": "Internal Faculty"
}
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `409` | **Service layer** — email uniqueness constraint. |

---

#### TC-TEACH-08 · Update Teacher — Attempt to Change Email
```
PUT /api/manager/teachers/{teacher_id}
```
*Use the ID from TC-TEACH-01.*
```json
{
  "email": "new.email@bnu.edu.pk"
}
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `422` | **Blueprint layer** — email is excluded from `UpdateTeacherSchema`. If only `email` is provided, blueprint detects no valid fields and returns 422. |

---

#### TC-TEACH-09 · Create Teacher — Missing Required Fields
```
POST /api/manager/teachers/
```
```json
{
  "name": "No Email Teacher"
}
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `422` | **Schema layer** — `email`, `dept`, `type` are all `required=True`. |

---

## 6. Students

### ✅ Valid Test Cases

#### TC-STU-01 · Create Student — First Student
```
POST /api/manager/students/
```
```json
{
  "name": "Muhammad Ismail Rana",
  "roll": "BSEF23F-551",
  "dept": "SE",
  "section": "A",
  "session": "Fall 2023",
  "course": "Project Based Learning",
  "teacher": "Dr. Ahmed Khan"
}
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `201` | Returns `{ student_id, email, password }`. **Save the `student_id`**. Email is auto-generated from roll. |

---

#### TC-STU-02 · Create Student — Second Student
```
POST /api/manager/students/
```
```json
{
  "name": "Ramsha Bukhari",
  "roll": "BSEF23F-027",
  "dept": "SE",
  "section": "A",
  "session": "Fall 2023",
  "course": "Project Based Learning",
  "teacher": "Dr. Ahmed Khan"
}
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `201` | Second valid student. |

---

#### TC-STU-03 · Create Student — Third Student with Recovery Email
```
POST /api/manager/students/
```
```json
{
  "name": "Sara Fatima",
  "roll": "BSEF23F-744",
  "dept": "SE",
  "section": "B",
  "session": "Fall 2023",
  "course": "Software Design Patterns",
  "teacher": "Eng. Sarah Ali",
  "recovery_email": "sara.personal@gmail.com"
}
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `201` | Third student with optional recovery email. |

---

#### TC-STU-04 · Create Student — Fourth Student (CS Dept)
```
POST /api/manager/students/
```
```json
{
  "name": "Ibrahim Zafar",
  "roll": "BSCS23F-630",
  "dept": "CS",
  "section": "A",
  "session": "Fall 2023",
  "course": "Project Based Learning",
  "teacher": "Dr. Ahmed Khan"
}
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `201` | CS department student. |

---

#### TC-STU-05 · Create Student — Fifth Student
```
POST /api/manager/students/
```
```json
{
  "name": "Ayesha Siddiqui",
  "roll": "BSSE23S-112",
  "dept": "SE",
  "section": "A",
  "session": "Spring 2023",
  "course": "Software Design Patterns",
  "teacher": "Eng. Sarah Ali"
}
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `201` | Fifth student. |

---

#### TC-STU-06 · List Students
```
GET /api/manager/students/
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `200` | Returns paginated list. Should have 5 students, `total: 5`. |

---

#### TC-STU-07 · List Students — Filter by Department
```
GET /api/manager/students/?dept=CS
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `200` | Should return only Ibrahim Zafar (CS department). |

---

#### TC-STU-08 · Get Student by ID
```
GET /api/manager/students/{student_id}
```
*Use the ID from TC-STU-01.*
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `200` | Returns full student object. No `password_hash` in response. |

---

#### TC-STU-09 · Update Student
```
PUT /api/manager/students/{student_id}
```
*Use the ID from TC-STU-01.*
```json
{
  "section": "B",
  "recovery_email": "ismail.personal@gmail.com"
}
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `200` | Section changed from A to B, recovery email added. |

---

#### TC-STU-10 · Soft Delete → Restore Flow
```
DELETE /api/manager/students/{student_id}     →  200 (soft-deleted)
GET    /api/manager/students/?deleted=true    →  200 (student appears in bin)
POST   /api/manager/students/{student_id}/restore  →  200 (restored)
GET    /api/manager/students/{student_id}     →  200 (student is active again)
```
*Use the ID from TC-STU-05.*
| Expected | Notes |
|----------|-------|
| ✅ Pass | Full lifecycle test. Student should disappear from active list, appear in deleted list, then come back. |

---

### ❌ Invalid Test Cases

#### TC-STU-11 · Create Student — Duplicate Roll Number
```
POST /api/manager/students/
```
```json
{
  "name": "Duplicate Roll Student",
  "roll": "BSEF23F-551",
  "dept": "SE",
  "section": "A",
  "session": "Fall 2023",
  "course": "Project Based Learning",
  "teacher": "Dr. Ahmed Khan"
}
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `409` | **Service layer** — roll number uniqueness. |

---

#### TC-STU-12 · Create Student — Roll Number with Spaces
```
POST /api/manager/students/
```
```json
{
  "name": "Spaces In Roll",
  "roll": "BSE F23 551",
  "dept": "SE",
  "section": "A",
  "session": "Fall 2023",
  "course": "Project Based Learning",
  "teacher": "Dr. Ahmed Khan"
}
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `422` | **Schema layer** — `@validates("roll")` checks for spaces. |

---

#### TC-STU-13 · Create Student — Missing Required Fields
```
POST /api/manager/students/
```
```json
{
  "name": "Incomplete Student"
}
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `422` | **Schema layer** — `roll`, `dept`, `section`, `session`, `course`, `teacher` are all `required=True`. |

---

#### TC-STU-14 · Create Student — Name Too Short (1 char)
```
POST /api/manager/students/
```
```json
{
  "name": "A",
  "roll": "BSEF23F-999",
  "dept": "SE",
  "section": "A",
  "session": "Fall 2023",
  "course": "Project Based Learning",
  "teacher": "Dr. Ahmed Khan"
}
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `422` | **Schema layer** — `Length(min=2)` on name. |

---

#### TC-STU-15 · Create Student — Section Too Long (3 chars)
```
POST /api/manager/students/
```
```json
{
  "name": "Long Section Student",
  "roll": "BSEF23F-998",
  "dept": "SE",
  "section": "ABC",
  "session": "Fall 2023",
  "course": "Project Based Learning",
  "teacher": "Dr. Ahmed Khan"
}
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `422` | **Schema layer** — `Length(max=2)` on section. |

---

#### TC-STU-16 · Create Student — Invalid Recovery Email
```
POST /api/manager/students/
```
```json
{
  "name": "Bad Email Student",
  "roll": "BSEF23F-997",
  "dept": "SE",
  "section": "A",
  "session": "Fall 2023",
  "course": "Project Based Learning",
  "teacher": "Dr. Ahmed Khan",
  "recovery_email": "not-a-valid-email"
}
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `422` | **Schema layer** — `fields.Email` rejects malformed email. |

---

#### TC-STU-17 · Get Student — Non-Existent ID
```
GET /api/manager/students/64b64c8f0e2b2c3d4e5f6789
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `404` | Service returns `None` for unknown ObjectId. |

---

## 7. Announcements

### ✅ Valid Test Cases

#### TC-ANN-01 · Create Announcement
```
POST /api/manager/announcements/
```
```json
{
  "title": "Welcome to PBL System — Fall 2026",
  "content": "All students are required to form their project groups by the deadline. Please refer to the course page for detailed instructions and group size requirements.",
  "date": "2026-08-20"
}
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `201` | **Save the returned `id`**. |

---

#### TC-ANN-02 · Create Announcement — No Date (Optional)
```
POST /api/manager/announcements/
```
```json
{
  "title": "Mid-Semester Evaluation Schedule",
  "content": "The mid-semester evaluations will be conducted during Week 8. Detailed schedule to follow."
}
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `201` | Date is optional. |

---

#### TC-ANN-03 · List Announcements
```
GET /api/manager/announcements/
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `200` | Returns both announcements, newest first. |

---

#### TC-ANN-04 · Update Announcement
```
PUT /api/manager/announcements/{announcement_id}
```
*Use the ID from TC-ANN-01.*
```json
{
  "title": "UPDATED: Welcome to PBL System — Fall 2026"
}
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `200` | Only title updated; content unchanged. |

---

### ❌ Invalid Test Cases

#### TC-ANN-05 · Create Announcement — Missing Title
```
POST /api/manager/announcements/
```
```json
{
  "content": "Content without a title."
}
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `422` | **Schema layer** — `title` is `required=True`. |

---

#### TC-ANN-06 · Create Announcement — Title Too Short (1 char)
```
POST /api/manager/announcements/
```
```json
{
  "title": "A",
  "content": "Content with a very short title."
}
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `422` | **Schema layer** — `Length(min=2)` on title. |

---

#### TC-ANN-07 · Create Announcement — Empty Body
```
POST /api/manager/announcements/
```
```json
{}
```
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `422` | **Schema layer** — both `title` and `content` are required. |

---

## 8. Attachments

### ✅ Valid Test Cases

#### TC-ATT-01 · Upload Attachment (Multipart Form)
```
POST /api/manager/attachments/
```
*In Swagger, use the file upload field. Select a `.pdf` file under 10MB. Set the `title` field to:*
```
title: "Sprint 0 Deliverable Document"
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `201` | Returns attachment metadata with download URL. **Save the `id`**. |

---

#### TC-ATT-02 · List Attachments
```
GET /api/manager/attachments/
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `200` | Lists the uploaded attachment. |

---

#### TC-ATT-03 · Update Attachment Title
```
PUT /api/manager/attachments/{attachment_id}
```
*Use the ID from TC-ATT-01.*
```json
{
  "title": "Sprint 0 Deliverable — Updated Title"
}
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `200` | Title updated. |

---

#### TC-ATT-04 · Download Attachment
```
GET /api/manager/attachments/{attachment_id}/download
```
| Expected | Status | Notes |
|----------|--------|-------|
| ✅ Pass | `200` | Returns the actual file as a download. |

---

### ❌ Invalid Test Cases

#### TC-ATT-05 · Upload — Disallowed Extension
```
POST /api/manager/attachments/
```
*Upload a `.exe` or `.jpg` file. Set title to `"Bad Extension"`.*
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `400` | **Service layer** — `ALLOWED_EXTENSIONS` is `{pdf, docx, xlsx, zip}`. |

---

#### TC-ATT-06 · Upload — No File Provided
```
POST /api/manager/attachments/
```
*Do NOT select a file. Set title to `"No File"`.*
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `400` | **Service layer** — `_validate_file` requires a non-empty file. |

---

## 9. Soft-Delete / Permanent-Delete / Restore Flows

These tests validate the complete lifecycle. Use IDs from entities created above.

### TC-LIFE-01 · Department Lifecycle
```
DELETE /api/manager/departments/{dept_id}           →  200 (soft-deleted)
POST   /api/manager/departments/{dept_id}/restore   →  200 (restored)
DELETE /api/manager/departments/{dept_id}           →  200 (soft-deleted again)
DELETE /api/manager/departments/{dept_id}/permanent →  200 (gone forever)
GET    /api/manager/departments/{dept_id}           →  404 (does not exist)
```
*Use the ME department ID from TC-DEPT-03.*

---

### TC-LIFE-02 · Course Lifecycle
```
DELETE /api/manager/courses/{course_id}             →  200 (soft-deleted)
POST   /api/manager/courses/{course_id}/restore     →  200 (restored)
DELETE /api/manager/courses/{course_id}             →  200 (soft-deleted again)
DELETE /api/manager/courses/{course_id}/permanent   →  200 (gone forever)
```
*Use the "Software Design Patterns" course ID from TC-COURSE-02.*

---

### TC-LIFE-03 · Teacher Lifecycle
```
DELETE /api/manager/teachers/{teacher_id}           →  200 (soft-deleted)
GET    /api/manager/teachers/?deleted=true          →  200 (teacher visible)
POST   /api/manager/teachers/{teacher_id}/restore   →  200 (restored)
DELETE /api/manager/teachers/{teacher_id}           →  200 (soft-deleted again)
DELETE /api/manager/teachers/{teacher_id}/permanent →  200 (gone forever)
```
*Use Prof. Bilal Raza's ID from TC-TEACH-03.*

---

### TC-LIFE-04 · Permanent Delete Without Soft Delete First
```
DELETE /api/manager/courses/{course_id}/permanent   →  404 or error
```
*Use the "Project Based Learning" course ID (still active). Should fail because it hasn't been soft-deleted.*
| Expected | Status | Validates |
|----------|--------|-----------|
| ❌ Fail | `404/400` | Service requires soft-delete before permanent delete. |

---

## Summary Matrix

| Area | Valid Tests | Invalid Tests | Total |
|------|-----------|---------------|-------|
| Auth | 3 | 7 | 10 |
| Dashboard | 1 | 0 | 1 |
| Departments | 6 | 5 | 11 |
| Courses | 4 | 5 | 9 |
| Teachers | 5 | 4 | 9 |
| Students | 10 | 7 | 17 |
| Announcements | 4 | 3 | 7 |
| Attachments | 4 | 2 | 6 |
| Lifecycle | 4 | 0 | 4 |
| **Total** | **41** | **33** | **74** |
