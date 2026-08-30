# Software Requirements Specification (SRS) v2.0
## PBL Management System
### Beaconhouse National University
**Document Version:** 2.0
**Replaces:** SRS v1.0 (dated 2026-08-04)
**Date:** 2026-08-05
**Authors:** Muhammad Ismail Rana (F2023-551), Ramsha Naveed (F2023-027), Sara Haider (F2023-744), Sheikh Muhammad Ibrahim (F2023-630)
**Faculty Supervisor:** [Supervisor name]
**Status:** Approved — Stage 3 Complete

---

## Revision History

| Version | Date | Author | Change Description |
|---------|------|--------|--------------------|
| 1.0 | 2026-08-04 | Ismail | Initial SRS, complete scope, all 10 modules, full API contract, deployment plan |
| 2.0 | 2026-08-05 | Antigravity AI + Team | Corrected BNU domain; resolved HOD I&C, manager storage, Cloudinary, email scope; added 15-contradiction resolution table; aligned with approved database schema and API contracts |

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) describes the complete functional and non-functional requirements for the **PBL Management System** — a web-based platform for managing Final Year Projects (FYP) at Beaconhouse National University (BNU). The document is intended for:

- The development team (Ismail, Ramsha, Sara, Ibrahim) as the authoritative reference for what to build
- Faculty supervisors as the basis for progress review
- Examiners evaluating the project for academic assessment

This document supersedes SRS v1.0. All references to `@SUPERIOR.EDU.PK` or `Superior University` in previous drafts are superseded by BNU-specific terms in this document.

### 1.2 Scope

**System Name:** PBL Management System (PBL Portal)

**System Purpose:** Digitalise and manage the entire FYP lifecycle at BNU — from student enrollment and group formation through iterative submissions, rubric-based evaluation, and institutional oversight — replacing informal email, spreadsheet, and paper processes.

**What the system does:**
- Allows the PBL Manager to enrol students, teachers, departments, and courses; manage groups; define evaluation milestones; publish surveys; and post announcements
- Allows Students to create and join project groups, submit iteration work, and respond to surveys
- Allows Evaluators (faculty and industry) to score rubrics, log meetings, and submit exhibition evaluations
- Allows HODs and Dean to monitor progress through read-only dashboards

**What the system does NOT do:**
- Self-registration (all accounts created by Manager only)
- Password reset via email link (out of scope for v1)
- Integration with BNU Banner ERP
- Financial tracking, plagiarism detection, or video conferencing
- Multiple parallel semesters or historical data migration

### 1.3 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|------|-----------|
| FYP | Final Year Project — capstone project for final-year students |
| PBL | Problem-Based Learning — the pedagogical approach |
| Group | 2–5 students working on one FYP project; has one designated leader |
| Leader | The student who created or was transferred leadership of a group |
| Iteration | A named milestone phase (e.g., Proposal, Literature Review) with a deadline and rubric |
| Rubric | A weighted evaluation checklist with 0–5 level descriptors per criterion |
| Evaluation | A rubric submission by an evaluator, immutable after submission |
| Exhibition | The final public presentation of the project, separately evaluated |
| Soft Delete | Marking an entity as `deleted: true` without removing it from the database |
| Hard Delete | Permanently removing a document from the database |
| JWT | JSON Web Token — a stateless signed token carrying identity and role claims |
| RBAC | Role-Based Access Control |
| CRUD | Create, Read, Update, Delete operations |
| BNU | Beaconhouse National University |
| SRS | Software Requirements Specification |
| API | Application Programming Interface |
| REST | Representational State Transfer |

### 1.4 References

| # | Document |
|---|---------|
| 1 | Stage 1 — Discovery and Audit Report (2026-08-04) |
| 2 | Stage 2 — Foundation Approval Package (2026-08-05) |
| 3 | Database Schema Document v1.0 (2026-08-05) |
| 4 | API Contract Document v1.0 (2026-08-05) |
| 5 | PBL Management System Prototype (HTML, 2514 lines) |
| 6 | IEEE Std 830-1998 — Recommended Practice for SRS |

### 1.5 Document Overview

- Section 1: Introduction (purpose, scope, definitions)
- Section 2: Overall Description (product context, users, constraints)
- Section 3: Functional Requirements (detailed, numbered, testable)
- Section 4: Non-Functional Requirements (quality attributes)
- Section 5: External Interface Requirements
- Section 6: Prototype-to-Requirement Traceability

---

## 2. Overall Description

### 2.1 Product Perspective

The PBL Management System is a new, standalone web application. It is not a module of an existing system and does not integrate with BNU's existing infrastructure in v1. It communicates externally only with:
- MongoDB Atlas (cloud database)
- Cloudinary (file storage, from Sprint 3 onwards)
- SMTP server (email sending, mocked in v1 development)

### 2.2 Product Functions (Summary)

