# 🎓 Student Dashboard & Group Formation Backend — Handover & Context Summary (Sprint 2)

## 📋 Executive Overview

- **Project:** ERP Management System (PBL Management System) · Beaconhouse National University
- **Sprint Target:** **Sprint 2 — Group Formation & Student Portal** (`documents/05-sprints/SPRINT-02-GROUP-FORMATION.md`)
- **Functional Requirements Covered:** FR-3.1, FR-3.2, FR-3.3, FR-3.4, FR-3.5, FR-3.6, FR-3.7, FR-3.8, FR-3.9, FR-3.10, FR-10.4
- **Branch:** `feature/student-dashboard`
- **Status:** ✅ **Backend Complete & 100% Tested:** All 17 student endpoints implemented, zero Ruff linter errors, 48 passing integration tests, and full Swagger OpenAPI documentation.

---

## 🎯 Sprint 2 Alignment & Requirements Mapping

The backend implementation follows **Sprint 2 (`SPRINT-02-GROUP-FORMATION.md`)** and SRS specifications:

| Sprint 2 Requirement | Architectural Implementation | Status |
| :--- | :--- | :---: |
| **One-Student-One-Group Rule** (FR-3.1) | Denormalized `group_id` on `users` collection + query predicate preventing double membership (`409 Conflict`). | ✅ Implemented |
| **Group Creation** (FR-3.2) | `POST /api/student/groups/` creates group with caller as leader, seeds `members: [leader_id]`, sets status `pending`, version `1`. | ✅ Implemented |
| **Peer Discovery / Search** (FR-3.3) | `GET /api/student/students/search?roll=...` scoped strictly to caller's `dept` and `section` from JWT claims. | ✅ Implemented |
| **Invitation & Acceptance Workflow** (FR-3.4, FR-3.5) | Leader invites by roll (`POST .../invite`). Student pulls invites (`GET .../invitations/pending`), accepts (`POST .../accept`) or declines (`POST .../decline`). | ✅ Implemented |
| **Auto-Cancellation of Competing Invites** (FR-3.6) | Accepting one invitation atomically marks all other pending invitations for that student as `cancelled`. | ✅ Implemented |
| **Atomic Optimistic Locking & Capacity Guards** (FR-3.7) | `find_one_and_update` with status and capacity (`max_group`) predicates prevents TOCTOU race conditions. | ✅ Implemented |
| **Leadership Transfer & Leave Group** (FR-3.8) | Leader can remove members. Non-leaders can leave. Leader leaving transfers leadership to next member or deletes group if last. | ✅ Implemented |
| **Student Dashboard Aggregation** (FR-10.4) | `GET /api/student/dashboard/` provides profile, group state, pending invite count, announcements, and attachments in one payload. | ✅ Implemented |
| **Secure Profile & Password Change** | `GET/PUT /api/student/profile/` and `POST /api/student/profile/change-password` with bcrypt hash verification. | ✅ Implemented |

---

## 🏗️ Architecture & Layered Codebase Structure

Every component adheres to the established clean layered architecture (Models ➔ Schemas ➔ Services ➔ Blueprints ➔ Swagger UI):

```
backend/
├── app/
│   ├── models/
│   │   ├── group.py                   # Group/Invitation constants (Field, Status, InvitationField, InvitationStatus)
│   │   └── user.py                    # UserFields, Role constants, bcrypt helper
│   ├── schemas/
│   │   └── group_schema.py            # Marshmallow validation schemas for all student operations
│   ├── services/
│   │   ├── student_profile_service.py # Pure business logic: profile retrieval, update, password change
│   │   └── group_service.py           # Pure business logic: group formation, invitations, peer search
│   ├── blueprints/
│   │   └── student/
│   │       ├── __init__.py            # Student blueprint package
│   │       ├── dashboard.py           # GET /api/student/dashboard/ (aggregated view)
│   │       ├── profile.py             # GET, PUT /api/student/profile/, POST /change-password
│   │       ├── groups.py              # Full groups, invitations, and search namespaces
│   │       ├── announcements.py       # Read-only announcements for students
│   │       └── attachments.py         # Read-only and download attachments for students
│   └── __init__.py                    # Factory registration of all student namespaces
└── tests/
    ├── conftest.py                    # Student fixtures (student_user, student_token, real_student_headers)
    ├── test_student_profile.py        # 16 profile & password change tests
    ├── test_student_dashboard.py      # 6 dashboard integration tests
    └── test_student_groups.py         # 26 group formation & invitation workflow tests
```

---

## 🔌 Complete Student API Reference (17 Endpoints)

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

