# 🎯 Sprint 3: Iteration Milestones, Dynamic Rubrics, Student Submissions & Manager Review — Handover & Context Summary

## 📋 Executive Overview

- **Project:** ERP Management System (PBL Management System) · Beaconhouse National University
- **Sprint Target:** **Sprint 3 — Iterations, Rubrics, and Submissions** (`documents/05-sprints/SPRINT-03-ITERATIONS-SUBMISSIONS.md`)
- **Functional Requirements Covered:** FR-4.1, FR-4.2, FR-4.3, FR-4.4, FR-5.1, FR-5.2, FR-5.3
- **Tech Stack:** Python 3.11, Flask-RESTx, MongoDB (PyMongo), Marshmallow, React 19, Vite, Lucide React, Axios, Vanilla CSS
- **Branch:** `feature/ramsha` (merged into `feature/rubrics`)
- **Status:** ✅ **100% Complete & Verified:** Full manager iteration milestones CRUD, dynamic multi-criteria rubric builder with strict atomic 100% weight validation, student project deliverables submission with automatic late detection, manager group-wise review dashboard, and isolated automated test suite (141 tests total, all passing).

---

## 🎯 Sprint 3 Alignment & Requirements Mapping

Sprint 3 delivers end-to-end iteration milestone management and project file submissions. Managers can create course-specific milestones, enforce deadlines, and dynamically build multi-criteria evaluation rubrics (with real-time weight validation strictly totaling 100%). Students enrolled in approved groups can view deadlines with real-time countdown badges, inspect rubric criteria (levels 0–5), and submit project deliverables (PDF/DOCX/XLSX/ZIP up to 10 MB) with automatic late-submission detection. Additionally, managers have a dedicated Group-Wise Submissions Review dashboard showing all enrolled groups, on-time/late badges, submitter identity, submission timestamps, and direct file download links.

| Sprint 3 Requirement | Architectural Implementation | Status |
| :--- | :--- | :---: |
| **Manager Iterations CRUD** (FR-4.1, FR-4.2) | `GET/POST /api/manager/iterations` & `GET/PUT/DELETE /api/manager/iterations/<id>` with course-filtering and milestone detail tracking. | ✅ Implemented |
| **Deletion Protection** (FR-4.4) | `DELETE /api/manager/iterations/<id>` is strictly protected; server rejects iteration deletion with `400 Bad Request` if student submissions exist. | ✅ Implemented |
| **Dynamic Rubric Builder** (FR-4.3) | `POST /api/manager/iterations/<id>/rubrics` atomically replaces rubrics with strict 100% total weight validation (returns `422 Unprocessable Entity` if sum ≠ 100) and enforces performance levels 0 through 5. | ✅ Implemented |
| **Single Rubric Criterion Removal** | `DELETE /api/manager/iterations/<id>/rubrics/<rubric_id>` removes a single criterion and adjusts milestone schema. | ✅ Implemented |
| **Group-Wise Submissions Review** | `GET /api/manager/iterations/<id>/submissions` aggregates all approved course groups, computes summary metrics (Total Groups, Submitted, Not Submitted, Late), and joins submitter details with file download URLs. | ✅ Implemented |
| **Student Iterations Listing** (FR-5.1) | `GET /api/student/iterations` lists enrolled course iterations with group submission status, deadlines, and metadata. | ✅ Implemented |
| **Student Milestone Detail** | `GET /api/student/iterations/<id>` provides detailed milestone view with rubric criteria breakdown and previous submission details. | ✅ Implemented |
| **Student Deliverables Upload** (FR-5.2) | `POST /api/student/iterations/<id>/submit` handles multipart upload (`FileStorage` for Swagger file picker), late submission detection against UTC deadline, and group upsert (one submission per group per iteration). | ✅ Implemented |
| **Automated Late Detection** (FR-5.3) | Compares upload timestamp against milestone UTC deadline; automatically flags `is_late: true` and applies visual warning badges. | ✅ Implemented |
| **RBAC Group Check Guard** | Students not in an approved group are rejected with `403 Forbidden` when attempting submissions. | ✅ Implemented |

---

## 🏗️ Architecture & Component Directory Map