| # | Function | Primary Actor |
|---|----------|--------------|
| F01 | Secure login and session management | All roles |
| F02 | Student account management (CRUD, bulk import, recycle bin) | Manager |
| F03 | Department management (CRUD, recycle bin) | Manager |
| F04 | Course management (CRUD, recycle bin) | Manager |
| F05 | Teacher/Evaluator management (CRUD, recycle bin) | Manager |
| F06 | Group creation, browsing, and join workflow | Student |
| F07 | Manager group approval and evaluator assignment | Manager |
| F08 | Iteration and rubric management | Manager |
| F09 | Submission of iteration work by groups | Student |
| F10 | Rubric scoring by evaluators (locked after submit) | Evaluator |
| F11 | Exhibition evaluation (locked after submit) | Evaluator |
| F12 | Supervision meeting logging | Evaluator |
| F13 | Survey creation and management | Manager |
| F14 | Survey response by students (idempotent) | Student |
| F15 | Survey report generation (charts + stats) | Manager |
| F16 | Announcement and attachment management | Manager |
| F17 | HOD department-scoped read-only dashboard | HOD, HOD I&C |
| F18 | Dean university-wide read-only dashboard | Dean |
| F19 | Group and iteration performance reports | Manager, HOD, HOD I&C, Dean |
| F20 | Audit log (append-only, immutable) | Manager (read only) |
| F21 | Change password | All roles |

### 2.3 User Classes and Characteristics

| Role | JWT Claim | Count (est.) | Technical Level |
|------|-----------|-------------|----------------|
| PBL Manager | `pbl_manager` | 1 (seeded) | Medium — can follow a guide |
| Student | `student` | ~150–200 per semester | Low — expect simple, guided UI |
| Evaluator | `evaluator` | ~10–20 | Medium |
| HOD | `hod` | 1 per dept (~3) | Low — expects summary view |
| HOD I&C | `hodic` | 1 per dept (~3) | Low |
| Dean | `dean` | 1 | Low — expects summary only |

### 2.4 Operating Environment

- **Frontend:** Any modern browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+). Internet Explorer is NOT supported.
- **Backend:** BNU Linux server (64-bit, Python 3.11+, Nginx, systemd)
- **Database:** MongoDB Atlas M0 (development/staging) → Atlas M2 or on-premises MongoDB (production)
- **Network:** Requires reliable internet (minimum 3 Mbps); system is not designed for offline use

### 2.5 Design and Implementation Constraints

| Constraint | Rationale |
|-----------|-----------|
| Backend must be Python Flask | Team skill set and project specification |
| Frontend must be React | Project specification |
| Database must be MongoDB | Project specification |
| No hardcoded secrets | Security policy |
| Passwords must use bcrypt | Security policy |
| All endpoints must use JWT | Stateless, scalable API design |
| All endpoints must use `@role_required` | Security — server-side enforcement |
| No client-side-only authorization | Hiding a button is not security |
| MongoDB Atlas M0 free tier | Budget constraint for development/staging |

### 2.6 Assumptions and Dependencies

| # | Assumption |
|---|-----------|
| A-01 | BNU student email format: `ROLL@bnu.edu.pk` where ROLL is the roll number (e.g., `BCSM-F23-551@bnu.edu.pk`) |
| A-02 | HOD I&C exists as a real BNU role (provisional — team must confirm) |
| A-03 | Cloudinary is used for file storage from Sprint 3; local mock used in Sprints 0–2 |
| A-04 | SMTP email sending is mocked (console print) in development; real SMTP configured in Sprint 6 |
| A-05 | All accounts are created by the Manager — no self-registration |
| A-06 | The Manager account is seeded via a seed script — no separate admin signup flow |
| A-07 | MongoDB Atlas M0 free tier (512 MB) is sufficient for development and BNU pilot |
| A-08 | BNU has reliable internet (≥3 Mbps) during academic activities |
| A-09 | Group deletion is hard-delete (no soft-delete for groups) |
| A-10 | One student can belong to at most one group per course at any time |
| A-11 | Evaluations (rubric scores) are immutable once submitted |
| A-12 | Exhibition evaluations are immutable once submitted |

---

## 3. Functional Requirements

Each requirement is numbered `FR-X.Y` where X is the module number and Y is the sequential requirement within the module. Priority: **Must** = required for v1; **Should** = target but deferrable; **Could** = nice-to-have.

---

### Module 1: Authentication and Authorization

#### FR-1.1 — User Login (Must)
The system shall authenticate users via email and password at `POST /api/auth/login`.

**Inputs:** `{ email, password }`
**Behaviour:**
- Search the `users` collection for a document with matching `email` (case-insensitive, `deleted: false`)
- Compare the provided password to the stored bcrypt hash using `bcrypt.checkpw()`
- If matched: issue a JWT token with claims `{ sub, role, dept, section, course, name, email, iat, exp }`
- If not matched: return `401 Unauthorized` with message "Invalid email or password."

