# 🚀 Sprint 4 / Sprint 5+ Full System Implementation — Ismail's Detailed Context

## 📋 Executive Overview

- **Project:** ERP Management System (PBL Management System) · Beaconhouse National University
- **Scope:** **Sprint 4 & Sprint 5+ (Group Auto-Naming, Supervisor Workflow & Quota Enforcements, Account Activation, Multi-Identifier Auth, Excel Reporting, Ungrouped Students Management, and Scoped Announcements)**
- **Author:** Ismail Rizwan
- **Specification Source:** [`documents/05-sprints/SPRINT-05-REQUIREMENTS-AND-PLAN.md`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/documents/05-sprints/SPRINT-05-REQUIREMENTS-AND-PLAN.md)
- **Architectural Decisions Implemented:**
  - **D-01 (Supervisor = Evaluator role):** Instructors/supervisors utilize the existing `evaluator` role; no redundant database role created.
  - **D-02 (Course Deadline Alignment):** `courses.deadline` migrated and renamed to `courses.group_formation_deadline` (the cutoff for group creation).
  - **D-03 (Email Infrastructure):** `email_service.py` provides multi-backend email sending (SendGrid HTTP API, standard SMTP with TLS, and fallback console/log in local dev).
  - **D-04 (Group Auto-Naming):** Formatted sequentially as `GRP-{YEAR}-{SEQ:03d}` with configurable pattern in `backend/app/config.py`.
  - **D-05 (Supervisor Capacity Cap):** Maximum 4 active groups strictly enforced per supervisor.
- **Frontend & Backend Verification Status:**
  - Frontend: `npm run lint` passed (0 errors), `npm run build` passed cleanly (`dist/` generated).
  - Backend: Dedicated Sprint 5+ test suite (`backend/tests/test_sprint5_features.py`) passed 100%.
  - Critical Bug Fix: Resolved white-screen crash on Manager Dashboard when expanding "Ungrouped Students Management" (`res.data` array extraction).

---

## 🏛️ Architecture & System Design Breakdown

### 1. Student Identity, One-Time Activation & Multi-Identifier Auth (REQ-01)
- **Token Security:** 64-character cryptographic hex token (`secrets.token_hex(32)`) hashed with bcrypt and persisted in `password_set_tokens` with 24-hour expiration.
- **Activation Flow:** When a student account is created by the Manager or bulk imported, a password-set token is generated and dispatched via email (`/set-password?token=...`). The student configures their own initial password.
- **Resend Activation:** Manager can resend password setup emails at any time from `StudentListPage.jsx` or edit modals.
- **Multi-Identifier Login:** Auth endpoint `/api/auth/login` accepts either the student's Roll Number (case-insensitive, e.g., `f2024-551` or `F2024-551`) or university email (`f2024-551@bnu.edu.pk`).

### 2. Automatic Group Naming & Formation Status Tracking (REQ-02, REQ-06)
- **Sequential Group Naming:** Replaced arbitrary manual group names with sequential numbering `GRP-{YEAR}-{SEQ:03d}` (e.g., `GRP-2026-001`, `GRP-2026-002`).
- **Deadline Comparison & Formation Status:** Calculated dynamically upon creation:
  - `on_time`: Created strictly before `course.group_formation_deadline`.
  - `on_deadline`: Created on the exact deadline date.
  - `late`: Created after the deadline date.
- **Proposal Document Upload:** Students must attach a mandatory Project Proposal PDF/DOCX upon group creation. Stored via `attachment_service.py` and linked directly to the group record.
- **Submission Status:** Monitored as `not_submitted`, `pending`, `submitted`, or `evaluated`.

### 3. Supervisor Expertise Browsing, Request Workflow & Capacity Enforcement (REQ-03, REQ-04)
- **Expertise Domain Tags:** Evaluators/Supervisors can manage their research and project domains (e.g., "Artificial Intelligence", "Robotics", "Web3").
- **Browsing & Discovery:** Students browse eligible supervisors with real-time capacity badges (`X/4 Groups Supervised`), availability filtering, and domain search.
- **Group Request Submission:** Group Leaders submit requests with custom pitch notes. Only one pending request is permitted per group.
- **Evaluator Decision Inbox:** Evaluators can view pending group requests on their dashboard, accept requests (with strict atomic validation preventing exceeding 4 active groups), or decline requests with explanatory feedback.

