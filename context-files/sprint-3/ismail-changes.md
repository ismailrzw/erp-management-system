# 🚀 Sprint 3: Iterations, Rubric Templates, Submissions & Design Harmony — Ismail's Changes

## 📋 Executive Overview

- **Project:** ERP Management System (PBL Management System) · Beaconhouse National University
- **Sprint:** **Sprint 3 — Iteration Milestones, Dynamic Rubrics & Student Submissions**
- **Author:** Ismail Rizwan
- **Branch Transition:** `feature/ramsha` ➔ `feature/rubrics`
- **Total Impact:** 39 files modified/created · +4,385 insertions / -296 deletions
- **Test & Quality Status:** ✅ **100% Clean:** Backend Pytest (all passing), Ruff (0 errors), ESLint (0 errors, 0 warnings), Vite Production Build (`✓ built in 2.18s`).

This context document provides a complete, granular record of all architectural additions, bug fixes, UI/UX design systems, and frontend/backend implementations made after pulling down `feature/ramsha` and developing on `feature/rubrics`.

---

## 📜 Commit Chronology & History

All changes were committed progressively on `feature/rubrics` as follows:

| Commit Hash | Commit Message | Key Scope |
| :--- | :--- | :--- |
| `9670426` | `chore(docs): organize context files into sprint-1 and sprint-2 directories` | Reorganized repository root context files into structured sprint folders (`sprint-1/`, `sprint-2/`). |
| `85e109c` | `fix(lint): resolve all backend ruff errors and frontend eslint warnings` | Fixed imports, formatting, unused variables, and schema type errors across Python and React. |
| `09777ee` | `docs(sprint-3): add rubrics and iterations synchronization philosophy` | Authored `rubrics-iterations-philosophy.md` detailing the academic triad (Manager, Student, Teacher). |
| `1ee9fc5` | `feat(sprint-3): overhaul manager & student iterations, rubrics, and submission workflows` | Added backend Rubric Templates CRUD, template API client, Rubric Templates Page, student countdowns, and submission details. |
| `c3d7ee9` | `feat(manager-iterations): add collective stats, cross-course visibility, delete modal & filtering` | Added collective statistics aggregations, cross-course departmental breakdown, and deletion confirmation modal. |
| `929d8d3` | `feat(ui): modernize dropdowns, datetime pickers and iteration navigation` | Built modern UI design system (`Select.jsx`, `DateTimePicker.jsx`), overhauled `index.css`, fixed iteration submissions navigation. |
| `fa7b846` | `fix(manager): resolve onSave callback error and prop mismatch in iteration modal` | Fixed `onSave is not a function` error during iteration creation; normalized callback and initialData props. |
| `d23a4df` | `feat(manager): redesign iterations page with human-centered lifecycle harmony` | Complete UX redesign of `IterationsManagePage.jsx`: Active Milestone Spotlight, 3 pulse cards, collapsible matrix, Lifecycle Stages vs Table views. |

---

## 🏛️ Backend Architecture & API Enhancements

### 1. Reusable Rubric Templates Subsystem
- **New Blueprint:** [`backend/app/blueprints/manager/rubric_templates.py`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/backend/app/blueprints/manager/rubric_templates.py)
- **Registered Namespace:** Registered under `/api/manager/rubric-templates` in [`backend/app/__init__.py`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/backend/app/__init__.py).
- **Core Endpoints:**
  - `GET /api/manager/rubric-templates` — Lists templates with optional course filter (`?course=...`).
  - `POST /api/manager/rubric-templates` — Creates a reusable rubric template with strict 100% total weight validation.
  - `GET /api/manager/rubric-templates/<id>` — Fetches full criteria and level descriptors (Levels 0–5).
  - `PUT /api/manager/rubric-templates/<id>` — Updates template criteria with atomic weight checks.
  - `DELETE /api/manager/rubric-templates/<id>` — Deletes template record.
- **Strict Validation Rules:**
  - Enforces that criteria weights sum to exactly **100%** (returns `422 Unprocessable Entity` on mismatch).
  - Enforces descriptor structure for performance levels 0 through 5.
  - Supports template scoping to `"All Courses"` or specific academic courses (e.g. `"Final Year Project I"`).

### 2. Collective Statistics & Cross-Course Aggregations
- **Updated Blueprint:** [`backend/app/blueprints/manager/iterations.py`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/backend/app/blueprints/manager/iterations.py)
- **Enriched `GET /api/manager/iterations`:**
  - Dynamically calculates aggregate deliverable statistics for every milestone directly in the response:
    - `total_groups`: Total approved student groups enrolled in the target course.
    - `submitted_count`: Number of groups that submitted deliverables.
    - `late_count`: Number of groups marked as late submissions.
    - `by_course`: Breakdown array with `{ course, dept, total_groups, submitted_count, late_count }`.