**Token expiry:** 24 hours (configurable via `JWT_EXPIRATION_HOURS` env var)

**Outputs:** `{ token, user: { id, name, email, role, dept } }`

---

#### FR-1.2 — Role-Based Access Control (Must)
Every protected endpoint shall have a `@role_required(*roles)` decorator that:
- Returns `401 Unauthorized` if no valid JWT is present
- Returns `403 Forbidden` if the JWT role is not in the allowed list
- Proceeds to the route handler only if authenticated and authorized

**This is non-negotiable. No endpoint shall rely solely on client-side access control.**

---

#### FR-1.3 — Current User Profile (Must)
`GET /api/auth/me` shall return the current authenticated user's details from JWT claims. No database query required.

---

#### FR-1.4 — Change Password (Must)
`POST /api/auth/change-password` shall allow any authenticated user to change their password by verifying the current password and providing a new one (minimum 6 characters). The new password shall be stored as a bcrypt hash.

---

#### FR-1.5 — Unique Identity (Must)
Each user account shall have a globally unique `email` (enforced by a MongoDB unique index). Student accounts additionally have a unique `roll` number (sparse index — unique when not null).

---

#### FR-1.6 — Soft-Deleted Accounts Cannot Login (Must)
Users with `deleted: true` shall not be able to log in. The login query must include `"deleted": {"$ne": true}` in the filter.

---

### Module 2: Reference Data Management

#### FR-2.1 — Department CRUD (Must)
The Manager shall create, read, update, and soft-delete departments. Each department has a `name` and a unique `code` (2–4 uppercase characters, e.g., `SE`, `CS`).

Soft-deleted departments appear in the Recycle Bin view (`?deleted=true`). They can be restored.

---

#### FR-2.2 — Course CRUD (Must)
The Manager shall create, read, update, and soft-delete courses. Each course has:
- A `name`
- A `dept` (references a department code)
- `min_group` and `max_group` (integers; `max_group >= min_group >= 1`)
- A `deadline` date

Soft-deleted courses appear in the Recycle Bin. Courses with active groups shall not be deleteable.

---

#### FR-2.3 — Teacher/Evaluator CRUD (Must)
The Manager shall create, read, update, and soft-delete teacher accounts. Creating a teacher creates a `users` document with `role: "evaluator"` and a system-generated initial password.

Each teacher has:
- `name`, `email`, `dept`, `type` (`Internal Faculty` or `External Industry`)

Initial password shall be sent to the teacher's email (mocked in development — logged to console). Email format: the teacher's own email address, not a BNU roll-based address.

---

#### FR-2.4 — Student CRUD — Individual (Must)
The Manager shall add individual students. The system shall auto-generate the login email as `ROLL@bnu.edu.pk` (all uppercase roll number).

Each student account contains: `name`, `roll`, `dept`, `section`, `session`, `course`, `teacher` (assigned faculty), `recovery_email` (optional).

A system-generated initial password shall be notified to the student's `recovery_email` (mocked in development).

---

#### FR-2.5 — Student Bulk Import (Must)
The Manager shall upload an Excel (`.xlsx`) or CSV file to create multiple student accounts at once.

**Expected columns:** Name, Roll, Department, Section, Session, Course, Teacher, Recovery Email

**Behaviour:**
- Valid rows → insert and generate credentials
- Duplicate roll → skip with error detail in response (never silent)
- Missing required column → reject the entire file before any inserts
- Response always includes: `imported`, `skipped`, `errors` array with row number and reason

---

#### FR-2.6 — Recycle Bin and Restore (Must)
For all soft-deleted entities (students, teachers, departments, courses), the Manager shall:
- View deleted items in a Recycle Bin page (filtered by `deleted: true`)
- Restore a soft-deleted entity (set `deleted: false`)
- Permanently delete a soft-deleted entity (hard-delete, only allowed after soft-delete)

---

### Module 3: Group Management

#### FR-3.1 — Student Group Creation (Must)
An authenticated student shall create a group by providing a `name`. The system shall:
- Check that the student is not already a member of another group in the same course
- Create the group with `status: "pending"`, with the creator as leader and only member
- Scope the group to the student's `course`, `section`, and `dept` (from JWT claims)

If the student is already in a group in this course: return `409 Conflict`.

---

#### FR-3.2 — Browse Groups (Must)
A student shall browse all groups in the same course and section. Results shall show:
- Group name, current member count, max members, status
- Whether the student already has a pending join request for each group
- Whether the student is already a member of the group

---

#### FR-3.3 — Join Request (Must)
A student who is not already in a group shall send a join request to a group. The request includes an optional message. The system shall:
- Prevent duplicate pending requests from the same student to the same group
- Prevent requesting to join a group the student is already a member of
- Prevent sending a request if the group is already full (`member_count >= max_group`)

