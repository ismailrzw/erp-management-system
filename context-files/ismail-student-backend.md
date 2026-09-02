# 🎓 Student Dashboard & Group Formation Backend — Handover & Context Summary (Sprint 2)

## 📋 Executive Overview

- **Project:** ERP Management System (PBL Management System) · Beaconhouse National University
- **Sprint Target:** **Sprint 2 — Group Formation & Student Portal** (`documents/05-sprints/SPRINT-02-GROUP-FORMATION.md`)
- **Functional Requirements Covered:** FR-3.1, FR-3.2, FR-3.3, FR-3.4, FR-3.5, FR-3.6, FR-3.7, FR-3.8, FR-3.9, FR-3.10, FR-10.4
- **Branch:** `feature/student-dashboard`
- **Status:** ✅ **Backend Complete & 100% Tested:** All student group formation endpoints (invitations + join requests), manager group review, and profile security endpoints implemented, verified clean with Ruff linter, automated pytest suite passing, and full Swagger OpenAPI documentation.

---

## 🎯 Sprint 2 Alignment & Requirements Mapping

The backend implementation follows **Sprint 2 (`SPRINT-02-GROUP-FORMATION.md`)** and SRS specifications:

| Sprint 2 Requirement | Architectural Implementation | Status |
| :--- | :--- | :---: |
| **One-Student-One-Group Rule** (FR-3.1) | Denormalized `group_id` on `users` collection + query predicate preventing double membership (`409 Conflict`). | ✅ Implemented |
| **Group Creation** (FR-3.2) | `POST /api/student/groups/` creates group with caller as leader, seeds `members: [leader_id]`, sets status `pending`, version `1`. | ✅ Implemented |
| **Course-Only Constraint & Cross-Section Allowed** (FR-3.3) | Students must be enrolled in the **same course**. Cross-section peer formation is permitted across all sections of that course. | ✅ Implemented |
| **Peer Discovery / Search** | `GET /api/student/students/search?roll=...` searches peers across all sections of the student's enrolled course by roll or name. | ✅ Implemented |
| **Course Group Browsing** | `GET /api/student/groups/` allows students to browse and search active course groups with status filtering, sorting own group at the top. | ✅ Implemented |
| **Bidirectional Join Requests** (FR-3.4) | Students without a group can send join requests (`POST .../<id>/join-request`), cancel them (`DELETE .../join-requests/<id>`), and leaders can accept (`POST .../accept`) or reject (`POST .../reject`). | ✅ Implemented |
| **Invitation & Acceptance Workflow** (FR-3.4, FR-3.5) | Leader invites by roll (`POST .../invite`). Student pulls invites (`GET .../invitations/pending`), accepts (`POST .../accept`) or declines (`POST .../decline`). | ✅ Implemented |
| **Auto-Cancellation of Competing Requests & Invites** (FR-3.6) | Accepting a join request or invitation atomically joins the student and marks all other pending join requests and invitations for that student as `cancelled`. | ✅ Implemented |
| **Atomic Optimistic Locking & Capacity Guards** (FR-3.7) | `find_one_and_update` with status and capacity (`max_group`) predicates prevents TOCTOU race conditions. | ✅ Implemented |
| **Leadership Transfer & Leave Group** (FR-3.8) | Leader can remove members. Non-leaders can leave. Leader leaving transfers leadership to next member or disbands group if sole member. | ✅ Implemented |
| **Manager Group Approval Workflow** (FR-3.9) | `POST /api/manager/groups/<id>/approve` transitions status to `approved`, recording `approved_by` and `approved_at`. | ✅ Implemented |
| **Constructive Rejection with Feedback** | `POST /api/manager/groups/<id>/reject` records mandatory manager guidance reason, `rejected_by`, and `rejected_at`. Updating a rejected group auto-resubmits to `pending`. | ✅ Implemented |
| **Student Dashboard Aggregation** (FR-10.4) | `GET /api/student/dashboard/` provides profile, group state, pending invite count, announcements, and attachments in one payload. | ✅ Implemented |
| **Secure Profile & Password Change** | `GET/PUT /api/student/profile/` and `POST /api/student/profile/change-password` with bcrypt hash verification. | ✅ Implemented |

---

## 🏗️ Architecture & Layered Codebase Structure

Every component adheres to the established clean layered architecture (Models ➔ Schemas ➔ Services ➔ Blueprints ➔ Swagger UI):

```
backend/
├── app/
│   ├── models/
│   │   ├── group.py                   # Group, Invitation & Join Request constants (Field, Status, InvitationField, JoinRequestField)
│   │   └── user.py                    # UserFields, Role constants, bcrypt helper
│   ├── schemas/
│   │   └── group_schema.py            # Marshmallow validation schemas for all student operations
│   ├── services/
│   │   ├── student_profile_service.py # Pure business logic: profile retrieval, update, password change
│   │   ├── group_service.py           # Pure business logic: group formation, invitations, join requests, peer search, browsing
│   │   └── manager_group_service.py   # Pure business logic: manager group list, approval, rejection with feedback
│   ├── blueprints/
│   │   ├── student/
│   │   │   ├── __init__.py            # Student blueprint package
│   │   │   ├── dashboard.py           # GET /api/student/dashboard/ (aggregated view)
│   │   │   ├── profile.py             # GET, PUT /api/student/profile/, POST /change-password
│   │   │   ├── groups.py              # Full groups, invitations, join requests, browsing, and search namespaces
│   │   │   ├── announcements.py       # Read-only announcements for students
│   │   │   └── attachments.py         # Read-only and download attachments for students
│   │   └── manager/
│   │       └── groups.py              # Manager group oversight, approve, and reject endpoints
│   └── __init__.py                    # Factory registration of all student and manager namespaces
└── tests/
    ├── conftest.py                    # Student fixtures (student_user, student_token, real_student_headers)
    ├── test_student_profile.py        # 16 profile & password change tests
    ├── test_student_dashboard.py      # 6 dashboard integration tests
    └── test_student_groups.py         # 32 group formation, invitation & join request workflow tests
```