- **Enriched `GET /api/manager/iterations/<id>/submissions`:**
  - Returns detailed group submissions alongside course sections, submitter profile info, download URLs, and submission timestamps.

### 3. Safe Deletion Guard
- Rejects iteration milestone deletion with `400 Bad Request` if student submissions already exist in the database, preventing accidental destruction of student academic records.

### 4. Automated Backend Test Suite
- **New Test File:** [`backend/tests/test_rubric_templates.py`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/backend/tests/test_rubric_templates.py)
  - Isolated test cases covering template creation, 100% weight validation failure, valid update, course-filtering, and deletion.
- **Updated Tests:** Maintained 100% pass rate in [`test_iterations.py`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/backend/tests/test_iterations.py) and [`test_submissions.py`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/backend/tests/test_submissions.py).

---

## 🎨 Universal Modern UI/UX Design System

### 1. Global CSS Overhaul ([`frontend/src/index.css`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/index.css))
- **Universal Selects (`select`)**:
  - Completely removed native OS chrome and clunky beveled dropdown arrows using `appearance: none`.
  - Injected an inline SVG chevron-down indicator with dedicated right-padding (`36px`).
  - Added modern 8px border-radius, clean `#cbd5e1` borders, and `#ffffff` background.
  - Interactive states: smooth hover border (`#94a3b8`) and focus glow ring (`box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14); border-color: #2563eb`).
- **Universal Date & Time Pickers (`input[type="date"]`, `input[type="time"]`, `input[type="datetime-local"]`)**:
  - Consistent 8px border-radius, padding, and focus glow rings.
  - Customized `::-webkit-calendar-picker-indicator` with pointer cursor, hover transitions, and subtle background accent.

### 2. Reusable UI Components
- **[`Select.jsx`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/components/ui/Select.jsx)**:
  - Reusable dropdown wrapper supporting leading icons (`GraduationCap`, `Building2`, `FileText`), required asterisks, helper text, and error states.
- **[`DateTimePicker.jsx`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/components/ui/DateTimePicker.jsx)**:
  - High-productivity date & time picker:
    - **Live Formatted Preview Badge**: Human-readable date string (e.g. `📅 Sat, 12 Sep 2026 at 11:59 PM`) with relative status (`Tomorrow`, `in 3 days`).
    - **Quick Presets Toolbar**: One-click shortcuts for `End of Day (23:59)`, `Tomorrow 23:59`, `+1 Week`, `+2 Weeks`.
    - **Split Date & Time Controls**: Independent date and time selectors.
    - **Time Shortcuts**: Fast buttons for `11:59 PM`, `05:00 PM`, `12:00 PM`, `09:00 AM`.
    - **Clear / Reset Button**: Instant date reset.

### 3. Application-Wide Dropdown & Date Picker Upgrades
Propagated modern dropdowns and pickers across all existing manager and student screens:
- **Courses:** [`CourseListPage.jsx`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/pages/manager/courses/CourseListPage.jsx) & [`AddCoursePage.jsx`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/pages/manager/courses/AddCoursePage.jsx)
- **Groups:** [`ManageGroupsPage.jsx`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/pages/manager/groups/ManageGroupsPage.jsx) & [`BrowseGroupsPage.jsx`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/pages/student/groups/BrowseGroupsPage.jsx)
- **Students:** [`StudentListPage.jsx`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/pages/manager/students/StudentListPage.jsx) & [`AddStudentPage.jsx`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/pages/manager/students/AddStudentPage.jsx)
- **Teachers:** [`TeacherListPage.jsx`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/pages/manager/teachers/TeacherListPage.jsx) & [`AddTeacherPage.jsx`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/pages/manager/teachers/AddTeacherPage.jsx)

---

## 🎯 Manager Iterations Dashboard: Human-Centered Design Harmony

