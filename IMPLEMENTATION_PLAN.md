# Sprint Refinement: Student Decoupling, Course Deadline Removal, Multi-Milestone Sprints & Manager Rubric Grading

**Document Version:** 1.0  
**Date:** 2026-09-26  
**Status:** Completed & Fully Verified  
**Target Subsystems:** Manager Portal, Evaluator Portal, Student Portal, MongoDB Backend  

---

## 1. Executive Summary & Problem Analysis

This document provides the definitive implementation blueprint for two major architectural refinements:

1. **Student Registration Decoupling**:
   - **Problem**: When creating a student, the system currently exposes a static "Assigned Teacher / Evaluator" field. In reality, supervisors and evaluators are assigned to *Project Groups*, not to individual unassigned student accounts.
   - **Solution**: Completely remove teacher/evaluator assignment from student creation and editing across backend schemas, Swagger models, student services, bulk import services, and frontend forms. Update student profile views to dynamically display group-level supervisors.

2. **Course Deadline Removal & Sprint-Milestone Architecture**:
   - **Problem**: Courses currently include a `group_formation_deadline` or generic deadline at the course-configuration level. This conflicts with agile academic workflows where deadlines belong to project iterations and milestones. Furthermore, there is no way for a manager to grade students who fail to form groups.
   - **Solution**:
     - Remove deadline fields completely from the "Add New Course" form, Course edit modal, table views, and backend schemas.
     - Move all deadlines into **Sprint Iterations & Milestones**.
     - Enhance the Iteration system to support **Multiple Milestones per Sprint** (e.g. Sprint 1 $\rightarrow$ Milestone 1: Group Formation, Milestone 2: Proposal Submission).
     - Designate the Group Formation Deadline as an official milestone with its own custom-designed rubrics.
     - **The Key Gap Filled**: Build a **Manager Rubric Grading Engine** that enables the Manager to evaluate and mark ungrouped defaulters (and milestone deliverables) directly against configured rubrics from the Manager Iterations dashboard.

---

## 2. Architectural Decisions (ADRs)

| ADR ID | Title | Decision & Rationale |
|---|---|---|
| **ADR-01** | **Teacher/Evaluator Assignment Belongs to Groups** | In Project-Based Learning (PBL), teachers supervise projects, not raw users. Individual student records must never store an arbitrary `teacher` string. Student profile queries will dynamically resolve the group supervisor from the student's active group membership. |
| **ADR-02** | **Single Source of Truth for Deadlines** | Courses define academic configuration (Department, Session, Min/Max Group sizes). All temporal constraints (Group Formation cutoff, intermediate deliverables, final defense) belong strictly to **Iteration Milestones**. |
| **ADR-03** | **Hierarchical Sprints & Milestones** | Rather than flat, disconnected iterations, milestones are grouped under Sprints (`sprint_name`: "Sprint 1", "Sprint 2", etc.). Each milestone possesses its own sequential order, deadline, deliverable guidelines, and independent rubric criteria set. |
| **ADR-04** | **Student-Level Milestone Evaluation Model** | The existing evaluation collection requires `group_id` and evaluator assignment. Because ungrouped defaulters have no group, we introduce a student-level evaluation capability (`target_type: "student"`, `is_defaulter: true`) and authorize the Manager role to grade milestone defaulters using designed milestone rubrics. |
| **ADR-05** | **Backward-Compatible Bulk Import** | Remove `"Teacher"` from required CSV columns. In row normalisation, if a legacy CSV contains a "Teacher" column, ignore it gracefully without rejecting the upload. |

---

## 3. Detailed Technical Specifications & Data Models

### 3.1 Data Model Changes

#### 1. Users Collection (`mongo.db.users`)
```diff
 {
   "_id": ObjectId("..."),
   "name": "Hamza Tariq",
   "roll": "f2024-551",
   "email": "f2024-551@bnu.edu.pk",
   "dept": "CS",
   "section": "A",
   "course": "Final Year Project",
   "session": "Fall 2025",
-  "teacher": "Dr. Sarah Ahmed",
   "role": "student"
 }
```

#### 2. Courses Collection (`mongo.db.courses`)
```diff
 {
   "_id": ObjectId("..."),
   "name": "Final Year Project - Fall 2025",
   "dept": "CS",
   "min_group": 2,
   "max_group": 4,
-  "group_formation_deadline": "2026-08-15",
-  "deadline": "2026-08-15",
   "deleted": false
 }
```