```
backend/
├── app/
│   ├── models/
│   │   └── iteration.py               # Iteration, Rubric, and Submission schema definitions & constants
│   ├── services/
│   │   └── storage_service.py         # Secure local file upload, UUID collision prevention, extension whitelist
│   ├── blueprints/
│   │   ├── manager/
│   │   │   └── iterations.py          # Manager CRUD, Dynamic Rubrics, and Submissions Review APIs
│   │   └── student/
│   │       └── iterations.py          # Student Iterations listing & Multipart Submission APIs
│   └── __init__.py                    # Registered iteration namespaces & Swagger documentation
├── seed/
│   └── restore_all_data.py            # Complete sample data restoration script
└── tests/
    ├── test_iterations.py             # Iteration & Rubric unit tests (isolated test DB)
    └── test_submissions.py            # Submission, late-detection & RBAC unit tests

frontend/src/
├── api/
│   ├── iterationsApi.js               # Manager iterations, rubrics, and submissions review endpoints
│   └── studentIterationsApi.js        # Student iterations listing and multipart upload endpoints
├── components/
│   ├── layout/
│   │   └── Sidebar.jsx                # Added "Iterations & Rubrics" (Manager) and "Milestones" (Student)
│   └── ui/
│       ├── DeadlineCountdown.jsx      # Real-time countdown / overdue pill component
│       └── FileDropzone.jsx           # Drag-and-drop file upload with client validation (type + size)
├── pages/
│   ├── manager/
│   │   └── iterations/
│   │       ├── IterationsManagePage.jsx     # Manager Milestones table, course filter, & actions
│   │       ├── IterationFormModal.jsx       # Create/Edit Iteration milestone modal
│   │       ├── RubricBuilderModal.jsx       # Dynamic Rubric Builder with real-time weight counter
│   │       └── IterationSubmissionsPage.jsx # Group-wise submissions review with summary stat cards
│   └── student/
│       └── iterations/
│           ├── StudentIterationsPage.jsx    # Student Milestones card list with live countdowns
│           └── IterationDetailPage.jsx      # Rubric criteria breakdown & file upload submission
└── App.jsx                            # React Router v6 tree with new manager & student iteration routes
```

---

## 🔌 API Client Contracts & Method Reference

### Manager Endpoints

| Method | Endpoint | Description | Status Code |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/manager/iterations` | List all iteration milestones with optional `?course=...` filter | `200 OK` |
| `POST` | `/api/manager/iterations` | Create milestone (`title`, `course`, `deadline`, `details`) | `201 Created` |
| `GET` | `/api/manager/iterations/<id>` | Retrieve specific iteration details and attached rubrics | `200 OK` |
| `PUT` | `/api/manager/iterations/<id>` | Update milestone title, deadline, details, or course | `200 OK` |
| `DELETE` | `/api/manager/iterations/<id>` | Delete milestone (rejected if student submissions exist) | `200 OK` / `400 Bad Request` |
| `POST` | `/api/manager/iterations/<id>/rubrics` | Atomically replace rubrics with strict 100% total weight validation | `200 OK` / `422 Unprocessable` |
| `DELETE` | `/api/manager/iterations/<id>/rubrics/<rubric_id>` | Remove single rubric criterion from milestone | `200 OK` |
| `GET` | `/api/manager/iterations/<id>/submissions` | Group-wise review aggregating all course groups, stats, and download URLs | `200 OK` |

### Student Endpoints

| Method | Endpoint | Description | Status Code |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/student/iterations` | List course iterations with active group submission status and metadata | `200 OK` |
| `GET` | `/api/student/iterations/<id>` | Detailed milestone view with rubric criteria and previous submission | `200 OK` |
| `POST` | `/api/student/iterations/<id>/submit` | Multipart file upload (`file`, `notes`), auto-late detection, upsert per group | `201 Created` / `403 Forbidden` |

---

## 📱 Page-by-Page Feature Specifications

### 1. 📊 Manager Iterations Management (`IterationsManagePage.jsx` — `/manager/iterations`)
- **Course Filter Toolbar:** Live course selection filtering milestone rows.
- **Milestones Table:** Shows title, course, deadline, rubric count, and action buttons.
- **Actions:**
  - `+ Add Iteration`: Launches `IterationFormModal` to author milestones.
  - `Rubrics`: Launches `RubricBuilderModal` to view/configure dynamic scoring criteria.
  - `Submissions`: Navigates to `/manager/iterations/:id/submissions` for group status oversight.
  - `Edit` / `Delete`: In-place updates; deletion is guarded if submissions exist.