### 4. Manager Reporting & Ungrouped Students Management (REQ-05, REQ-07)
- **12-Column Comprehensive Group Excel Report:** Generated via `openpyxl` at `/api/manager/reports/groups` with columns:
  1. Serial No.
  2. Group Name (`GRP-YYYY-XXX`)
  3. Project Title
  4. Course
  5. Department
  6. Supervisor Name
  7. Team Leader (Name & Roll No.)
  8. Formation Status (`On-Time` / `On-Deadline` / `Late`)
  9. Submission Status
  10. Members Count
  11. Member Names & Rolls
  12. Created Date
- **Ungrouped Students Dashboard Panel:**
  - Real-time expandable view on Manager Dashboard of students without an active group.
  - Department and course filtering.
  - Export to Excel (`/api/manager/students/ungrouped/export`).
  - Broadcast reminder emails (`/api/manager/students/notify-ungrouped`) with course deadline information.

### 5. Targeted Announcements by Audience Scope (REQ-08)
- **Scope Model:** Extended announcements to support 3 distinct target levels:
  - `broadcast`: Visible to all users campus-wide.
  - `department`: Targeted to specific academic departments (e.g., `CS`, `SE`).
  - `group`: Targeted to specific project group IDs.
- **Student Filtering:** Students only see announcements matching their scope, department, or assigned group.

---

## 📂 Detailed File-by-File Changes (Git Status Inventory)

### 1. Backend New & Untracked Files

| File Path | Description & Functional Purpose |
| :--- | :--- |
| `backend/app/models/password_set_token.py` | Schema field constants for `password_set_tokens` collection (one-time activation). |
| `backend/app/models/supervisor_request.py` | Schema field constants and statuses (`pending`, `accepted`, `rejected`, `cancelled`) for supervisor requests. |
| `backend/app/services/email_service.py` | Email transport supporting SendGrid API, SMTP TLS, and local mock fallback. Sends password activation and ungrouped reminders. |
| `backend/app/services/supervisor_service.py` | Business logic for supervisor directory, domain tags, request workflows, and atomic cap checks (`<= 4`). |
| `backend/app/services/report_service.py` | High-fidelity Excel workbook generator utilizing `openpyxl` with styled headers, auto-fit columns, and 12-column group summary. |
| `backend/app/blueprints/student/supervisors.py` | Flask-RESTX endpoints for student supervisor browsing (`/api/student/supervisors`) and group request lifecycle. |
| `backend/app/blueprints/evaluator/supervisor_requests.py` | Evaluator endpoints for incoming supervisor requests, accepting with cap enforcement, rejection reasons, and domain updates. |
| `backend/app/blueprints/manager/reports.py` | Manager endpoint for streaming Excel group reports (`/api/manager/reports/groups`). |
| `backend/seed/migrate_course_deadline.py` | Migration script updating existing MongoDB course records from `deadline` to `group_formation_deadline`. |
| `backend/tests/test_sprint5_features.py` | Comprehensive integration test suite covering activation, multi-identifier auth, auto-naming, cap enforcement, reports, and scoped announcements. |

### 2. Backend Modified Files