#### 3. Iterations Collection (`mongo.db.iterations`)
```diff
 {
   "_id": ObjectId("..."),
+  "sprint_name": "Sprint 1",
+  "milestone_order": 1,
+  "milestone_type": "group_formation",  // "group_formation" | "deliverable" | "presentation"
   "title": "Milestone 1: Group Formation & Proposal Cutoff",
   "course": "Final Year Project - Fall 2025",
   "deadline": "2026-08-15T23:59:59Z",
   "details": "All students must form approved project teams and select their topic.",
   "is_group_formation": true,
   "late_penalty_percent": 15,
   "rubrics": [
     {
       "id": 1,
       "question": "Group Formation Timeliness & Registration",
       "weight": 10,
       "levels": {
         "0": "Not formed / Defaulter (0 pts)",
         "1": "Critical delay / Major intervention needed",
         "2": "Formed late with extension",
         "3": "Formed on deadline date",
         "4": "Formed ahead of deadline with complete roster",
         "5": "Exemplary early formation with registered supervisor"
       }
     },
     {
       "id": 2,
       "question": "Initial Topic Proposal Clarity",
       "weight": 15,
       "levels": {
         "0": "No proposal submitted",
         "1": "Vague / Unapproved",
         "2": "Needs revision",
         "3": "Acceptable",
         "4": "Well defined",
         "5": "Innovative and comprehensive"
       }
     }
   ]
 }
```

#### 4. NEW: Student Milestone Evaluations Collection (`mongo.db.student_evaluations`)
Stores evaluations graded by the Manager (or Evaluator) for individual students (including defaulters):
```json
{
  "_id": "ObjectId(...)",
  "iteration_id": "ObjectId(...)",
  "course": "Final Year Project - Fall 2025",
  "student_id": "ObjectId(...)",
  "student_roll": "f2024-551",
  "student_name": "Hamza Tariq",
  "target_type": "student",
  "is_defaulter": true,
  "evaluator_id": "manager_user_id",
  "evaluator_role": "manager",
  "evaluator_name": "PBL Manager",
  "scores": {
    "1": 0,
    "2": 1
  },
  "rubric_snapshot": [ ... ],
  "total_weighted_score": 3.0,
  "max_possible_score": 25.0,
  "percentage": 12.0,
  "feedback": "Failed to form or join any group by the Sprint 1 milestone cutoff.",
  "graded_at": "2026-09-26T12:00:00Z",
  "updated_at": "2026-09-26T12:00:00Z"
}
```

---

## 4. API Endpoints & Contract Changes

### 4.1 Student APIs
* `POST /api/manager/students/`:
  - `CreateStudentSchema`: Remove `teacher`.
  - Swagger payload: Remove `teacher`.
* `PUT /api/manager/students/<id>`:
  - `UpdateStudentSchema`: Remove `teacher`.
* `POST /api/manager/students/bulk-import`:
  - Required columns: `Name`, `Roll`, `Department`, `Section`, `Session`, `Course`, `Recovery Email`.
  - Ignores `Teacher` if present in uploaded files.
* `GET /api/manager/students/export`:
  - Remove "Teacher" column from CSV/Excel export.

### 4.2 Course APIs
* `POST /api/manager/courses/`:
  - `CreateCourseSchema`: Remove `group_formation_deadline` and `deadline`.
* `PUT /api/manager/courses/<id>`:
  - `UpdateCourseSchema`: Remove `group_formation_deadline` and `deadline`.

### 4.3 Iteration Milestone APIs
* `POST /api/manager/iterations`:
  - Accepts `sprint_name` (string, default `"Sprint 1"`).
  - Accepts `milestone_order` (int, default `1`).
  - Accepts `milestone_type` (`"group_formation"`, `"deliverable"`, `"presentation"`).
  - If `milestone_type == "group_formation"`, sets `is_group_formation = True`.
* `PUT /api/manager/iterations/<id>`:
  - Supports updating `sprint_name`, `milestone_order`, and `milestone_type`.
* `GET /api/manager/iterations/<id>/student-evaluations`:
  - Returns list of graded student milestone evaluations for this iteration.
* `POST /api/manager/iterations/<id>/student-evaluations`:
  - Role: `MANAGER` (or `EVALUATOR`).
  - Request body:
    ```json
    {
      "student_id": "string (ObjectId)",
      "scores": { "1": 0, "2": 2 },
      "feedback": "string",
      "is_defaulter": true
    }
    ```
  - Calculates weighted marks against milestone rubrics.
  - Inserts/updates `student_evaluations`.
* `GET /api/student/iterations/<id>`:
  - Enriches response with `student_evaluation` containing rubric scores, weighted marks, and Manager feedback if student was evaluated.

---

## 5. Frontend UI/UX Architecture

