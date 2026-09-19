# Sprint 5+ — Requirements Refinement & Implementation Plan
## PBL Management System · Beaconhouse National University

**Document Version:** 1.0  
**Date:** 2026-09-18  
**Status:** Ready for Implementation  
**Baseline:** Sprint 04 complete (Evaluator portal, rubric scoring, exhibition evaluations, supervision meetings)

---

## Table of Contents

1. [Architectural Decisions](#1-architectural-decisions)
2. [Polished & Organised Requirements](#2-polished--organised-requirements)
3. [Impact Analysis — What Changes vs. What is New](#3-impact-analysis)
4. [Data Model Changes](#4-data-model-changes)
5. [API Changes](#5-api-changes)
6. [Frontend Changes](#6-frontend-changes)
7. [Sprint Breakdown](#7-sprint-breakdown)
8. [Open Items — Awaiting Format/Template](#8-open-items)
9. [Email Infrastructure](#9-email-infrastructure)

---

## 1. Architectural Decisions

These decisions were confirmed before writing this plan and resolve all design-forking ambiguities.

| # | Decision |
|---|---------|
| D-01 | **Supervisor = Evaluator role.** No new role is needed. Internal and external instructors use the existing `evaluator` role. Supervisor requests are sent by the Group Team Lead to existing evaluator accounts. |
| D-02 | **Group Formation Deadline is per-course.** The existing `deadline` field in the `courses` collection is **renamed** to `group_formation_deadline`. It represents "the date by which all groups must be formed." This removes the ambiguous "Final Project Submission Deadline" from course creation (Req 6). Submission deadlines are managed exclusively through iterations. |
| D-03 | **SMTP email is implemented now.** The system will use an email service (SendGrid recommended; configurable via env vars) for: (a) student account creation → password-set link, and (b) ungrouped student notifications. Credentials are injected via `.env`. |
| D-04 | **Group auto-naming uses a configurable placeholder format** `GRP-{YEAR}-{SEQ:03d}` (e.g. `GRP-2026-001`). The format constant lives in a single config location and is swapped when the real format is confirmed. |
| D-05 | **Supervisor project cap is 4.** The system enforces this automatically. Once an evaluator supervises 4 active groups, they are excluded from the supervisor browse list and any new request to them is rejected. |

---

## 2. Polished & Organised Requirements

### REQ-01 — Student Identity & Authentication

**Scope:** Student creation, email format, roll format, login.

#### REQ-01.1 — Roll Number & Email Format

- Roll numbers **must** follow the format `f{year}-{number}` in **lowercase**, e.g. `f2023-551`, `f2020-001`.
- The system auto-derives the student email as `{roll}@bnu.edu.pk`, e.g. `f2023-551@bnu.edu.pk`.
- Both roll number and email must be stored in **lowercase**. The backend must `.lower()` both values before persisting.
- The Manager UI must validate the roll field against the regex `^f\d{4}-\d+$` before submission.
- Duplicate roll numbers must be rejected; the error message must specify the conflicting roll.

#### REQ-01.2 — Mandatory Fields at Creation

- `student_id` (roll number) and `name` are the **only mandatory fields** at creation time.
- All other fields (department, section, course, session, teacher) are optional at creation and can be completed later via the student profile edit.
- The Manager UI must clearly distinguish required from optional fields.

#### REQ-01.3 — Password-Set Email on Creation

- When a student account is created, the system **automatically sends an email** to `{roll}@bnu.edu.pk` containing a one-time password-set link.
- The link contains a signed JWT token with a short expiry (24 hours).
- The student follows the link to set their own password on first login.
- This email applies **only to students**; evaluator and manager accounts receive their credentials via a different channel (Manager sets password directly).
- If the email fails to send, the account is still created and the error is logged; the Manager can re-trigger the email from the student detail view.

#### REQ-01.4 — Login by Roll Number or Email

- Students must be able to log in using **either** their roll number (e.g. `f2023-551`) **or** their full email (`f2023-551@bnu.edu.pk`).
- The login backend resolves the identity by: if the value contains `@`, treat it as email; otherwise treat it as a roll number and look up the email.
- Matching must be **case-insensitive** (stored values are lowercase; input is lowercased before lookup).

---

### REQ-02 — Automatic Group Name Generation

**Scope:** Group creation by students, naming convention.

#### REQ-02.1 — Auto-Generated Group Names

- When a student creates a group, the system **auto-generates the group name**; students do not provide a name.
- The current placeholder format is `GRP-{YEAR}-{SEQ:03d}` where `{YEAR}` is the current calendar year and `{SEQ}` is a zero-padded sequential counter scoped to the year (e.g. `GRP-2026-001`, `GRP-2026-002`).
- The counter resets each calendar year.
- The format constant lives in `backend/app/config.py` (`GROUP_NAME_FORMAT`) so it can be updated without touching logic.
- **Action item:** The exact naming format will be confirmed by the project team. When confirmed, update `GROUP_NAME_FORMAT` and `GROUP_NAME_YEAR_SCOPE` in config.

#### REQ-02.2 — Group Creation Timestamp

- The `created_at` field (already present) records the exact UTC date and time the group was created.
- The API response for any group listing must expose `created_at` as an ISO-8601 string.

#### REQ-02.3 — Group Formation Status

- Each group document stores a `formation_status` field with one of three values:
  - `on_time` — created before the course's `group_formation_deadline`
  - `on_deadline` — created on the same calendar day as the deadline (UTC date matches)
  - `late` — created after the course's `group_formation_deadline`
- The `formation_status` is computed and **written once at group creation time** and never recalculated.
- If the course has no `group_formation_deadline` set, `formation_status` defaults to `null`.

#### REQ-02.4 — Ungrouped Students List

- The Manager Dashboard exposes a dedicated "Ungrouped Students" section.
- It lists all active students who have no `group_id` set on their user document.
- The list supports filtering by **department** and **course**.
- The Manager can **download the list as an Excel (.xlsx) file** with columns: Serial No., Roll Number, Name, Department, Section, Course.
- The file is generated on demand (no caching required).

#### REQ-02.5 — Ungrouped Student Email Notification

- The Manager can trigger an **email notification** to all ungrouped students (or a filtered subset by department/course) from the Ungrouped Students list.
- The email informs the student that they have not yet been assigned to a group and includes a reminder of the group formation deadline.
- The Manager can preview the recipient count before sending.
- Sending is **manual, Manager-triggered**; there is no automated scheduler for this.

---

### REQ-03 — Group Creation & Late-Status Tracking

**Scope:** What data the group document records and how it is surfaced.

#### REQ-03.1 — Group Document Fields

Every `groups` document must record:

| Field | Type | Description |
|-------|------|-------------|
| `created_at` | datetime | UTC timestamp of group creation (already exists) |
| `formation_status` | string | `on_time` / `on_deadline` / `late` / `null` (see REQ-02.3) |
| `supervisor_id` | ObjectId \| null | Assigned supervisor (set when a supervisor request is accepted) |
| `supervisor_name` | string | Denormalised supervisor name for fast reads |
| `proposal_attachment_id` | ObjectId \| null | Reference to an attachment document for the initial proposal file |
| `submission_status` | string | `not_submitted` / `submitted` (tracks whether the group has made their first iteration submission) — separate from `formation_status` |

#### REQ-03.2 — Proposal Attachment at Group Creation

- When a student creates a group, they **must attach a proposal document** (PDF or Word, max 10 MB).
- The proposal is stored as an attachment document and linked via `proposal_attachment_id`.
- The Manager can view and download the proposal from the group detail view before approving or rejecting the group.
- The proposal is visible in the group-wise report.

#### REQ-03.3 — Clear Separation: Formation vs. Submission Status

- `formation_status` tracks **group creation** relative to the formation deadline.
- `submission_status` tracks whether the group has submitted their first iteration deliverable.
- These two statuses are displayed separately everywhere they appear (dashboard, group list, report).

---

### REQ-04 — Department-Based Filtering

**Scope:** Wherever student or group lists are displayed.

- Every list view that includes students or groups must offer a **department filter**.
- The department filter is a dropdown populated from the active departments in the system.
- This applies to: Manager Students, Manager Groups, Manager Iterations (submission view), Ungrouped Students list, Supervisor Browse (student-facing).
- The backend `GET` endpoints for these resources already support a `dept` query parameter; frontend must wire it up where not already done.

---

### REQ-05 — Supervisor Management & Request Workflow

**Scope:** Supervisor profile, student-initiated requests, project cap.

#### REQ-05.1 — Supervisor Domain/Expertise Profile

- Each evaluator (instructor/supervisor) document gains a `domains` field — an array of domain/expertise tags (e.g. `["Machine Learning", "Web Development", "IoT"]`).
- Evaluators can edit their domains from their profile settings page.
- The Manager can also edit the domains from the teacher/evaluator management view.

#### REQ-05.2 — Supervisor Browse (Student-Facing)

- Students can browse all available supervisors from their Group management page (only visible after a group is created).
- Each supervisor card displays: name, department, domains/expertise, current project count, and availability status.
- Students can **filter supervisors by domain/expertise**.
- A supervisor is shown as **unavailable** when they are already supervising 4 groups (`active_supervision_count >= 4`).
- Unavailable supervisors are visible but clearly marked and cannot receive new requests.

#### REQ-05.3 — Supervisor Request Workflow

- Only the **Group Team Lead** can submit a supervisor request on behalf of the group.
- A group can have at most **one pending supervisor request** at a time.
- A group with an already-accepted supervisor cannot submit a new request unless the current supervisor is removed (Manager action only).
- Request states: `pending` → `accepted` / `rejected` / `cancelled`.
- When a request is **accepted**:
  - `groups.supervisor_id` and `groups.supervisor_name` are updated.
  - The evaluator's `active_supervision_count` is incremented.
  - All other pending requests from this group (if any residual) are cancelled.
  - An `assignments` document is created (existing collection) linking the evaluator to the group.
- When a request is **rejected**:
  - The group can submit a new request to a different supervisor.
  - The rejection reason (optional) is recorded on the request document.
- When a supervisor's count reaches 4, no new request can be submitted to them — the system returns a 400 error.

#### REQ-05.4 — Supervisor Request Collection

New collection: `supervisor_requests`

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `group_id` | ObjectId | The requesting group |
| `evaluator_id` | ObjectId | The target supervisor/evaluator |
| `requested_by` | ObjectId | The team lead's user ID |
| `status` | string | `pending` / `accepted` / `rejected` / `cancelled` |
| `request_message` | string \| null | Optional message from the team lead |
| `rejection_reason` | string \| null | Optional reason if rejected |
| `created_at` | datetime | When the request was submitted |
| `responded_at` | datetime \| null | When the evaluator responded |

#### REQ-05.5 — Supervisor Dashboard (Evaluator-Facing)

- Evaluators see a "Supervisor Requests" section in their dashboard.
- Lists incoming requests with: group name, project title (if set), team lead name, and request message.
- Evaluator can **Accept** or **Reject** each pending request.
- The dashboard shows: "You are supervising X / 4 groups."

#### REQ-05.6 — Automatic Capacity Enforcement

- The `evaluator.active_supervision_count` field is a denormalised integer kept in sync.
- Computed as the count of `assignments` documents where `evaluator_id` matches and the group is not deleted.
- When accepting a request would push the count to 5, the system rejects the accept action with an error.

---

### REQ-06 — Course Creation — Remove Submission Deadline

**Scope:** Course model and course creation/edit forms.

- The `deadline` field is **renamed** to `group_formation_deadline` in the `courses` collection.
- The label in the Manager UI changes from "Final Project Submission Deadline" to "Group Formation Deadline."
- The field's purpose is now strictly: the date by which all student groups must be formed.
- All submission deadlines (e.g. iteration due dates) are managed through the Iterations module only.
- Existing course documents with a `deadline` field will be migrated via a one-time migration script: `rename deadline → group_formation_deadline`.

---

### REQ-07 — Group-Wise Final Report

**Scope:** Manager Dashboard report generation.

#### REQ-07.1 — Report Content

The group-wise report is a downloadable Excel/PDF file containing one row per group. Required columns:

| # | Column | Source |
|---|--------|--------|
| 1 | Serial No. | Row sequence |
| 2 | Group Name | `groups.name` |
| 3 | Student IDs | Comma-separated roll numbers of all members |
| 4 | Student Names | Comma-separated names of all members |
| 5 | Project Title | `groups.project_title` |
| 6 | Supervisor | `groups.supervisor_name` |
| 7 | Group Status | `groups.status` (pending/approved/rejected) |
| 8 | Formation Status | `groups.formation_status` (on_time/on_deadline/late) |
| 9 | Proposal Attached | Yes / No (based on `proposal_attachment_id`) |
| 10 | Core Domain | Derived from supervisor domains or group-set domain |
| 11 | Department | `groups.dept` |
| 12 | Course | `groups.course` |

> **Note:** The exact report template/format will be provided by the project team. When provided, the column set and layout will be updated. The infrastructure (Excel generation with openpyxl, report endpoint, Manager UI button) will be built now against the columns above.

#### REQ-07.2 — Report Generation

- Available as a button: **"Download Group Report"** on the Manager Groups page.
- Supports filtering by department and course before downloading.
- Format: Excel (.xlsx) using openpyxl (already a dependency).
- Endpoint: `GET /api/manager/reports/groups` with optional `dept` and `course` query params.

---

### REQ-08 — Group-Specific Announcements

**Scope:** Announcement targeting.

#### REQ-08.1 — Targeted Announcements

- When creating an announcement, the Manager selects a **target scope**:
  - `broadcast` — all students (current behaviour)
  - `department` — all students in a selected department
  - `group` — one or more specific groups
- The `announcements` collection gains a `scope` field (`broadcast` / `department` / `group`) and a `target_ids` array (department codes or group ObjectIds, respectively).
- When fetching announcements, the student endpoint filters: return announcements where scope is `broadcast`, OR scope is `department` and the student's dept matches, OR scope is `group` and the student's group_id is in `target_ids`.

#### REQ-08.2 — UI Changes

- The Manager announcement creation modal gains a "Send To" selector.
- Default remains `broadcast`.
- Selecting `group` shows a multi-select list of groups (searchable by group name).
- Selecting `department` shows a department dropdown.

---

### REQ-09 — FYP Iterations Structure

**Scope:** Iteration module (Sprint 03 foundation exists).

- The iteration module foundation is already implemented (iteration creation, deadline, rubrics, file submission, late detection).
- The exact iteration structure/names/phases (Proposal, Literature Review, Prototype, Final) will be provided by the project team.
- **What to build now:** Ensure the iteration model is flexible enough to support any number of named phases with independent deadlines and rubric sets. This is already the case.
- **What to defer:** Any hardcoded iteration names, fixed rubric criteria, or sequence enforcement. These are added when the format is confirmed.
- **Action item:** When the iteration structure is provided, create a seed/migration script that populates the iterations with correct names, deadlines, and rubric templates for the current cohort.

---

### REQ-10 — Rubrics & SRS Deliverables

**Scope:** Rubric templates and evaluation.

- The rubric template infrastructure (create template, attach to iteration, weighted scoring) is already implemented.
- The exact rubric criteria per deliverable/phase will be provided by the project team.
- **What to build now:** Ensure rubric criteria are fully configurable (criterion name, weight, 0–5 level descriptors). Already the case.
- **What to defer:** Pre-populating specific rubric criteria tied to SRS deliverables.
- **Action item:** When the criteria sheet is provided, create a seed script that populates the `rubric_templates` collection.

---

## 3. Impact Analysis

### 3.1 Changes to Existing Code

| Area | What Changes | Effort |
|------|-------------|--------|
| `student_service.py` | Email/roll lowercased; roll format validated; password-set email sent instead of returning raw password | Medium |
| `auth/routes.py` `POST /login` | Accept roll number as username; resolve to email before JWT lookup | Small |
| `courses` model/schema/service | Rename `deadline` → `group_formation_deadline`; update all references | Small |
| `groups` service | Auto-generate name; compute + store `formation_status` at creation; require proposal attachment | Medium |
| `announcements` service/schema | Add `scope` + `target_ids` fields; update student fetch query | Small |
| Manager student creation form | Roll format validation, remove raw password display, show "email sent" status | Small |
| Login form | Accept roll or email in single field | Trivial |
| Course creation/edit form | Rename deadline label | Trivial |
| Group creation flow (student) | Remove name field, add proposal upload, show auto-generated name after creation | Medium |

### 3.2 New Features (Net-New Code)

| Feature | Backend | Frontend |
|---------|---------|---------|
| Password-set token + email on student create | New endpoint + email service module | Re-trigger email button in student detail |
| Ungrouped students list + download | New service function + report endpoint | New section in Manager Dashboard |
| Ungrouped email notification trigger | New endpoint `POST /api/manager/students/notify-ungrouped` | Button + confirm modal in Manager |
| Supervisor domain profiles | Field added to evaluator documents; update endpoint | Edit domain tags in evaluator profile/manager teacher view |
| Supervisor browse list (student) | New endpoint `GET /api/student/supervisors` | New page/tab in Student → Group management |
| Supervisor request CRUD | New namespace `/api/student/supervisor-requests` + evaluator endpoints | Team lead request UI; evaluator inbox |
| Group-wise report download | `GET /api/manager/reports/groups` | Download button in Manager Groups |
| Group-specific announcements | Modified create/fetch endpoints | "Send To" selector in announcement modal |
| Email service module | `backend/app/services/email_service.py` | N/A |

---

## 4. Data Model Changes

### 4.1 `users` collection (students)

```
BEFORE:
  roll: "F2023-551"     ← uppercase, inconsistent

AFTER:
  roll: "f2023-551"     ← lowercase, enforced by backend
  email: "f2023-551@bnu.edu.pk"  ← lowercase (already stored this way via update)
  password_set: false   ← NEW: false until the student sets their own password
  password_set_at: null ← NEW: timestamp when password was set
```

### 4.2 `users` collection (evaluators/supervisors)

```
ADDED FIELDS:
  domains: ["Machine Learning", "Web Development"]   ← array of expertise tags
  active_supervision_count: 0   ← denormalised count (incremented on supervisor accept)
```

### 4.3 `courses` collection

```
RENAMED FIELD:
  deadline  →  group_formation_deadline
```

### 4.4 `groups` collection

```
ADDED FIELDS:
  formation_status: "on_time" | "on_deadline" | "late" | null
  supervisor_id: ObjectId | null
  supervisor_name: str | null
  proposal_attachment_id: ObjectId | null
  submission_status: "not_submitted" | "submitted"

CHANGED FIELD:
  name: now auto-generated (was student-provided)
```

### 4.5 `announcements` collection

```
ADDED FIELDS:
  scope: "broadcast" | "department" | "group"   ← default "broadcast"
  target_ids: []  ← dept codes or group ObjectIds depending on scope
```

### 4.6 New collection: `supervisor_requests`

```json
{
  "_id": ObjectId,
  "group_id": ObjectId,
  "evaluator_id": ObjectId,
  "requested_by": ObjectId,
  "status": "pending" | "accepted" | "rejected" | "cancelled",
  "request_message": str | null,
  "rejection_reason": str | null,
  "created_at": datetime,
  "responded_at": datetime | null
}

INDEXES:
  { "group_id": 1, "status": 1 }
  { "evaluator_id": 1, "status": 1 }
  { "group_id": 1, "evaluator_id": 1 }
    — unique partial on status="pending" to prevent duplicate pending requests
```

### 4.7 New collection: `password_set_tokens`

```json
{
  "_id": ObjectId,
  "user_id": ObjectId,
  "token_hash": str,        ← bcrypt hash of the token (raw token is emailed)
  "expires_at": datetime,   ← 24h from creation
  "used": false,
  "created_at": datetime
}

INDEXES:
  { "user_id": 1 }
  { "expires_at": 1 }, TTL: auto-expire documents
```

---

## 5. API Changes

### 5.1 Modified Endpoints

| Endpoint | Change |
|---------|--------|
| `POST /api/auth/login` | Accept `email_or_roll` field; resolve roll to email before JWT |
| `POST /api/manager/students/` | Validate roll format; lowercase; send password-set email; return `{ student_id, email, password_set_email_sent }` instead of raw password |
| `GET /api/manager/students/` | Add dept filter (already present — verify wired in frontend) |
| `POST /api/manager/courses/` | Field name `deadline` → `group_formation_deadline` |
| `PUT /api/manager/courses/<id>` | Same rename |
| `POST /api/student/groups/` | No name field; auto-generate name; require proposal file upload (`multipart/form-data`); compute `formation_status` |
| `GET /api/manager/groups/` | Include `formation_status`, `supervisor_name`, `submission_status` in response |
| `POST /api/manager/announcements/` | Add `scope` + `target_ids` fields |
| `GET /api/student/announcements/` | Filter by scope + student's dept/group |

### 5.2 New Endpoints

#### Auth / Password Setup

```
POST /api/auth/set-password
  Body: { token: str, new_password: str }
  Validates token against password_set_tokens collection.
  Sets users.password_hash, marks token as used, sets password_set: true.
  Returns: 200 OK

POST /api/manager/students/<id>/resend-password-email
  Sends a fresh password-set email (regenerates token, invalidates old one).
  Returns: 200 OK
```

#### Manager — Ungrouped Students

```
GET /api/manager/students/ungrouped
  Query: dept, course
  Returns: list of students with no group_id

GET /api/manager/students/ungrouped/export
  Query: dept, course
  Returns: Excel (.xlsx) file download

POST /api/manager/students/notify-ungrouped
  Body: { dept?: str, course?: str, message?: str }
  Sends notification email to all matching ungrouped students.
  Returns: { sent_count: int }
```

#### Manager — Reports

```
GET /api/manager/reports/groups
  Query: dept, course, status
  Returns: Excel (.xlsx) group-wise report download
```

#### Supervisor Browse (Student)

```
GET /api/student/supervisors
  Query: domain, dept, available_only
  Returns: list of evaluators with { id, name, dept, domains, active_supervision_count, is_available }
```

#### Supervisor Requests (Student)

```
POST /api/student/supervisor-requests
  Body: { evaluator_id: str, request_message?: str }
  Only team lead. Only if group has no accepted supervisor.
  Returns: 201 created request

GET /api/student/supervisor-requests/my
  Returns: the current group's supervisor request (pending/accepted/rejected)

DELETE /api/student/supervisor-requests/<id>
  Cancel a pending request (team lead only)
```

#### Supervisor Requests (Evaluator)

```
GET /api/evaluator/supervisor-requests
  Returns: all pending requests directed to this evaluator

POST /api/evaluator/supervisor-requests/<id>/accept
  Accepts request; updates group.supervisor_id; increments active_supervision_count.
  Returns: 200 OK

POST /api/evaluator/supervisor-requests/<id>/reject
  Body: { reason?: str }
  Returns: 200 OK
```

#### Evaluator Profile — Domains

```
PUT /api/evaluator/profile/domains
  Body: { domains: [str] }
  Returns: 200 OK

PUT /api/manager/teachers/<id>/domains
  Body: { domains: [str] }
  Manager can edit evaluator domains.
  Returns: 200 OK
```

---

## 6. Frontend Changes

### 6.1 Login Page (`SignInPage.jsx`)

- Change the email field label to **"Roll Number or Email"**.
- Accept both `f2023-551` and `f2023-551@bnu.edu.pk`.
- The value is sent to the backend as-is in a field renamed to `email_or_roll`.

### 6.2 New Page: Password Set (`/set-password?token=...`)

- Public route (no auth required).
- Reads `token` from URL query param.
- Form: new password + confirm password.
- On submit: `POST /api/auth/set-password`.
- On success: redirect to `/login` with a success toast.

### 6.3 Manager — Student Management

- Student creation form:
  - Roll field: placeholder `f2026-001`, validated with regex `^f\d{4}-\d+$`.
  - Remove the "Generated Password" display on success.
  - Show "Password setup email sent to f2026-001@bnu.edu.pk" instead.
  - Add a "Resend Password Email" button in the student detail/edit modal.

### 6.4 Manager — Course Creation/Edit

- Rename "Final Project Submission Deadline" label → **"Group Formation Deadline"**.
- Update tooltip to explain: "The deadline by which all student groups must be formed."

### 6.5 Manager — Groups Page

- Add `Formation Status` column to the groups table with colour coding:
  - `on_time` → green badge
  - `on_deadline` → yellow badge
  - `late` → red badge
- Add `Submission Status` column.
- Add `Supervisor` column.
- In the Group Detail modal: show the proposal attachment with a download link.
- Add **"Download Group Report"** button with `dept` and `course` filter dropdowns.

### 6.6 Manager — Dashboard

- Add "Ungrouped Students" stat card (count of ungrouped students).
- Add "Ungrouped Students" section (expandable panel or separate tab):
  - Table: Roll, Name, Department, Section, Course.
  - Filter by department, course.
  - **"Download List"** button → Excel export.
  - **"Send Notification Email"** button → confirm modal with recipient count → triggers email.

### 6.7 Manager — Announcements

- Announcement create/edit modal gains a **"Send To"** field:
  - Radio: Broadcast (default) / Department / Specific Groups.
  - If Department → department dropdown.
  - If Specific Groups → searchable multi-select of group names.

### 6.8 Manager — Teachers/Evaluators

- Teacher/evaluator list and detail modal gains a **"Domains"** tag editor.
- Shows `active_supervision_count` next to each evaluator.

### 6.9 Student — Group Creation

- Remove the "Group Name" input field.
- Add **"Attach Proposal"** file dropzone (PDF/Word, max 10 MB, required).
- After creation: display the auto-generated group name in a success banner.

### 6.10 Student — Group Management (New: Supervisor Tab)

- New tab "Find Supervisor" in the student Group management page.
- Visible only when the group exists and has no accepted supervisor.
- Shows a list of supervisors with domain tags, project count, availability.
- Filter bar: domain search, department filter.
- Each card has a **"Request as Supervisor"** button (disabled if unavailable or request pending).
- Shows the current request status if one is pending.

### 6.11 Evaluator — Supervisor Requests

- New section "Supervisor Requests" in the Evaluator Dashboard.
- Cards showing: group name, project title, team lead name, message, timestamp.
- **Accept** / **Reject** buttons per request.
- Shows "You are supervising X / 4 groups" indicator.

### 6.12 Evaluator — Profile

- Add a **"My Expertise / Domains"** tag editor in the Evaluator Profile/Settings page.

---

## 7. Sprint Breakdown

### Sprint 05 — Identity, Course Cleanup & Supervisor Profiles

**Goal:** Get student identity right, fix course model, lay supervisor foundation.

**Backend tasks:**
- [ ] Validate and lowercase roll numbers in `student_service.py`
- [ ] Update `generate_student_email()` to always lowercase
- [ ] Add roll format regex validator (`^f\d{4}-\d+$`) in `student_schema.py`
- [ ] Modify `POST /api/auth/login` to accept `email_or_roll`; resolve roll → email
- [ ] Rename `courses.deadline` → `courses.group_formation_deadline` in model, schema, service, and blueprint
- [ ] Write one-time migration script: `seed/migrate_course_deadline.py`
- [ ] Add `domains` and `active_supervision_count` fields to evaluator user documents (schema + service)
- [ ] `PUT /api/evaluator/profile/domains` endpoint
- [ ] `PUT /api/manager/teachers/<id>/domains` endpoint
- [ ] Create `email_service.py` in `services/` (SendGrid / SMTP; configurable via env)
- [ ] `password_set_tokens` collection + `POST /api/auth/set-password` endpoint
- [ ] Trigger password-set email on `create_student()` in `student_service.py`
- [ ] `POST /api/manager/students/<id>/resend-password-email` endpoint
- [ ] Update `.env.example` with email env vars

**Frontend tasks:**
- [ ] Login page: change email field to accept roll or email
- [ ] New public route `/set-password` with `SetPasswordPage.jsx`
- [ ] Manager student creation form: roll validation, remove password display, show email-sent confirmation
- [ ] Manager student detail: add "Resend Password Email" button
- [ ] Manager course form: rename deadline label
- [ ] Manager teacher detail/edit modal: add domain tag editor
- [ ] Evaluator profile page: add domain tag editor

**Migration:**
- [ ] `seed/migrate_course_deadline.py` — renames `deadline` → `group_formation_deadline` for all course documents

---

### Sprint 06 — Group Formation Overhaul & Supervisor Requests

**Goal:** Auto-naming, formation status, proposal attachment, supervisor request workflow.

**Backend tasks:**
- [ ] Add `GROUP_NAME_FORMAT` config constant
- [ ] Implement `generate_group_name(year, course_id)` in `group_service.py`
- [ ] Add `formation_status` computation to `create_group()` in `group_service.py`
- [ ] Add `proposal_attachment_id`, `supervisor_id`, `supervisor_name`, `formation_status`, `submission_status` to group model constants
- [ ] Modify `POST /api/student/groups/` to: accept proposal file upload, auto-generate name, compute formation_status
- [ ] Create `supervisor_requests` collection + model constants
- [ ] `GET /api/student/supervisors` — browse evaluators, filter by domain/availability
- [ ] `POST /api/student/supervisor-requests` — create request (team lead only)
- [ ] `GET /api/student/supervisor-requests/my` — current group's request
- [ ] `DELETE /api/student/supervisor-requests/<id>` — cancel
- [ ] `GET /api/evaluator/supervisor-requests` — incoming requests
- [ ] `POST /api/evaluator/supervisor-requests/<id>/accept` — accept + update group + increment count
- [ ] `POST /api/evaluator/supervisor-requests/<id>/reject` — reject with optional reason
- [ ] Enforce cap: reject accept action if `active_supervision_count >= 4`
- [ ] `GET /api/manager/students/ungrouped` — list ungrouped students
- [ ] `GET /api/manager/students/ungrouped/export` — Excel download
- [ ] `POST /api/manager/students/notify-ungrouped` — trigger email notifications

**Frontend tasks:**
- [ ] Student group creation: remove name field, add proposal upload dropzone, display auto-name post-creation
- [ ] Student group management: new "Find Supervisor" tab with browse list, domain filter, request button
- [ ] Student group management: show current supervisor request status
- [ ] Evaluator dashboard: new "Supervisor Requests" section with accept/reject
- [ ] Evaluator dashboard: show supervision capacity indicator (X / 4)
- [ ] Manager Dashboard: "Ungrouped Students" section with table, filters, download, notify
- [ ] Manager Groups: add formation_status badge, submission_status badge, supervisor column
- [ ] Manager Group Detail modal: show proposal attachment download link

---

### Sprint 07 — Announcements, Reports & Department Filtering

**Goal:** Targeted announcements, group-wise report, dept filtering wired everywhere.

**Backend tasks:**
- [ ] Add `scope` + `target_ids` to `announcements` model + schema
- [ ] Update `POST /api/manager/announcements/` to accept scope/target_ids
- [ ] Update `GET /api/student/announcements/` to filter by scope + student's dept/group_id
- [ ] `GET /api/manager/reports/groups` — Excel group-wise report endpoint
- [ ] Audit all `GET` list endpoints: confirm `dept` query param is present and working

**Frontend tasks:**
- [ ] Manager announcement create/edit modal: add "Send To" radio + conditional dept/group selector
- [ ] Student announcements: no UI change needed (backend filters; tagged with group/dept info)
- [ ] Manager Groups: "Download Group Report" button with dept/course filters
- [ ] Confirm dept filter dropdowns are present and wired on: Students, Groups, Ungrouped list, Iterations submissions view

---

### Sprint 08 — Iterations & Rubrics (Pending Format Confirmation)

**Goal:** Implement iteration phases and rubric criteria once the project team provides the exact formats.

**Pre-condition:** Await iteration structure and rubric criteria from the project team.

**Backend tasks (once format confirmed):**
- [ ] Create seed/migration: `seed/seed_iterations.py` — populates iterations with correct phase names, deadlines, and rubric templates for the current cohort
- [ ] Create seed: `seed/seed_rubric_templates.py` — populates rubric criteria per SRS deliverable
- [ ] If sequence enforcement is needed (Phase 2 unlocks after Phase 1 submitted): add `prerequisite_iteration_id` field to `iterations` collection + enforce in submission endpoint

**Frontend tasks:**
- [ ] If any UI changes are needed for the new iteration structure/phases, implement here

---

### Sprint 09 — HOD/Dean Dashboards (Original Sprint 05)

**Goal:** Read-only oversight dashboards for HOD and Dean (deferred from original Sprint 05).

*(This was the original Sprint 05 scope. It is now pushed to Sprint 09 to make room for the higher-priority Sprint 05–07 items above.)*

**Tasks:**
- [ ] `hod_bp` Blueprint — read-only views of groups, students, iteration progress for their department
- [ ] `dean_bp` Blueprint — institution-wide aggregate statistics
- [ ] Frontend: `/hod/*` and `/dean/*` protected routes and dashboards

---

### Sprint 10 — Security, Polish & Testing

*(Previously Sprint 08)*

- [ ] Input sanitisation review across all new endpoints
- [ ] Rate limiting on login and set-password endpoints
- [ ] Token expiry and rotation review
- [ ] Unit tests for new service functions
- [ ] Postman collection update for all new endpoints
- [ ] Accessibility and responsive UI review

---

### Sprint 11 — Deployment

*(Previously Sprint 09)*

- [ ] Production environment variables (email credentials, MongoDB Atlas URI)
- [ ] Gunicorn + systemd configuration for BNU Linux server
- [ ] Frontend build and static hosting setup
- [ ] Final data seed for production cohort

---

## 8. Open Items

These items are explicitly deferred because their exact format or template has not yet been provided by the project team. Infrastructure is built to accommodate them; content is added when confirmed.

| # | Item | Status | Action When Confirmed |
|---|------|--------|-----------------------|
| OI-01 | Exact group auto-naming format | Placeholder `GRP-{YEAR}-{SEQ:03d}` in use | Update `GROUP_NAME_FORMAT` constant in `config.py` |
| OI-02 | Group-wise final report template/layout | Placeholder columns implemented | Update column set, formatting, and layout to match provided template |
| OI-03 | FYP iteration phases and deadlines | Flexible infrastructure in place | Run `seed/seed_iterations.py` once confirmed |
| OI-04 | SRS rubric criteria per deliverable | Rubric template CRUD in place | Run `seed/seed_rubric_templates.py` once confirmed |
| OI-05 | Supervisor/evaluator domain taxonomy | Free-text tags used | Can be replaced with a controlled enum/dropdown once a list is provided |

---

## 9. Email Infrastructure

### 9.1 Email Service Module

File: `backend/app/services/email_service.py`

The module wraps an email provider and exposes two clean functions used by the rest of the application:

```python
def send_password_set_email(to_email: str, student_name: str, set_link: str) -> bool:
    """Sends the account activation / password-set email to a new student."""

def send_ungrouped_notification(to_email: str, student_name: str, deadline: str) -> bool:
    """Sends a reminder email to a student who has not yet joined a group."""
```

### 9.2 Configuration (`.env`)

```env
# Email provider — choose one
MAIL_PROVIDER=sendgrid          # "sendgrid" | "smtp"

# SendGrid
SENDGRID_API_KEY=SG.xxxx...

# SMTP (alternative)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@bnu.edu.pk
SMTP_PASSWORD=secret

# Common
MAIL_FROM_NAME=PBL Portal - BNU
MAIL_FROM_ADDRESS=noreply@bnu.edu.pk
FRONTEND_URL=https://pbl.bnu.edu.pk   # Base URL for the password-set link
```

### 9.3 Password-Set Link Format

```
{FRONTEND_URL}/set-password?token={raw_token}
```

The raw token is a cryptographically random 64-character hex string. Its bcrypt hash is stored in `password_set_tokens`. The link expires in **24 hours**.

### 9.4 Dependencies to Add

```
# requirements.txt additions
sendgrid==6.11.0        # if using SendGrid
# OR
# Flask-Mail is not needed; use smtplib directly for SMTP fallback
```

---

## Appendix A — File Checklist (New & Modified Files)

### New Files

```
backend/app/services/email_service.py
backend/app/blueprints/auth/set_password.py     ← or add to auth/routes.py
backend/app/blueprints/student/supervisors.py
backend/app/blueprints/evaluator/supervisor_requests.py
backend/app/blueprints/manager/reports.py
backend/app/models/supervisor_request.py
backend/app/models/password_set_token.py
backend/seed/migrate_course_deadline.py
backend/seed/seed_iterations.py          ← populated when OI-03 confirmed
backend/seed/seed_rubric_templates.py    ← populated when OI-04 confirmed

frontend/src/pages/auth/SetPasswordPage.jsx
frontend/src/pages/student/groups/SupervisorBrowsePage.jsx  (or tab)
frontend/src/pages/evaluator/SupervisorRequestsPage.jsx     (or section)
frontend/src/api/supervisors.js
frontend/src/api/supervisorRequests.js
frontend/src/api/reports.js
```

### Modified Files

```
backend/app/services/student_service.py
backend/app/services/group_service.py
backend/app/services/manager_group_service.py
backend/app/services/auth_service.py
backend/app/blueprints/auth/routes.py
backend/app/blueprints/manager/students.py
backend/app/blueprints/manager/courses.py
backend/app/blueprints/manager/teachers.py
backend/app/blueprints/manager/announcements.py
backend/app/blueprints/manager/groups.py
backend/app/blueprints/manager/dashboard.py
backend/app/blueprints/student/groups.py
backend/app/blueprints/student/announcements.py
backend/app/blueprints/evaluator/routes.py
backend/app/schemas/course_schema.py
backend/app/schemas/student_schema.py
backend/app/schemas/announcement_schema.py
backend/app/models/group.py
backend/app/models/course.py
backend/app/config.py
backend/.env.example

frontend/src/App.jsx
frontend/src/pages/auth/SignInPage.jsx
frontend/src/pages/manager/StudentsPage.jsx (or equivalent)
frontend/src/pages/manager/CoursesPage.jsx
frontend/src/pages/manager/TeachersPage.jsx
frontend/src/pages/manager/GroupsPage.jsx
frontend/src/pages/manager/DashboardPage.jsx
frontend/src/pages/manager/AnnouncementsPage.jsx
frontend/src/pages/student/groups/*
frontend/src/pages/evaluator/DashboardPage.jsx
frontend/src/pages/evaluator/ProfilePage.jsx (or settings)
```

---

*End of document. Version 1.0 — 2026-09-18.*