---

#### FR-3.4 — Cancel Join Request (Must)
A student shall cancel their own pending join request. Cancelled requests have `status: "cancelled"`.

---

#### FR-3.5 — Leader Accept/Reject Join Request (Must)
The group leader shall view pending join requests and accept or reject each.

**On Accept:**
1. Read the current `groups.version` (optimistic locking)
2. Check that the group is not full after adding this member
3. Atomically: add the student to `member_ids`, increment `version`, set request to `accepted`
4. Cancel all other pending join requests from this student across all groups in this course
5. If the `version` has changed since reading (race condition), return `409 Conflict` and ask the leader to retry

**On Reject:** Set the request to `rejected` only.

---

#### FR-3.6 — Leave Group (Must)
A student shall leave their group. The system shall:
- If the student is NOT the leader: remove from `member_ids`
- If the student IS the leader AND other members exist: transfer leadership to the next member in `member_ids`, then remove the leaving student
- If the student is the only member: delete the group (hard delete)

---

#### FR-3.7 — Manager Approval (Must)
The Manager shall view all groups filtered by status, department, section, and course. The Manager shall approve a group if:
- Group `member_count >= course.min_group`
- Group is currently `pending`

Approved groups become `status: "approved"`.

---

#### FR-3.8 — Manager Group Delete (Must)
The Manager shall hard-delete a group. This removes the group document, all associated join requests, and all submission records for this group. Evaluations are retained (for audit purposes) but become orphaned.

---

#### FR-3.9 — One-Student-One-Group Constraint (Must)
A student shall belong to at most one group per course at any time. This is enforced at both the application level (checked before every join or accept action) and the database level (unique compound index on `member_ids` is not possible in MongoDB — enforced via application logic only, with the optimistic locking version field preventing race conditions).

---

#### FR-3.10 — Manager Evaluator Assignment (Must)
The Manager shall assign one or more evaluators to one or more groups. An assignment record links `evaluator_id` to `group_id`. The same evaluator cannot be assigned to the same group twice (unique compound index).

---

### Module 4: Iterations and Rubrics

#### FR-4.1 — Create Iteration (Must)
The Manager shall create an iteration by providing `title`, `details`, `course`, and `deadline`. The iteration is created with an empty `rubrics` array.

---

#### FR-4.2 — Attach Rubrics (Must)
The Manager shall attach rubrics to an iteration. Each rubric has:
- `question` (text)
- `weight` (integer, percentage)
- `levels` (object with keys `0`–`5`, each mapped to a descriptor string)

**Validation:** The sum of all `weight` values for all rubrics in an iteration must equal exactly 100.

---

#### FR-4.3 — Edit and Delete Iterations (Must)
The Manager shall edit an iteration's `title`, `details`, and `deadline`. The Manager shall delete an iteration only if no submissions exist for it.

---

#### FR-4.4 — Student Iteration View (Must)
A student shall view all iterations for their course, with:
- Iteration title, details, deadline
- Whether the deadline has passed
- Their group's current submission status (submitted / not submitted / submitted late)

---

### Module 5: Submissions

#### FR-5.1 — Submit Iteration Work (Must)
Any member of an approved group shall submit a file for a given iteration. The submission includes:
- An uploaded file (PDF, DOCX, XLSX — max 10 MB)
- An optional text note

**Behaviour:**
- Upsert: if a submission already exists for this group+iteration, replace it
- Set `is_late: true` if `submitted_at > iteration.deadline`
- Store `file_url` (Cloudinary URL in staging/prod; local path mock in dev)

---

#### FR-5.2 — Submission File Constraints (Must)
- Accepted file types: PDF, DOCX, XLSX, ZIP
- Maximum file size: 10 MB
- File must be virus-scanned before storage (Cloudinary provides this; local mock skips it)

---

#### FR-5.3 — Submission History (Should)
The system shall retain the last submission only (one submission document per group per iteration). Previous files are overwritten, not archived, in v1.

---

### Module 6: Evaluations

#### FR-6.1 — Rubric Score Submission (Must)
An evaluator assigned to a group shall submit rubric scores for that group for a given iteration. The scores are:
- One integer value (0–5) per rubric question in the iteration
- A general `comment` (optional)

**Server computes:** `total_weighted_score = Σ (score_i / 5 × weight_i)` for all rubric questions

**Immutability:** The evaluation is set to `locked: true` on creation. No PUT, PATCH, or DELETE is allowed on evaluations.

---

#### FR-6.2 — Prevent Duplicate Evaluations (Must)
An evaluator shall not submit two evaluations for the same (group, iteration) combination. The unique compound index `(group_id, iteration_id, evaluator_id)` enforces this at the database level. The API also checks before inserting and returns `409 Conflict` if a duplicate is attempted.