### 5.1 Manager: Add Student Page (`AddStudentPage.jsx`)
* Remove teacher API call `teachersApi.list()`.
* Remove `teacher` state variable.
* Remove the entire "Assigned Teacher / Evaluator" select dropdown.
* Update sample CSV template download.

### 5.2 Student: Profile Page (`StudentProfilePage.jsx`)
* Replace static `profile?.teacher` with dynamically resolved `group?.supervisor_name || 'Not Assigned'`.
* Display group role and supervisor email if assigned.

### 5.3 Manager: Add Course Page (`AddCoursePage.jsx`) & Course List (`CourseListPage.jsx`)
* Remove the Group Formation Deadline date input and description box from `AddCoursePage.jsx`.
* Remove "Group Formation Deadline" column from `CourseListPage.jsx` table.
* Remove deadline input from Edit Course modal in `CourseListPage.jsx`.

### 5.4 Manager: Manage Iterations (`IterationsManagePage.jsx`)
* **Sprint Grouping**: Display milestones grouped under Sprint collapsible cards:
  - **Sprint 1 (2 Milestones)**:
    - *Milestone 1*: 👥 Group Formation Cutoff • Due Aug 15 • 2 Rubric Criteria (25 pts) • Actions: [Rubrics] [Submissions & Defaulters] [Edit]
    - *Milestone 2*: 📄 Software Architecture Proposal • Due Sep 01 • 3 Rubric Criteria (35 pts)
  - **Sprint 2 (2 Milestones)**:
    - *Milestone 1*: 💻 Core Prototype & Sprint Demo • Due Oct 15
* Button: `+ Add Milestone` (pre-fills selected sprint).

### 5.5 Manager: Iteration Submissions & Defaulter Grading (`IterationSubmissionsPage.jsx`)
* Under the **Ungrouped Students / Defaulters** section:
  - Add **Rubric Marks** column showing status:
    - Not Graded: `<span class="badge badge-warning">Not Graded</span>`
    - Graded: `<span class="badge badge-success">3 / 25 pts (12%)</span>`
  - Add **Action** button: `Mark Student` (or `Edit Mark`).
* **Interactive Manager Student Grading Modal**:
  - Displays Student Name, Roll Number, and Course.
  - Displays all milestone rubrics (Level 0 to 5 selector pills).
  - Displays rubric criteria descriptions for each score level.
  - Text area for Manager Feedback / Penalty Notes.
  - Real-time score calculator preview.
  - Submits to `POST /api/manager/iterations/<id>/student-evaluations`.

### 5.6 Student: Milestone Detail Page (`IterationDetailPage.jsx`)
* If the student is an ungrouped defaulter or evaluated by the Manager:
  - Displays **Milestone Evaluation Card**:
    - Total points awarded vs max points.
    - Rubric criteria score breakdown table.
    - Manager feedback comments.

---

## 6. Implementation Phasing & Task Checklist

### Phase 1: Decouple Teacher/Evaluator from Student Creation
- [x] **Task 1.1**: Update `backend/app/schemas/student_schema.py`:
  - Remove `teacher` field from `CreateStudentSchema` and `UpdateStudentSchema`.
- [x] **Task 1.2**: Update `backend/app/blueprints/manager/students.py`:
  - Remove `teacher` from Swagger `student_model` & `student_update_model`.
  - Remove `Teacher` from CSV/Excel export headers and row generator.
- [x] **Task 1.3**: Update `backend/app/services/student_service.py`:
  - Remove `"teacher"` assignment in `create_student()`.
- [x] **Task 1.4**: Update `backend/app/services/bulk_import_service.py`:
  - Remove `"Teacher"` from `REQUIRED_COLUMNS`.
  - In `_normalise_row()`, handle absence of `Teacher` gracefully.
- [x] **Task 1.5**: Update `frontend/src/pages/manager/students/AddStudentPage.jsx`:
  - Remove `teachersApi` import and query.
  - Remove `teacher` from form state and payload.
  - Remove the select input.
  - Remove `Teacher` from the sample CSV template string.
- [x] **Task 1.6**: Update `frontend/src/pages/student/profile/StudentProfilePage.jsx`:
  - Display group supervisor name instead of `profile?.teacher`.
- [x] **Task 1.7**: Fix unit/integration test fixtures in `backend/tests/` to remove `"teacher"`.

### Phase 2: Decouple Course Deadlines & Point to Iterations
- [x] **Task 2.1**: Update `backend/app/schemas/course_schema.py`:
  - Remove `group_formation_deadline` and `deadline` from schemas and validators.
- [x] **Task 2.2**: Update `backend/app/blueprints/manager/courses.py`:
  - Remove deadline fields from Swagger models and route handlers.