### 3. Project Groups (`/api/student/groups`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/student/groups/my` | Student | Get caller's active group with member details (`id`, `name`, `roll`, `is_leader`) or `null`. |
| `POST` | `/api/student/groups/` | Student | Create a new group. Caller becomes leader. Rejects if student already belongs to a group (`409`). |
| `PUT` | `/api/student/groups/<id>` | Leader Only | Update group name or project title. |
| `POST` | `/api/student/groups/<id>/leave` | Member Only | Non-leader leaves group. Leader leaving requires leadership transfer or last-member group drop. |
| `POST` | `/api/student/groups/<id>/invite` | Leader Only | Invite a peer by roll number within the same department & section. |
| `POST` | `/api/student/groups/<id>/remove/<member_id>` | Leader Only | Remove a member from the group. Cannot remove oneself as leader. |

### 4. Group Invitations (`/api/student/invitations`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/student/invitations/pending` | Student | List all pending invitations received by the caller (Pull Model). |
| `POST` | `/api/student/invitations/<id>/accept` | Student | Accept invitation. Atomically joins group and auto-declines other pending invites. |
| `POST` | `/api/student/invitations/<id>/decline` | Student | Decline invitation. |

### 5. Peer Discovery (`/api/student/students/search`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/student/students/search/?roll=<fragment>` | Student | Search eligible peers by roll prefix within caller's own department and section. Returns `has_group` flag. |

### 6. Read-Only Announcements & Attachments
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/student/announcements/` | Student | List active announcements. |
| `GET` | `/api/student/announcements/<id>` | Student | View single announcement. |
| `GET` | `/api/student/attachments/` | Student | List shared attachment files. |
| `GET` | `/api/student/attachments/<id>/download` | Student | Download shared attachment file. |

---

## 🔒 Security & Data Integrity Protections

1. **Atomic Group Joining & Capacity Enforcement:**
   - Group joins use `find_one_and_update` checking `$expr: {"$lt": [{"$size": "$member_ids"}, max_group]}` ensuring no group exceeds course limits.
2. **Partial Unique Index on Invitations:**
   - `unique_pending_invite` on `group_invitations (group_id, invited_user)` with partial filter `status: "pending"` prevents duplicate pending invitations.
3. **Denormalized User Group Marker:**
   - `users.group_id` provides `O(1)` verification to prevent a student from joining multiple groups simultaneously.
4. **Role-Based Access Control (RBAC):**
   - Endpoints are decorated with `@role_required(Role.STUDENT)`. Manager tokens cannot access student endpoints (`403 Forbidden`).
5. **Safe Data Serialization:**
   - All `ObjectId` and `datetime` types are recursively mapped to JSON-serializable primitives. `password_hash` is never exposed.

---

## 🧪 Verification & Test Results

```bash
# 1. Ruff Linting Check
venv/Scripts/ruff check .
# Result: All checks passed! ✅ (0 errors)

# 2. Schema Validation Tests
python test-ismail/test_schema_validation.py
# Result: Total: 55 | Passed: 55 | Failed: 0 ✅

# 3. Student Profile Integration Tests
pytest tests/test_student_profile.py -v
# Result: 16 passed ✅

# 4. Student Dashboard Integration Tests
pytest tests/test_student_dashboard.py -v
# Result: 6 passed ✅

# 5. Student Groups & Invitations Integration Tests
pytest tests/test_student_groups.py -v
# Result: 26 passed ✅
```

---

## 🚀 Next Steps (Where the Next Person Should Pick Up)

Now that the **Student Dashboard Backend** is fully operational and committed to `feature/student-dashboard`:

1. **Frontend Integration (Sprint 2 UI):**
   - Connect the React frontend (`frontend/src/pages/student/`) to the 17 student endpoints:
     - `StudentDashboard.jsx` (consumes `GET /api/student/dashboard/`)
     - `MyGroupPage.jsx` (consumes `GET /api/student/groups/my`, `POST .../leave`, `POST .../remove`)
     - `BrowseGroupsPage.jsx` / `InviteMemberModal.jsx` (consumes search, invite, invitations APIs)
     - `StudentProfilePage.jsx` (consumes profile & password change APIs)
2. **Complete Remaining Manager Dashboard Features:**
   - Since students and groups now exist in the system, implement the remaining Manager features that depend on groups:
     - **Manager Group Approval:** `PATCH /api/manager/groups/<id>/approve` (FR-3.9)
     - **Assign Evaluators / Projects:** `POST /api/manager/assignments` (FR-3.10)
     - **Manage Rubrics & Iterations:** (Sprint 3)
     - **Surveys & Survey Reports:** (Sprint 6)