[`frontend/src/pages/manager/iterations/IterationsManagePage.jsx`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/pages/manager/iterations/IterationsManagePage.jsx) was completely overhauled to resolve visual congestion and align with real-life academic recalling:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PAGE HEADER: Iteration Milestones & Evaluation       [Course Matrix] [+Add] │
├─────────────────────────────────────────────────────────────────────────────┤
│  ⭐ ACTIVE MILESTONE SPOTLIGHT BANNER                                       │
│  Final Year Project Proposal · FYP I               [Due Tomorrow at 11:59PM] │
│  Deliverables: [=========>          ] 1/2 Groups (50%)                       │
│  Rubric Status: [✓ 4 Criteria Ready]      [Rubrics] [Review Submissions →]  │
├─────────────────────────────────────────────────────────────────────────────┤
│  📊 3 EXECUTIVE PULSE METRICS                                                │
│  [📌 Semester Milestones]   [📈 Deliverable Compliance]   [⚖️ Rubric Ready] │
│     3 Planned (2 Active)        50% Submitted (1 Late)       2 of 3 Ready    │
├─────────────────────────────────────────────────────────────────────────────┤
│  🔍 TOOLBAR: [Search...] [Course ▼] [Dept ▼] [Sort By ▼]   [Stages | Table]  │
│  Filter: [All] [Active & Upcoming] [Missing Rubrics] [Needs Follow-up (<50%)]│
├─────────────────────────────────────────────────────────────────────────────┤
│  STAGE 1: CURRENT ACTIVE MILESTONE (In Progress)                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Final Year Project Proposal · Due 12 Sep 2026, 11:59 PM (in 1 day)    │  │
│  │ Progress: 1/2 Groups Submitted (1 pending)                            │  │
│  │ Actions: [Rubric] [Submissions] [Edit] [Delete]                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  STAGE 2: UPCOMING MILESTONES (Planning Ahead)                              │
│  ┌───────────────────────────────────┐   ┌───────────────────────────────┐  │
│  │ Sprint 1 - SRS & Architecture    │   │ Mid-Term Evaluation & Demo    │  │
│  │ [⚠️ Missing Rubric Criteria]      │   │ [✓ 5 Criteria Configured]     │  │
│  └───────────────────────────────────┘   └───────────────────────────────┘  │
│  STAGE 3: COMPLETED / CLOSED MILESTONES (Archive)                           │
│  [Hide/Show Archived ▼]                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Highlights of the Redesign:
1. **Active Milestone Spotlight Banner**: Instant executive visibility into the nearest deadline milestone with progress gauges, scope badges, and direct primary action (`Review Submissions →`).
2. **3 Focused Pulse Cards**: Replaced 5 cramped cards with clear, glanceable indicators: Semester Milestones, Deliverable Compliance, and Rubric Readiness.
3. **Collapsible Cross-Course Matrix**: Tucked behind `[Course Matrix]` toggle; fixed mathematical calculation where pending displayed `1` when completion was `100%`.
4. **Dual View Modes (Lifecycle Stages vs Compact Table)**:
   - **Stages View (Default)**: Grouped into **Active In-Progress**, **Upcoming Planning**, and **Completed Archive**.
   - **Compact Table View**: High-density scanner table with formatted human dates, countdowns, rubric badges, and action buttons.
5. **Human-Friendly Date Formatter**: Eradicated raw ISO strings (`2026-09-12T11:59`) in favor of readable dates (`12 Sep 2026 at 11:59 PM`).
6. **Action-Oriented Filter Pills**: Fast filtering by `Missing Rubrics`, `Active & Upcoming`, and `Needs Follow-up (<50%)`.
7. **Direct Submissions Navigation**: Fixed previous UI lag/modal popping by navigating directly to `/manager/iterations/:id/submissions`.
8. **Safe Deletion Modal**: Displays milestone statistics and blocks deletion if active student submissions exist.

---

## 🧩 Rubric Templates & Iteration Form Overhaul

### 1. Rubric Templates Management Page ([`RubricTemplatesPage.jsx`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/pages/manager/iterations/RubricTemplatesPage.jsx))
- New dedicated dashboard accessible via `/manager/rubric-templates` and Sidebar navigation.
- Grid of rubric templates showing criteria breakdown, weight distribution badges, and course scope tags.
- Modal to create and edit templates with real-time total weight counter and levels 0–5 descriptors.

### 2. Rubric Builder Modal ([`RubricBuilderModal.jsx`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/pages/manager/iterations/RubricBuilderModal.jsx))
- **Template Loader**: Allows managers to pre-fill criteria instantly from any saved template.
- **Save As Template**: Allows newly built criteria to be saved back as a reusable template.
- **Real-Time Weight Validation**: Sticky alert badge requiring criteria weights to equal exactly 100%.

### 3. Iteration Form Modal ([`IterationFormModal.jsx`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/pages/manager/iterations/IterationFormModal.jsx))
- **Bug Fix**: Resolved `onSave is not a function` error during milestone creation by normalizing both `onSave` and `onSuccess` callback props and `initialData`/`iteration` props.
- Integrated `<DateTimePicker />` for deadline selection with live preset buttons.
- Integrated `<Select />` for target course selection.
- Added optional dropdown to pre-select a rubric template during milestone creation.

---

## 🎓 Student Milestones & Submissions UI

- **[`StudentIterationsPage.jsx`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/pages/student/iterations/StudentIterationsPage.jsx)**:
  - Clean milestone cards with course badges, live countdown timers, and submission status pills (`Submitted`, `Pending`, `Late Submission`).
- **[`IterationDetailPage.jsx`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/pages/student/iterations/IterationDetailPage.jsx)**:
  - Full rubric criteria inspection table showing levels 0 through 5.
  - Drag-and-drop file upload using `<FileDropzone />` with client-side file size/type validation.
  - Existing submission display with submitter name, submission timestamp, late badge, and download link.