### 2. 📝 Iteration Form Modal (`IterationFormModal.jsx`)
- Syncs course selection dropdown with existing academic courses.
- DateTime picker for exact milestone deadlines.
- Comprehensive client-side validation on title, course, and deadline.

### 3. ⚖️ Dynamic Rubric Builder Modal (`RubricBuilderModal.jsx`)
- **Real-Time Weight Calculation:** Dynamic progress counter reflecting total criterion weight.
- **Strict 100% Rule Enforcement:** Save button remains disabled unless total weight equals exactly 100%. Color-coded indicator (green at 100%, amber/red otherwise).
- **Scale 0–5 Definitions:** Expandable cards to document criteria descriptors for performance levels 0 through 5.

### 4. 👥 Manager Submissions Review (`IterationSubmissionsPage.jsx` — `/manager/iterations/:id/submissions`)
- **4 Metric Cards:** Live counters for *Total Groups*, *Submitted*, *Not Submitted*, and *Late Submissions*.
- **Group Status Table:** Renders all approved course groups, indicating:
  - Submission status badge (`Submitted`, `Late`, `Pending`).
  - Submitter student identity (Name & Roll Number).
  - Exact submission timestamp.
  - Direct file download link.

### 5. ⏱️ Student Milestones Overview (`StudentIterationsPage.jsx` — `/student/iterations`)
- **Responsive Milestone Cards:** Clean grid displaying title, course, and deadline.
- **DeadlineCountdown Component:** Dynamic pill showing exact time remaining (`Xd Yh remaining`) or prominent red `OVERDUE` state.
- **Submission Status Badges:** Visual indicator of group submission state.

### 6. 📤 Student Iteration Detail & Submission (`IterationDetailPage.jsx` — `/student/iterations/:id`)
- **Rubric Breakdown Table:** Transparent evaluation criteria detailing criteria weights and performance level definitions (0–5).
- **Previous Submission Card:** Displays existing uploaded file metadata, timestamp, on-time/late status, and download button.
- **FileDropzone Component:** Drag-and-drop zone with client validation:
  - Whitelist: `.pdf`, `.docx`, `.xlsx`, `.zip`.
  - Max file size: 10 MB.
- Optional submission notes textarea.

---

## 🔐 File Storage & Security Service (`storage_service.py`)

- **Storage Location:** Secure server directory structure (`uploads/submissions/...`).
- **Collision Prevention:** Stored filenames are prefixed with unique UUIDs (`<uuid>_<sanitized_filename>`).
- **Extension Whitelist:** Strictly restricted to `.pdf`, `.docx`, `.xlsx`, `.zip`.
- **Payload Size Limits:** Max 10 MB per file deliverable.
- **Stream Rewinding:** Ensures file pointer is reset before inspection and saving to prevent zero-byte corruptions.

---

## 🧪 Database & Test Isolation

- **Isolated Test Database:** Configured dedicated MongoDB database (`pbl_system_test`) in test fixtures. Automated pytest suites will never purge or overwrite development or seeded data.
- **Backend Test Suite:** **141 automated tests passing** across the entire application suite.
  - `tests/test_iterations.py`: Milestone CRUD, deletion guards, and rubric 100% weight validation.
  - `tests/test_submissions.py`: Multipart upload, on-time vs late detection, group upsert, and RBAC authorization.

---

## 🔑 Test Credentials

| Role | Email | Password | Context |
| :--- | :--- | :--- | :--- |
| **Manager** | `zamanaziz@bnu.edu.pk` | `11223344` | Full administration, iteration authoring, rubrics, & submissions review |
| **Student (Leader)** | `student1@bnu.edu.pk` | `11223344` | Enrolled in approved group (*Alpha Team*); can submit deliverables |
| **Student (No Group)** | `student2@bnu.edu.pk` | `11223344` | No group enrolled; used for RBAC guard verification (`403 Forbidden`) |

---

## 📂 Files Created / Modified