---

#### FR-6.3 — Evaluator Scope (Must)
An evaluator shall only be able to evaluate groups they are assigned to. The `@role_required("evaluator")` decorator plus a query against the `assignments` collection enforces this. If the evaluator is not assigned to the group, return `403 Forbidden`.

---

### Module 7: Exhibition Evaluation

#### FR-7.1 — Exhibition Score Submission (Must)
An evaluator assigned to a group shall submit an exhibition evaluation for that group. The exhibition evaluation uses a separate, fixed rubric (defined by the Manager as exhibition criteria). It follows the same immutability rules as iteration evaluations.

---

#### FR-7.2 — Exhibition Criteria Management (Must)
The Manager shall define exhibition rubric criteria (each with a question and `levels` 0–5). Exhibition criteria are shared across all groups in a course (not per-iteration).

---

### Module 8: Meetings

#### FR-8.1 — Log Meeting (Must)
An evaluator assigned to a group shall log a supervision meeting record with:
- `group_id`, `iteration_id`, `title`, `date`
- Optional: `start_time`, `end_time`, `agenda`, `minutes`, `next_meeting`

---

#### FR-8.2 — View Meetings (Must)
An evaluator shall view all meeting logs they have created, filterable by group and iteration.

---

### Module 9: Surveys

#### FR-9.1 — Create Survey (Must)
The Manager shall create a survey with a `title`, `course`, and at least one question. Each question has question text and five level labels (Likert scale).

Surveys are created with `status: "draft"`.

---

#### FR-9.2 — Publish and Close Survey (Must)
The Manager shall publish a draft survey (`status: "published"`) to make it visible to students in that course. The Manager shall close a published survey (`status: "closed"`) to stop new responses.

---

#### FR-9.3 — Student Survey Response (Must)
A student shall fill a published survey for their course. The response is:
- One integer (1–5) per question
- Idempotent — if the student re-submits, the previous response is overwritten

If the survey is closed: return `400 Bad Request`.

---

#### FR-9.4 — Survey Report (Must)
The Manager shall view a report for a survey showing:
- Total responses
- Per question: mean, median, and value distribution (count per level 1–5)

---

#### FR-9.5 — Survey Management (Must)
The Manager shall view all surveys, update a draft survey, and delete a survey that has no responses.

---

### Module 10: Announcements and Attachments

#### FR-10.1 — Post Announcement (Must)
The Manager shall post an announcement with a `title`, rich-text `content`, and `date`. Announcements are visible to all authenticated users.

---

#### FR-10.2 — Edit and Delete Announcement (Must)
The Manager shall edit an existing announcement's title, content, and date. The Manager shall permanently delete an announcement.

---

#### FR-10.3 — Upload Attachment (Must)
The Manager shall upload a file as an attachment (with a title). Accepted formats: PDF, DOCX, XLSX (max 10 MB). Attachments are available for download by all authenticated users.

---

#### FR-10.4 — View and Download Attachments (Must)
Any authenticated user shall view all attachments and download individual files.

---

### Module 11: HOD Dashboard

#### FR-11.1 — HOD Summary View (Must)
The HOD and HOD I&C shall view a read-only dashboard for their department showing:
- Total groups (all statuses)
- Approved groups count
- Pending groups count
- Total students in department
- Students without a group
- Groups by status chart data

**Scope enforcement:** The HOD's department is read from their JWT `dept` claim. No client parameter can override it.

---

#### FR-11.2 — HOD Group Table (Must)
The HOD shall view a filterable table of all groups in their department, showing group name, section, status, member count, and evaluator assignments.

---