---

## 🔌 Complete API Reference

### 1. Student Dashboard (`/api/student/dashboard`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/student/dashboard/` | Student | Returns student profile, current group, pending invite count, latest announcements, and attachments. |

### 2. Student Profile (`/api/student/profile`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/student/profile/` | Student | Get authenticated student's profile (name, email, roll, dept, section, course, teacher). |
| `PUT` | `/api/student/profile/` | Student | Update editable profile fields (`name`, `recovery_email`). Roll & academic fields are immutable. |
| `POST` | `/api/student/profile/change-password` | Student | Update password with current password verification and length validation. |

### 3. Student Project Groups & Join Requests (`/api/student/groups`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/student/groups/my` | Student | Get caller's active group with member details (`id`, `name`, `roll`, `section`, `is_leader`) or `null`. |
| `GET` | `/api/student/groups/` | Student | Browse and search active course groups with status filter (`search`, `status`). Enriches with joinability status and orders own group first. |
| `POST` | `/api/student/groups/` | Student | Create a new group. Caller becomes leader. Rejects if student already belongs to a group (`409`). |
| `PUT` | `/api/student/groups/<id>` | Leader Only | Update group name or project title. If group was rejected, automatically resets status to `pending`. |
| `POST` | `/api/student/groups/<id>/leave` | Member Only | Non-leader leaves group. Leader leaving requires leadership transfer or sole-member group disbandment. |
| `POST` | `/api/student/groups/<id>/transfer-leadership` | Leader Only | Transfer group leadership to another member and optionally leave group. |
| `POST` | `/api/student/groups/<id>/invite` | Leader Only | Invite a peer by roll number within the same enrolled course (cross-section allowed). Blocked if group is full. |
| `POST` | `/api/student/groups/<id>/remove/<member_id>` | Leader Only | Remove a member from the group. Cannot remove oneself as leader. |
| `POST` | `/api/student/groups/<id>/join-request` | Student | Submit a request by an unaffiliated student to join a group. Blocked if group is full or rejected. |
| `DELETE` | `/api/student/groups/join-requests/<id>` | Student | Cancel an outgoing pending join request. |
| `GET` | `/api/student/groups/my/sent-requests` | Student | List all join requests sent by the authenticated student with real-time status. |
| `GET` | `/api/student/groups/my/join-requests` | Leader Only | Get all pending join requests targeting the leader's group. |
| `POST` | `/api/student/groups/join-requests/<id>/accept` | Leader Only | Leader accepts join request with optimistic concurrency. Auto-cancels candidate's other requests. |
| `POST` | `/api/student/groups/join-requests/<id>/reject` | Leader Only | Leader declines join request. |

### 4. Group Invitations (`/api/student/invitations`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/student/invitations/pending` | Student | List all pending invitations received by the caller (Pull Model). |
| `POST` | `/api/student/invitations/<id>/accept` | Student | Accept invitation. Atomically joins group and auto-declines other pending invites and join requests. |
| `POST` | `/api/student/invitations/<id>/decline` | Student | Decline invitation. |

### 5. Peer Discovery (`/api/student/students/search`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/student/students/search/?roll=<fragment>` | Student | Search peers by roll number or name across all sections in student's enrolled course. Returns `has_group` status. |

### 6. Manager Project Group Approval & Oversight (`/api/manager/groups`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/manager/groups/` | Manager | Paginated group list with real-time status counters (`all`, `pending`, `approved`, `rejected`), search, and filters. |
| `GET` | `/api/manager/groups/<id>` | Manager | Full group details including complete member list and leader info. |
| `POST` | `/api/manager/groups/<id>/approve` | Manager | Approve group proposal, recording manager identity & timestamp. |
| `POST` | `/api/manager/groups/<id>/reject` | Manager | Reject group with mandatory feedback explanation guidances. |

### 7. Streamlined Announcements & Attachments
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/student/announcements/` | Student | List active announcements enriched with per-student `is_recent` tags and `recent_count`. |
| `GET` | `/api/student/announcements/<id>` | Student | View single announcement. |
| `POST` | `/api/student/announcements/<id>/view` | Student | Mark single announcement as viewed, untagging `is_recent` for this student. |
| `POST` | `/api/student/announcements/view-all` | Student | Mark all active announcements as viewed for this student. |
| `GET` | `/api/student/attachments/` | Student | List shared attachment files. |
| `GET` | `/api/student/attachments/<id>/download` | Student | Download shared attachment file. |

---

## 🔒 Security & Data Integrity Protections

1. **Atomic Group Joining & Capacity Enforcement:**
   - Group joins use `find_one_and_update` checking `$expr: {"$lt": [{"$size": "$member_ids"}, max_group]}` ensuring no group exceeds course limits.
2. **Partial Unique Indexes:**
   - `unique_pending_invite` on `group_invitations (group_id, invited_user_id)` with partial filter `status: "pending"`.
   - `unique_pending_join_request` on `join_requests (group_id, student_id)` with partial filter `status: "pending"`.
3. **Denormalized User Group Marker:**
   - `users.group_id` provides `O(1)` verification to prevent a student from joining multiple groups simultaneously.
4. **Role-Based Access Control (RBAC):**
   - Student endpoints use `@role_required(Role.STUDENT)`. Manager endpoints use `@role_required(Role.MANAGER)`.
5. **Safe Data Serialization & Type Coercion:**
   - Supports both `ObjectId` and `str` ID representations in queries. `password_hash` is never exposed.