### Backend
- `backend/app/blueprints/manager/iterations.py` *(New — Manager CRUD, Rubrics & Submissions Review APIs)*
- `backend/app/blueprints/student/iterations.py` *(New — Student Iterations & Multipart Submission APIs)*
- `backend/app/services/storage_service.py` *(New — Secure file upload & validation handler)*
- `backend/app/models/iteration.py` *(New — Iteration & Submission schema definitions)*
- `backend/app/__init__.py` *(Modified — Registered iteration namespaces & Swagger docs)*
- `backend/seed/restore_all_data.py` *(New — Complete sample data restoration script)*
- `backend/tests/test_iterations.py` *(New — Iteration & Rubric unit tests)*
- `backend/tests/test_submissions.py` *(New — Submission, Late-detection & RBAC unit tests)*

### Frontend
- `frontend/src/pages/manager/iterations/IterationsManagePage.jsx` *(New — Manager Milestones table & filter)*
- `frontend/src/pages/manager/iterations/IterationFormModal.jsx` *(New — Create/Edit Iteration modal)*
- `frontend/src/pages/manager/iterations/RubricBuilderModal.jsx` *(New — Dynamic Rubric Builder with weight counter)*
- `frontend/src/pages/manager/iterations/IterationSubmissionsPage.jsx` *(New — Group-wise submissions review)*
- `frontend/src/pages/student/iterations/StudentIterationsPage.jsx` *(New — Student Milestones card list)*
- `frontend/src/pages/student/iterations/IterationDetailPage.jsx` *(New — Rubrics breakdown & upload page)*
- `frontend/src/components/ui/DeadlineCountdown.jsx` *(New — Real-time countdown / overdue component)*
- `frontend/src/components/ui/FileDropzone.jsx` *(New — Drag-and-drop file upload with validation)*
- `frontend/src/api/iterationsApi.js` & `frontend/src/api/studentIterationsApi.js` *(New — Axios API service layers)*
- `frontend/src/App.jsx` & `frontend/src/components/layout/Sidebar.jsx` *(Modified — Routes & Nav links)*

---

## 🚀 Testing & Verification Instructions

### 1. Start Services
```bash
docker compose up -d
```

### 2. Seed Sample Data (if needed)
```bash
docker exec pbl_backend python seed/restore_all_data.py
```

### 3. Manager Workflow
1. Log in as `zamanaziz@bnu.edu.pk` / `11223344`.
2. Navigate to **Iterations & Rubrics** in the sidebar (`/manager/iterations`).
3. Click `+ Add Iteration` → create a milestone with title, course, and deadline.
4. Click **Rubrics** on the newly created iteration row → add criteria → verify that the **Save** button remains disabled until the total weight equals exactly 100% → save rubrics.
5. Click **Submissions** on any row → review the group-wise status table and summary stat cards.

### 4. Student Workflow
1. Log in as `student1@bnu.edu.pk` / `11223344`.
2. Navigate to **Milestones** in the sidebar (`/student/iterations`).
3. Verify the real-time `DeadlineCountdown` indicator badge.
4. Click the iteration card → view the rubric criteria table with levels 0–5.
5. Drag & drop a `.pdf` file (or browse) and submit → verify status changes to **Submitted (On Time)**.

### 5. Manager Review Verification
1. Switch back to the Manager session → click **Submissions** on the submitted iteration.
2. Verify *Alpha Team* reflects as **Submitted**, displaying the student's name, timestamp, and a functional download link.

### 6. Automated Backend Tests
```bash
docker exec -e PYTHONPATH=/app pbl_backend pytest tests/test_iterations.py tests/test_submissions.py -v
```
*(All Sprint 3 tests pass in an isolated test database without purging development/seed data).*

---

## ✅ Definition of Done

- [x] Manager can create, edit, view, and delete iteration milestones.
- [x] Iteration deletion is blocked if student submissions exist.
- [x] Rubric Builder enforces strict 100% weight sum validation on both client and server.
- [x] Students in approved groups can upload project files (PDF/DOCX/XLSX/ZIP, max 10 MB).
- [x] Students without an approved group are rejected with `403 Forbidden`.
- [x] Submissions accurately detect on-time vs late submissions based on UTC deadline.
- [x] Manager can review all course groups' submission statuses with download links.
- [x] Reusable `FileDropzone` and `DeadlineCountdown` components implemented.
- [x] Vite frontend production build succeeds with 0 errors.
- [x] Automated backend tests pass and run against an isolated test database.
- [x] Clean commit history pushed to `feature/ramsha`.