| File Path | Key Modifications |
| :--- | :--- |
| `backend/app/__init__.py` | Registered new namespaces: `student_supervisors_ns`, `student_supervisor_requests_ns`, `manager_reports_ns`, and evaluator supervisor routes. |
| `backend/app/config.py` | Added SendGrid/SMTP mail configurations, `FRONTEND_URL`, and `GROUP_NAME_FORMAT = "GRP-{year}-{seq:03d}"`. |
| `backend/app/models/announcement.py` | Added `AnnouncementScope` (`broadcast`, `department`, `group`) and `TARGET_IDS` constants. |
| `backend/app/models/course.py` | Renamed `DEADLINE` to `GROUP_FORMATION_DEADLINE = "group_formation_deadline"` while maintaining backward compatibility. |
| `backend/app/models/group.py` | Added constants for `FORMATION_STATUS` (`on_time`, `on_deadline`, `late`), `SUBMISSION_STATUS`, `SUPERVISOR_ID`, `SUPERVISOR_NAME`, and `PROPOSAL_ATTACHMENT_ID`. |
| `backend/app/models/user.py` | Added `MAX_SUPERVISION_CAP = 4`, `DOMAINS`, `ACTIVE_SUPERVISION_COUNT`, `PASSWORD_SET`, and `PASSWORD_SET_AT`. |
| `backend/app/schemas/student_schema.py` | Updated student roll number validation to enforce `^f\d{4}-\d+$` format. |
| `backend/app/schemas/auth_schema.py` | Added `SetPasswordSchema` (`token`, `new_password`) and support for `email_or_roll` in login schema. |
| `backend/app/schemas/course_schema.py` | Updated schema to validate `group_formation_deadline` alongside legacy `deadline`. |
| `backend/app/schemas/announcement_schema.py` | Added `scope` (`OneOf(['broadcast', 'department', 'group'])`) and `target_ids` list validation. |
| `backend/app/services/auth_service.py` | Multi-identifier login lookup, token generation, and dual ObjectId/string matching in `set_password_with_token`. |
| `backend/app/services/student_service.py` | Case-insensitive roll handling, account activation link dispatch, resend activation, ungrouped students listing, and email reminder dispatch. |
| `backend/app/services/course_service.py` | Aligned course CRUD with `group_formation_deadline`. |
| `backend/app/services/group_service.py` | Automatic sequential naming, deadline status computation, proposal file attachments, and case-insensitive peer invitations. |
| `backend/app/services/manager_group_service.py` | Serializer updated to include formation status, supervisor details, and proposal attachment download links. |
| `backend/app/services/teacher_service.py` | Real-time calculation of active supervised groups (`active_supervision_count`) and domain tags. |
| `backend/app/services/announcement_service.py` | Filter student announcements by broadcast scope, student department, and student group ID. |
| `backend/app/blueprints/auth/routes.py` | Added `/api/auth/set-password` endpoint. |
| `backend/app/blueprints/manager/students.py` | Added `/api/manager/students/ungrouped`, `/export`, `/notify-ungrouped`, and `/<id>/resend-password-email`. |
| `backend/app/blueprints/manager/teachers.py` | Added domain tag updates and supervisor project quota indicators. |
| `backend/app/blueprints/manager/courses.py` | Aligned parameters with `group_formation_deadline`. |
| `backend/app/blueprints/manager/announcements.py` | Enabled scope and target ID parameters during announcement creation. |
| `backend/app/blueprints/student/groups.py` | Added multipart proposal upload support and automatic sequential naming fallback. |
| `backend/tests/conftest.py` | Updated test fixtures to generate valid `f{year}-{number}` rolls and activate student accounts via token. |
| `backend/tests/test_students.py` | Aligned student creation tests with roll formats and password activation. |

### 3. Frontend New & Untracked Files

| File Path | Description & Functional Purpose |
| :--- | :--- |
| `frontend/src/pages/auth/SetPasswordPage.jsx` | Dedicated account activation page with password visibility toggle, requirements checklist, and auto-redirect to login. |
| `frontend/src/api/supervisorsApi.js` | Axios API client for supervisor discovery, group requests, and evaluator decision actions. |
| `frontend/src/api/reportsApi.js` | Axios API client for triggering and downloading Excel group reports. |

### 4. Frontend Modified Files

| File Path | Key Modifications |
| :--- | :--- |
| `frontend/src/App.jsx` | Registered public `/set-password` route. |
| `frontend/src/api/authApi.js` | Added `setPassword({ token, new_password })` and updated login to support `email_or_roll`. |
| `frontend/src/api/studentsApi.js` | Added methods for ungrouped listing, Excel export, email notification, and password resend. |
| `frontend/src/pages/auth/SignInPage.jsx` | Updated credentials field label and placeholder to "Roll Number or Email". |
| `frontend/src/pages/manager/ManagerDashboard.jsx` | Added Ungrouped Students Management collapsible panel (with department/course filter, Excel export, and reminder email modal). Fixed array extraction bug that caused blank screen crash. Updated announcement creation modal with scope selectors. |
| `frontend/src/pages/manager/groups/ManageGroupsPage.jsx` | Added "Download Group Report" (.xlsx) button, formation status pills, supervisor column, and proposal document download link. |
| `frontend/src/pages/manager/students/AddStudentPage.jsx` | Roll number format helper (`f2024-551`), email activation notification banner, mandatory vs optional field visual markers. |
| `frontend/src/pages/manager/students/StudentListPage.jsx` | Added "Resend Password Email" action button, department filters, and updated roll badge styles. |
| `frontend/src/pages/manager/courses/AddCoursePage.jsx` | Aligned field labels with "Group Formation Deadline". |
| `frontend/src/pages/manager/courses/CourseListPage.jsx` | Table column updated to "Group Formation Deadline". |
| `frontend/src/pages/manager/teachers/TeacherListPage.jsx` | Added expertise domain tag badges and active supervision quota progress (`X/4 Groups`). |
| `frontend/src/pages/manager/profile/ManagerProfilePage.jsx` | Added evaluator domain expertise tag manager. |
| `frontend/src/pages/student/groups/CreateGroupPage.jsx` | Replaced manual group naming with auto-naming info banner and added required Project Proposal document upload. |
| `frontend/src/pages/student/groups/MyGroupPage.jsx` | Full supervisor workflow: assigned supervisor card, pending request alert banner with cancel action, and supervisor discovery directory with domain filters. |
| `frontend/src/pages/evaluator/EvaluatorDashboard.jsx` | Added incoming supervisor requests inbox with Accept/Decline action buttons and decline reason modal. |