- [x] **Task 2.3**: Update `backend/app/services/course_service.py`:
  - Remove deadline arguments from `create_course()` and `update_course()`.
- [x] **Task 2.4**: Update `frontend/src/pages/manager/courses/AddCoursePage.jsx`:
  - Remove `group_formation_deadline` from state, submit payload, and JSX form.
- [x] **Task 2.5**: Update `frontend/src/pages/manager/courses/CourseListPage.jsx`:
  - Remove "Group Formation Deadline" table column and edit modal field.
- [x] **Task 2.6**: Update `backend/app/services/group_service.py`:
  - Update `compute_formation_status()` to query iteration milestone directly.

### Phase 3: Sprints & Multi-Milestones Architecture
- [x] **Task 3.1**: Update `backend/app/models/iteration.py`:
  - Add `SPRINT_NAME = "sprint_name"`, `MILESTONE_ORDER = "milestone_order"`, `MILESTONE_TYPE = "milestone_type"`.
- [x] **Task 3.2**: Update `backend/app/blueprints/manager/iterations.py`:
  - Add sprint, order, and type fields to `create_iteration_model`.
  - Persist and return `sprint_name`, `milestone_order`, and `milestone_type` in `post()` and `put()`.
- [x] **Task 3.3**: Update `frontend/src/pages/manager/iterations/IterationFormModal.jsx`:
  - Add Sprint Selector input (with preset sprints + option to type new sprint).
  - Add Milestone Type selector (`Group Formation & Proposal Cutoff`, `Deliverable`, `Presentation`).
  - Add Milestone Order input.
- [x] **Task 3.4**: Update `frontend/src/pages/manager/iterations/IterationsManagePage.jsx`:
  - Group milestones by Sprint accordion cards.
  - Render milestone order badges, deadlines, and rubric counts.

### Phase 4: Manager Milestone Grading & Defaulter Evaluation Engine
- [x] **Task 4.1**: Create `backend/app/blueprints/manager/iterations.py` endpoints:
  - `GET /api/manager/iterations/<iteration_id>/student-evaluations`
  - `POST /api/manager/iterations/<iteration_id>/student-evaluations`
  - Calculate weighted score: $\sum (\frac{\text{score}}{5} \times \text{weight})$.
- [x] **Task 4.2**: Update `frontend/src/api/iterationsApi.js`:
  - Add `getStudentEvaluations(iterationId)`
  - Add `gradeStudent(iterationId, payload)`
- [x] **Task 4.3**: Update `frontend/src/pages/manager/iterations/IterationSubmissionsPage.jsx`:
  - Fetch student evaluations on page load.
  - In "Ungrouped Students / Defaulters", show "Rubric Marks" column.
  - Add "Mark Student" action button.
  - Build `ManagerStudentGradingModal` component with interactive score selector (0-5) and feedback field.
- [x] **Task 4.4**: Update `backend/app/blueprints/student/iterations.py`:
  - Include student's individual evaluation in `GET /api/student/iterations/<id>`.
- [x] **Task 4.5**: Update `frontend/src/pages/student/iterations/IterationDetailPage.jsx`:
  - Display official rubric evaluation card for students.

---

## 7. Verification & Testing Strategy

1. **Test Student Decoupling**:
   - `test_create_student_without_teacher`: Ensure student is created with `name`, `roll`, `dept`, `section`, `course`, and no `teacher` field in database.
   - `test_bulk_import_without_teacher_column`: Ensure CSV without `Teacher` imports with 100% success.
   - `test_bulk_import_with_legacy_teacher_column`: Ensure legacy CSV with `Teacher` does not raise schema error.
2. **Test Course Deadline Removal**:
   - `test_create_course_without_deadline`: Ensure course creates successfully with name, dept, min_group, max_group.
   - `test_group_formation_status_uses_iteration_deadline`: When group is formed after Milestone 1 deadline, status is calculated as `"late"`.
3. **Test Multi-Milestone Sprints**:
   - Create Sprint 1 Milestone 1 (Group Formation, 2 rubrics, weight 25).
   - Create Sprint 1 Milestone 2 (Proposal PDF, 3 rubrics, weight 35).
   - Ensure manager iterations API returns both milestones grouped under `"Sprint 1"`.
4. **Test Manager Defaulter Rubric Grading**:
   - Create ungrouped student.
   - Send `POST /api/manager/iterations/<milestone_1_id>/student-evaluations` with score `{ "1": 0, "2": 2 }` and comment.
   - Verify `total_weighted_score` is computed correctly.
   - Verify student login to `GET /api/student/iterations/<milestone_1_id>` returns the evaluation breakdown.