#### FR-11.3 — HOD Reports (Must)
The HOD shall view Group Reports and Iteration Reports for their department (same data as Manager reports, scoped to HOD's department).

---

#### FR-11.4 — HOD PDF Export (Should)
The HOD dashboard and group table shall have a "Print / Export PDF" option (using the browser's native print dialog, scoped to the visible content).

---

### Module 12: Dean Dashboard

#### FR-12.1 — Dean Summary View (Must)
The Dean shall view a read-only university-wide dashboard showing:
- Breakdown by department: total groups, approved groups, students without group
- University totals: total students, total groups, students without group

---

#### FR-12.2 — Students Without Group List (Must)
The Dean shall view a filterable list of students who have no group, filterable by department.

---

#### FR-12.3 — Dean Reports (Must)
The Dean shall view Group Reports and Iteration Reports across all departments.

---

### Module 13: Reporting

#### FR-13.1 — Group Reports (Must)
The Manager (and HOD/Dean in their scope) shall view a group performance report showing per-group:
- Group name, section, status, member list
- Number of iterations submitted vs. total iterations
- Number of evaluations completed
- Average weighted score across all evaluations (if any exist)

---

#### FR-13.2 — Iteration Reports (Must)
The Manager (and HOD/Dean in their scope) shall view an iteration performance report showing per-iteration:
- Title, deadline, late vs. on-time submission count
- Average score across all group evaluations for this iteration

---

### Module 14: Audit Log

#### FR-14.1 — Audit Log — Write (Must)
Every mutation (create, update, delete, restore, login) shall append an entry to the `audit_log` collection via `log_audit()`. The audit log is append-only and must never be modified or deleted.

---

#### FR-14.2 — Audit Log — Read (Must)
The Manager shall query the audit log at `GET /api/manager/audit-log` with optional filters:
- `?entity=groups` — filter by collection
- `?action=create` — filter by action type
- `?limit=100` — control page size

Results are paginated, newest first.

---

### Module 15: Manager Dashboard

#### FR-15.1 — Manager Dashboard Stats (Must)
The Manager dashboard shall display:
- Total students (not deleted)
- Total groups (all statuses)
- Groups pending approval
- Students without a group (in any course)
- Total evaluators
- Groups remaining to be evaluated

---

#### FR-15.2 — Announcements on Dashboard (Must)
The Manager dashboard shall display existing announcements with an accordion view and allow creating, editing, and deleting announcements inline.

---

#### FR-15.3 — Attachments on Dashboard (Must)
The Manager dashboard shall display uploaded attachments and allow uploading new ones and deleting existing ones.

---

## 4. Non-Functional Requirements

### 4.1 Performance

| ID | Requirement |
|----|------------|
| NFR-P-01 | API response time for read endpoints: < 500ms for 95% of requests under normal load (< 100 concurrent users) |
| NFR-P-02 | API response time for write endpoints: < 1000ms under normal load |
| NFR-P-03 | Frontend initial page load: < 3 seconds on a 10 Mbps connection |
| NFR-P-04 | Frontend navigation between routes: < 500ms (client-side routing, no full page reload) |
| NFR-P-05 | File upload: accept files up to 10 MB within 5 seconds on a 10 Mbps connection |
| NFR-P-06 | Bulk student import: process up to 200 rows in < 10 seconds |

---

### 4.2 Security

| ID | Requirement |
|----|------------|
| NFR-S-01 | Passwords shall be stored using bcrypt with salt_rounds = 10. No plaintext passwords stored anywhere. |
| NFR-S-02 | Every protected endpoint shall have `@role_required`. No exceptions. |
| NFR-S-03 | Department scoping for HOD/HOD I&C shall be enforced server-side from JWT claims — not from client-provided parameters |
| NFR-S-04 | All secrets (JWT key, MongoDB URI, Cloudinary keys) shall be stored in environment variables. Never committed to Git. |
| NFR-S-05 | All API input shall be validated server-side using marshmallow schemas before database operations |
| NFR-S-06 | MongoDB queries shall use PyMongo's parameterized form — no string concatenation for query building |
| NFR-S-07 | Rich text content (announcements) shall be sanitised with DOMPurify on the frontend before rendering |
| NFR-S-08 | CORS shall restrict allowed origins to the known frontend URL in staging and production (not `*`) |
| NFR-S-09 | Evaluations shall be immutable after submission — no PUT, PATCH, or DELETE endpoint for evaluations |
| NFR-S-10 | `.env` files shall be listed in `.gitignore` and shall never appear in Git history |

---

### 4.3 Usability

| ID | Requirement |
|----|------------|
| NFR-U-01 | The interface shall be responsive and usable on screens from 320px width upwards (mobile-friendly) |
| NFR-U-02 | Every form submission shall show a loading indicator and success/error feedback toast |
| NFR-U-03 | Every table shall show an "empty state" illustration when there is no data |
| NFR-U-04 | Every list page shall show a loading skeleton while data is being fetched |
| NFR-U-05 | Destructive actions (delete, approve with irreversible effects) shall show a confirmation dialog before executing |
| NFR-U-06 | Error messages shall be human-readable (not raw technical error text) |
| NFR-U-07 | The Login page shall show a clear error message on wrong credentials — not a generic "something went wrong" |

---

### 4.4 Reliability

| ID | Requirement |
|----|------------|
| NFR-R-01 | The system shall be available 99% of the time during semester academic hours (8 AM – 10 PM PKT) |
| NFR-R-02 | The system shall detect and reject duplicate evaluation submissions even under concurrent requests (optimistic locking + unique index) |
| NFR-R-03 | File upload failures shall not corrupt submitted metadata — file URL shall only be saved after successful upload |
| NFR-R-04 | Bulk import failures for individual rows shall not prevent other valid rows from being inserted |
| NFR-R-05 | Application crashes shall be caught by systemd and the service automatically restarted |

---

### 4.5 Maintainability

| ID | Requirement |
|----|------------|
| NFR-M-01 | The codebase shall follow the directory structure defined in the Foundation Package (Stage 2) |
| NFR-M-02 | All API endpoints shall be organized in the corresponding Blueprint file |
| NFR-M-03 | Business logic shall be in service files (`services/`), not inline in route handlers |
| NFR-M-04 | All field names used in MongoDB queries shall reference constants from `models/*.py` — not string literals |
| NFR-M-05 | Every PR shall have the PR template completed and at least one approver |
| NFR-M-06 | A CI pipeline shall run lint and tests on every PR to `develop` and `main` |
| NFR-M-07 | Code shall follow PEP 8 (Python) and ESLint recommended rules (JavaScript) |

---

### 4.6 Portability

| ID | Requirement |
|----|------------|
| NFR-PO-01 | The entire application shall run locally using `docker-compose up` with no manual setup beyond copying `.env.example` to `.env` |
| NFR-PO-02 | Backend shall run on any standard Python 3.11 Linux/Windows environment with `pip install -r requirements.txt` |
| NFR-PO-03 | Frontend shall build using `npm run build` and the output shall be deployable to any static file server |

---

### 4.7 Scalability

| ID | Requirement |
|----|------------|
| NFR-SC-01 | MongoDB indexes shall be defined for all high-frequency query patterns (see Database Schema Document) |
| NFR-SC-02 | Gunicorn shall be configured with `(2 × CPU + 1)` workers in production |
| NFR-SC-03 | The system shall handle 500 concurrent users (future target — not a v1 hard requirement, but the architecture must not prevent it) |

---

## 5. External Interface Requirements

### 5.1 User Interfaces

- The interface shall match the visual design of the prototype (`pbl-management-system-prototype.html`) adapted with BNU branding
- Primary color: `#2563eb` (blue)
- Font: Inter or Segoe UI
- Sidebar navigation shall be collapsible
- Role chip (role label) shall be visible in the navbar for all roles
- All lists shall support search by name and filter by relevant fields

### 5.2 Hardware Interfaces

No special hardware interfaces. The system uses standard HTTP/HTTPS over TCP/IP.

### 5.3 Software Interfaces

| External System | Purpose | Protocol | Notes |
|----------------|---------|----------|-------|
| MongoDB Atlas | Primary database | MongoDB Wire Protocol (TCP) | Connection via `MONGO_URI` env var |
| Cloudinary | File storage and upload | HTTPS REST | Used from Sprint 3 onwards |
| SMTP (TBD) | Credential emails | SMTP | Mocked in development; real in Sprint 6 |
| GitHub Actions | CI/CD pipeline | HTTPS | Auto-triggers on PR |
| Render.com | Backend hosting (staging) | HTTPS | Auto-deploys `develop` branch |
| Vercel | Frontend hosting (staging) | HTTPS | Auto-deploys `develop` branch |

### 5.4 Communication Interfaces

- Frontend ↔ Backend: HTTPS REST API with JSON body
- Authentication: `Authorization: Bearer <jwt>` header on all protected requests
- CORS: configured to allow only known frontend origin in production (not `*`)

---

## 6. Prototype-to-Requirement Traceability

| Prototype Screen | Related FR(s) |
|-----------------|--------------|
| Login page (all roles) | FR-1.1, FR-1.2 |
| Manager Dashboard (stats + announcements + attachments) | FR-15.1, FR-15.2, FR-15.3, FR-10.1–FR-10.4 |
| Manage Students → Add New Student (individual) | FR-2.4 |
| Manage Students → Bulk Import | FR-2.5 |
| Manage Students → View All | FR-2.6 |
| Manage Students → Recycle Bin | FR-2.6 |
| Manage Departments → Add / View / Trash | FR-2.1, FR-2.6 |
| Manage Courses → Add / View / Trash | FR-2.2, FR-2.6 |
| Manage Teachers → Add / View / Trash | FR-2.3, FR-2.6 |
| Manage Groups → All Project Groups | FR-3.7, FR-3.8, FR-3.10 |
| Assign Projects (exhibition evaluator assignment) | FR-3.10, FR-7.2 |
| Rubrics and Iterations → Manage | FR-4.1, FR-4.2, FR-4.3 |
| Rubrics and Iterations → Add New | FR-4.1 |
| Manage Survey → Add / View | FR-9.1, FR-9.2, FR-9.5 |
| Survey Reports | FR-9.4 |
| Group Reports | FR-13.1 |
| Iteration Reports | FR-13.2 |
| Student Dashboard | FR-15.1 (student view) |
| My Group (join requests, members) | FR-3.3, FR-3.4, FR-3.5, FR-3.6 |
| Browse / Join Groups | FR-3.2, FR-3.3 |
| Create Group | FR-3.1 |
| Iterations (student view) | FR-4.4 |
| Iteration Detail + Submit | FR-5.1, FR-5.2 |
| Surveys (student view) | FR-9.3 |
| Evaluator Dashboard | FR-13.1 (evaluator view) |
| Assigned Groups | FR-6.1, FR-6.3 |
| Evaluation Sheet | FR-6.1, FR-6.2 |
| Exhibition Evaluation | FR-7.1 |
| Record Meeting / View Meetings | FR-8.1, FR-8.2 |
| HOD Dashboard | FR-11.1, FR-11.2 |
| HOD Group Reports | FR-11.3 |
| HOD Iteration Reports | FR-11.3 |
| Dean Dashboard | FR-12.1, FR-12.2 |
| Dean Group/Iteration Reports | FR-12.3 |
| Change Password (modal, all roles) | FR-1.4 |
| Logout (all roles) | FR-1.1 (session termination) |
| Audit Log | FR-14.1, FR-14.2 |

---

## Appendix A — FR Summary Table

| FR ID | Title | Priority | Sprint |
|-------|-------|----------|--------|
| FR-1.1 | User Login | Must | 0 |
| FR-1.2 | Role-Based Access Control | Must | 0 |
| FR-1.3 | Current User Profile | Must | 0 |
| FR-1.4 | Change Password | Must | 1 |
| FR-1.5 | Unique Identity | Must | 0 |
| FR-1.6 | Soft-Deleted Cannot Login | Must | 0 |
| FR-2.1 | Department CRUD | Must | 1 |
| FR-2.2 | Course CRUD | Must | 1 |
| FR-2.3 | Teacher CRUD | Must | 1 |
| FR-2.4 | Student CRUD — Individual | Must | 1 |
| FR-2.5 | Student Bulk Import | Must | 1 |
| FR-2.6 | Recycle Bin and Restore | Must | 1 |
| FR-3.1 | Student Group Creation | Must | 2 |
| FR-3.2 | Browse Groups | Must | 2 |
| FR-3.3 | Join Request | Must | 2 |
| FR-3.4 | Cancel Join Request | Must | 2 |
| FR-3.5 | Leader Accept/Reject | Must | 2 |
| FR-3.6 | Leave Group | Must | 2 |
| FR-3.7 | Manager Group Approval | Must | 2 |
| FR-3.8 | Manager Group Delete | Must | 2 |
| FR-3.9 | One-Student-One-Group | Must | 2 |
| FR-3.10 | Evaluator Assignment | Must | 2 |
| FR-4.1 | Create Iteration | Must | 3 |
| FR-4.2 | Attach Rubrics | Must | 3 |
| FR-4.3 | Edit/Delete Iteration | Must | 3 |
| FR-4.4 | Student Iteration View | Must | 3 |
| FR-5.1 | Submit Iteration Work | Must | 3 |
| FR-5.2 | Submission File Constraints | Must | 3 |
| FR-5.3 | Submission History | Should | 3 |
| FR-6.1 | Rubric Score Submission | Must | 4 |
| FR-6.2 | Prevent Duplicate Evaluations | Must | 4 |
| FR-6.3 | Evaluator Scope | Must | 4 |
| FR-7.1 | Exhibition Score Submission | Must | 4 |
| FR-7.2 | Exhibition Criteria | Must | 4 |
| FR-8.1 | Log Meeting | Must | 4 |
| FR-8.2 | View Meetings | Must | 4 |
| FR-9.1 | Create Survey | Must | 6 |
| FR-9.2 | Publish/Close Survey | Must | 6 |
| FR-9.3 | Student Survey Response | Must | 6 |
| FR-9.4 | Survey Report | Must | 6 |
| FR-9.5 | Survey Management | Must | 6 |
| FR-10.1 | Post Announcement | Must | 1 |
| FR-10.2 | Edit/Delete Announcement | Must | 1 |
| FR-10.3 | Upload Attachment | Must | 1 |
| FR-10.4 | View/Download Attachments | Must | 1 |
| FR-11.1 | HOD Summary View | Must | 5 |
| FR-11.2 | HOD Group Table | Must | 5 |
| FR-11.3 | HOD Reports | Must | 5 |
| FR-11.4 | HOD PDF Export | Should | 7 |
| FR-12.1 | Dean Summary View | Must | 5 |
| FR-12.2 | Students Without Group | Must | 5 |
| FR-12.3 | Dean Reports | Must | 5 |
| FR-13.1 | Group Reports | Must | 7 |
| FR-13.2 | Iteration Reports | Must | 7 |
| FR-14.1 | Audit Log Write | Must | 0 |
| FR-14.2 | Audit Log Read | Must | 8 |
| FR-15.1 | Manager Dashboard Stats | Must | 1 |
| FR-15.2 | Announcements on Dashboard | Must | 1 |
| FR-15.3 | Attachments on Dashboard | Must | 1 |

**Total Must FRs:** 52
**Total Should FRs:** 3
**Total FRs:** 55

---

*End of SRS v2.0*