---

## 🐛 Bug Fixes & Stability Hardening

1. **Manager Dashboard White Screen Resolution (`TypeError: ungroupedStudents.map`):**
   - *Root Cause:* The backend endpoint `GET /api/manager/students/ungrouped` returns an object `{ items: [...], total: N }`. The frontend code originally stored `res.data` directly into `ungroupedStudents`. When expanding the accordion, React attempted `ungroupedStudents.map(...)` on an Object, causing an uncaught exception that rendered the screen completely white.
   - *Fix:* Safely unpacked `const items = Array.isArray(res.data) ? res.data : (res.data?.items || [])` and added fallback key identifiers (`key={s.id || s._id || s.roll}`).
2. **Evaluator Supervisor Request Route Matching:**
   - Evaluator blueprint routes were updated with `strict_slashes=False` to handle requests with and without trailing slashes gracefully.
3. **Database ObjectId / String Hybrid Matching:**
   - In `AuthService.set_password_with_token`, updated query to `{"_id": {"$in": target_ids}}` where `target_ids` includes both string and `ObjectId` representations, ensuring flawless password activation.
4. **Group Creation Name Parsing:**
   - In `student/groups.py`, ensured `name = json_body.get("name")` is parsed when receiving `application/json`, preserving custom test names while auto-generating names when omitted.

---

---

## 🚀 Iterations Group Formation Cutoff & Per-Course Supervisor Cap (New Architecture)

### 1. Architectural Problem & Solved Need
- **Prior Restriction:** The manager was forced to define a group formation deadline at the moment of course creation (`AddCoursePage.jsx`). If semester dates shifted or requirements evolved, course configurations were rigid.
- **New Pattern (Decoupled Course Shell):** Course creation is now decoupled from the group formation cutoff. The manager defines basic academic parameters (`name`, `dept`, `min_group`, `max_group`), while **Iteration Milestones** serve as the dynamic deadline and deliverable authority.
- **Iteration Cutoff Designation:** The manager can designate any Iteration Milestone as the official **Group Formation & Proposal Cutoff** (`is_group_formation = True`) and configure a specific grade deduction penalty (`late_penalty_percent`, e.g., `-10%`).
- **Late Formation Defaulter Tracking:**
  - When students create groups, their formation timeliness is dynamically evaluated against the milestone deadline (`on_time` vs `late`).
  - In `IterationSubmissionsPage.jsx`, groups formed after the cutoff receive a prominent `⚠️ Late Formation (-X%)` tag.
  - An **Ungrouped Students / Defaulters** section appears directly beneath the submissions table, highlighting students enrolled in the course who failed to form or join a group by the cutoff date.
- **Per-Course Supervisor Quota (`<= 4` groups per specific course):**
  - Clarified and enforced supervisor capacity strictly **per course**. An internal or external evaluator can oversee up to 4 groups in *Course A* (e.g. Capstone) and still take on groups in *Course B* (e.g. FYP).
  - Student supervisor browsing filters and capacity badges (`{count}/4 Groups in {course}`) accurately reflect capacity in the student's enrolled course.
  - Evaluator Dashboard reports `supervision_by_course` breakdowns and issues course-scoped capacity warnings.

### 2. File Updates for Iteration Formation & Per-Course Quota
- `backend/app/schemas/course_schema.py`: Made `group_formation_deadline` and `deadline` optional in `CreateCourseSchema`.
- `backend/app/services/course_service.py`: `create_course` no longer requires `effective_deadline`.
- `backend/app/models/iteration.py`: Added `IS_GROUP_FORMATION = "is_group_formation"` and `LATE_PENALTY_PERCENT = "late_penalty_percent"`.
- `backend/app/blueprints/manager/iterations.py`:
  - Added `is_group_formation` and `late_penalty_percent` to `POST /api/manager/iterations` and `PUT /api/manager/iterations/<id>`.
  - Enriched `GET /api/manager/iterations/<id>/submissions` to return `formation_status`, `is_formation_late` per group, and `ungrouped_students` in that course.