---

## 📁 Complete Modified Files Inventory

| File Path | Nature of Change | Description |
| :--- | :---: | :--- |
| [`backend/app/__init__.py`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/backend/app/__init__.py) | Modified | Registered rubric templates namespace. |
| [`backend/app/blueprints/manager/iterations.py`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/backend/app/blueprints/manager/iterations.py) | Modified | Added aggregate stats, cross-course breakdown, and deletion protection. |
| [`backend/app/blueprints/manager/rubric_templates.py`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/backend/app/blueprints/manager/rubric_templates.py) | **New** | Full CRUD for reusable rubric templates with strict 100% weight validation. |
| [`backend/app/blueprints/student/iterations.py`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/backend/app/blueprints/student/iterations.py) | Modified | Enriched milestone response with rubric criteria and group status. |
| [`backend/tests/test_rubric_templates.py`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/backend/tests/test_rubric_templates.py) | **New** | Unit tests for rubric templates CRUD and weight validation. |
| [`backend/tests/test_iterations.py`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/backend/tests/test_iterations.py) | Modified | Maintained 100% pass rate. |
| [`backend/tests/test_submissions.py`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/backend/tests/test_submissions.py) | Modified | Maintained 100% pass rate. |
| [`frontend/src/App.jsx`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/App.jsx) | Modified | Added `/manager/rubric-templates` route. |
| [`frontend/src/api/rubricTemplatesApi.js`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/api/rubricTemplatesApi.js) | **New** | Axios API client for rubric templates. |
| [`frontend/src/components/layout/Sidebar.jsx`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/components/layout/Sidebar.jsx) | Modified | Added "Rubric Templates" link in Manager navigation. |
| [`frontend/src/components/ui/Select.jsx`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/components/ui/Select.jsx) | **New** | Reusable modern select component with icon support and states. |
| [`frontend/src/components/ui/DateTimePicker.jsx`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/components/ui/DateTimePicker.jsx) | **New** | Reusable modern date & time picker with presets and live preview. |
| [`frontend/src/index.css`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/index.css) | Modified | Global styling for `select`, `input[type="date"]`, `input[type="time"]`. |
| [`frontend/src/pages/manager/iterations/IterationsManagePage.jsx`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/pages/manager/iterations/IterationsManagePage.jsx) | Modified | Complete Human-Centered Design Harmony redesign. |
| [`frontend/src/pages/manager/iterations/IterationFormModal.jsx`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/pages/manager/iterations/IterationFormModal.jsx) | Modified | Fixed `onSave` bug; integrated `DateTimePicker` & `Select`. |
| [`frontend/src/pages/manager/iterations/RubricBuilderModal.jsx`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/pages/manager/iterations/RubricBuilderModal.jsx) | Modified | Added template loader and template saver. |
| [`frontend/src/pages/manager/iterations/RubricTemplatesPage.jsx`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/pages/manager/iterations/RubricTemplatesPage.jsx) | **New** | Standalone dashboard for managing reusable rubric templates. |
| [`frontend/src/pages/manager/iterations/IterationSubmissionsPage.jsx`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/pages/manager/iterations/IterationSubmissionsPage.jsx) | Modified | Enhanced submissions review table, stats, and download links. |
| [`frontend/src/pages/student/iterations/StudentIterationsPage.jsx`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/pages/student/iterations/StudentIterationsPage.jsx) | Modified | Upgraded student cards with live countdowns and status pills. |
| [`frontend/src/pages/student/iterations/IterationDetailPage.jsx`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/pages/student/iterations/IterationDetailPage.jsx) | Modified | Rubric criteria breakdown and file submission view. |
| `context-files/sprint-3/rubrics-iterations-philosophy.md` | **New** | Documentation of academic triad synchronization. |
| `context-files/sprint-3/ismail-changes.md` | **New** | This comprehensive change log and architecture context file. |

---

## 🧪 Verification & Validation Evidence

1. **Backend Automated Tests (Pytest)**:
   ```bash
   pytest tests/test_iterations.py tests/test_rubric_templates.py tests/test_submissions.py -v
   ```
   - **Result:** **100% Passing**. All criteria weight constraints (422 status), CRUD endpoints, late-detection logic, and submission guards passed without errors.

2. **Backend Code Quality (Ruff)**:
   ```bash
   ruff check app tests
   ```
   - **Result:** **0 errors**.

3. **Frontend Linter (ESLint)**:
   ```bash
   npm run lint
   ```
   - **Result:** **0 errors, 0 warnings**.

4. **Frontend Production Build (Vite)**:
   ```bash
   npm run build
   ```
   - **Result:** `✓ built in 2.18s` with zero bundle compilation issues.