- `backend/app/services/group_service.py`: Updated `compute_formation_status` to prioritize Iteration Milestone deadlines for the course before falling back to course defaults.
- `backend/app/services/supervisor_service.py`:
  - `get_evaluator_active_count(evaluator_id, course_name=None)`: filters active groups by course name when provided.
  - `list_available_supervisors`: computes `active_supervision_count` and availability strictly per course.
  - `create_supervisor_request` & `accept_supervisor_request`: enforce the 4-group limit against `group.course`.
- `backend/app/blueprints/student/supervisors.py`: Pass student course to `list_available_supervisors`.
- `backend/app/blueprints/evaluator/routes.py`: Enriched `GET /api/evaluator/dashboard` with `active_supervision_count` and `supervision_by_course` breakdown.
- `frontend/src/pages/manager/courses/AddCoursePage.jsx`: Group formation deadline made optional with helper notice directing to Iterations.
- `frontend/src/pages/manager/iterations/IterationFormModal.jsx`: Added toggle for "Designate as Group Formation & Proposal Cutoff" and input for "Late Group Formation Penalty (%)".
- `frontend/src/pages/manager/iterations/IterationsManagePage.jsx`: Added milestone badge for `Formation Cutoff (-X%)`.
- `frontend/src/pages/manager/iterations/IterationSubmissionsPage.jsx`: Banner for formation cutoff, stat cards for late formations and ungrouped defaulters, `Late Formation` badges, and dedicated defaulters table.
- `frontend/src/pages/student/groups/MyGroupPage.jsx`: Supervisor capacity pills and browse UI clarify the limit is 4 groups per course.
- `frontend/src/pages/evaluator/EvaluatorDashboard.jsx`: Displays `supervision_by_course` breakdown and course-scoped cap warnings.
- `backend/tests/test_sprint5_features.py`: Added `test_course_decoupling_and_iteration_group_formation` and `test_supervisor_cap_enforced_per_course`.

---

## 👥 Ungrouped Students Management Relocation (Manage Groups Integration)

### 1. Motivation & UX Optimization
- **Original Placement:** Ungrouped students management lived inside a large expandable accordion panel on the Manager Dashboard (`ManagerDashboard.jsx`).
- **Issues:** Decluttered dashboard space, separated ungrouped students from the group formation workflows, and caused navigation fragmentation.
- **Relocated Pattern:** Relocated into **Manage Project Groups** (`ManageGroupsPage.jsx`) as a dedicated, first-class tab (`Ungrouped Students`), complete with real-time counter badge, search, department/course filters, Excel export, and email notification modal.
- **Deep Linking & Backward Compatibility:**
  - Clicking the "Students Without a Group" StatCard on `ManagerDashboard.jsx` smoothly routes to `/manager/groups?tab=ungrouped`.
  - In `App.jsx`, route `/manager/ungrouped-students` redirects to `/manager/groups?tab=ungrouped`.
  - In `IterationSubmissionsPage.jsx`, the "Manage Ungrouped Students &rarr;" button directly navigates to `/manager/groups?tab=ungrouped`.

### 2. Files Updated
- `frontend/src/pages/manager/groups/ManageGroupsPage.jsx`: Added `useSearchParams` tab synchronization, `Ungrouped Students` tab button with live count badge, filter toolbar, full student roster table, Excel export, and custom email notification modal.
- `frontend/src/pages/manager/ManagerDashboard.jsx`: Removed accordion panel and notify modal; updated "Students Without a Group" `StatCard` with click navigation to `/manager/groups?tab=ungrouped`.
- `frontend/src/App.jsx`: Added redirect `<Route path="ungrouped-students" element={<Navigate to="/manager/groups?tab=ungrouped" replace />} />`.
- `frontend/src/pages/manager/iterations/IterationSubmissionsPage.jsx`: Updated navigation button to `/manager/groups?tab=ungrouped`.

---

## 🎯 Verification Commands

To verify the entire implementation locally:

```bash
# Backend Sprint 5+ Test Suite (All 7 Tests Pass 100%)
cd backend
.\venv\Scripts\pytest.exe tests\test_sprint5_features.py -v

# Frontend Build & Lint Checks (0 Errors)
cd ../frontend
npm run lint
npm run build
```


