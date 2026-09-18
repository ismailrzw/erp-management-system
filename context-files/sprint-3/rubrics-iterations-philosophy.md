# 📐 Academic & Operational Synchronization: Iterations, Dynamic Rubrics, and the PBL Triad

## 📋 Executive Overview

In a Project-Based Learning (PBL) and Final Year Project (FYP) system, **Iterations** and **Rubrics** are not just database records and file-upload forms. They form the **academic contract** between three interdependent stakeholders:

1. **The Manager (Academic Policy & Process Administrator):** Sets the academic timeline, enforces standard assessment benchmarks, and monitors cohort-wide progress.
2. **The Student (Project Executor & Deliverable Producer):** Needs absolute clarity on expectations before submission, seamless group accountability, and timely, actionable feedback.
3. **The Teacher / Evaluator (Academic Mentor & Objective Assessor):** Guides students during the iteration window and provides objective, immutable grading backed by behavioral criteria.

When university management systems fail, it is usually because these three parties operate in silos. This document outlines how the **PBL Management System** achieves seamless synchronization between the Manager, the Student, and the Teacher.

---

## 🏛️ The Academic Triad: Roles & Boundaries

```
                         ┌─────────────────────────────┐
                         │       ACADEMIC MANAGER      │
                         │   Policy, Schedule & Rules  │
                         └──────────────┬──────────────┘
                                        │
           Sets Course Deadlines &      │ Monitors Cohort Compliance,
           Weighted Rubric Standards    │ Identifies At-Risk Groups
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             ▼                                                     ▼
┌─────────────────────────────┐                       ┌─────────────────────────────┐
│           STUDENT           │◄─────────────────────►│     TEACHER / EVALUATOR     │
│   Execution & Deliverable   │   Supervision Meetings│   Mentorship & Evaluation   │
└─────────────────────────────┘   & Feedforward Notes └─────────────────────────────┘
```

### 1. The Manager: Policy & Process Standard
- **Core Responsibility:** Quality assurance and academic governance.
- **Owns:**
  - Defining iteration milestones (titles, requirements, hard UTC deadlines).
  - Authoring dynamic rubrics and enforcing the mathematical constraint that weights strictly total 100%.
  - Assigning groups to Evaluators and Supervisors.
  - Reviewing group-wise submission status (Submitted, Late, Missing) to initiate timely administrative interventions.
- **Boundaries:** The Manager does **not** grade projects directly or override finalized evaluator scores.

### 2. The Student: Execution & Transparency
- **Core Responsibility:** Project development and deliverable submission.
- **Owns:**
  - Reviewing milestone expectations and rubric criteria **before** beginning project work.
  - Submitting project deliverables (PDF, DOCX, XLSX, ZIP up to 10 MB) as a cohesive team.
  - Reviewing past evaluation breakdowns and feedback to correct course for upcoming iterations.
- **Boundaries:** Individual students submit on behalf of their entire approved group; one group maintains one active submission per milestone.

### 3. The Teacher / Evaluator: Mentorship & Assessment
The Teacher plays two distinct, essential roles across the iteration timeline:
- **Role A — The Supervisor (Pre-Submission Mentorship):**
  - Holds structured supervision meetings with the assigned team.
  - Uses the Manager's published rubrics as a coaching checklist during meetings.
  - Logs supervision meeting minutes and attendance in the system (Sprint 4).
- **Role B — The Evaluator (Post-Submission Assessment):**
  - Downloads the group's submitted deliverable.
  - Evaluates the submission against the standardized 0–5 performance levels for each criterion.
  - Provides constructive, qualitative feedback per criterion.
  - Submits an immutable, locked score to guarantee academic integrity.

---

## ⚖️ The Mechanics of "Perfection" in Rubrics & Iterations

### 1. Rubrics as an Open Pre-Submission Contract
A common failure in academic systems is "post-facto grading," where students only learn how they were evaluated after grades are posted.
- **Pre-Submission Visibility:** In the PBL Management System, students inspect the exact rubric table on `IterationDetailPage.jsx` *before* submitting their work.
- **Behavioral Descriptors over Adjectives:** Performance levels (0 through 5) must describe observable deliverables rather than vague qualities:
  - *Poor Formulation:* Level 1 = "Poor", Level 3 = "Average", Level 5 = "Excellent".
  - *Behavioral Formulation:*
    - **Level 0 (Not Attempted):** No architectural design or diagrams included in the deliverable.
    - **Level 1 (Inadequate):** High-level diagram present, but missing component interfaces and technology choices.
    - **Level 3 (Adequate):** Standard UML component and deployment diagrams included; core data flows defined.
    - **Level 5 (Exemplary):** Comprehensive C4 architectural model, complete database schema, secure API interface specifications, and edge-case error flow documentation.

### 2. Strict Weight Mathematics ($\sum \text{Weights} = 100\%$)
The system enforces a hard server-side rule (`422 Unprocessable Entity`) and real-time client-side badge verification:
$$\sum_{i=1}^{n} w_i = 100$$
For any evaluation scoring (Sprint 4), the score contribution is automatically calculated:
$$\text{Score} = \sum_{i=1}^{n} \left( \frac{\text{Selected Level}_i}{5} \times w_i \right)$$
Because weights strictly equal 100%, the resulting grade always falls on a standardized 0–100 scale without manual conversions or calculation errors.

### 3. Group-Wide Synchronized Awareness
In team-based projects, miscommunication between members is a major issue:
- When any team member submits a file, the group record updates atomically.
- All team members immediately see:
  - *"Submitted by [Student Name] on [Formatted Timestamp]"*
  - *"Status: Submitted (On Time)"* or *"Status: Submitted (Late)"*
  - Direct file download link to verify the exact document that was uploaded.

---

## 🔄 The Closed-Loop Iteration Lifecycle

```
[ PHASE 1: MILESTONE AUTHORING ] (Manager)
  │  • Create milestone with deadline and details
  │  • Build dynamic rubric (weights sum to 100%, levels 0–5 defined)
  ▼
[ PHASE 2: GUIDANCE & SUPERVISION ] (Teacher & Students)
  │  • Supervisor meets with group
  │  • Review draft progress against published rubric criteria
  │  • Supervisor logs meeting notes & attendance
  ▼
[ PHASE 3: SUBMISSION & DEADLINE ] (Students)
  │  • Real-time countdown timer creates urgency
  │  • Students validate file type and size via FileDropzone
  │  • System automatically records UTC submission and late flag
  ▼
[ PHASE 4: OBJECTIVE EVALUATION ] (Teacher / Evaluator)
  │  • Evaluator downloads deliverable
  │  • Scores each criterion 0–5 and provides specific comments
  │  • Score locks permanently (immutable record)
  ▼
[ PHASE 5: FEEDFORWARD & INTERVENTION ] (Manager & Students)
  │  • Students review score breakdown to repair weaknesses
  │  • Manager reviews cohort trends; flags underperforming groups
  │  • Adjustments feed directly into the next iteration
```

---

## 🚀 Key Value Adds: Connecting Sprint 3 to Sprint 4

To maximize the system's impact across Sprints 3, 4, and 5, the following practices are established:

### 1. Rubric Reusability (Templates)
- **Problem:** Managers often spend excessive time re-typing standard evaluation criteria for multiple courses.
- **Solution:** Allow managers to save rubrics as course-level templates (e.g., *"Sprint 1: Requirements Analysis"*, *"Sprint 2: System Architecture"*, *"Sprint 3: Alpha Prototype"*).

### 2. Multi-Artifact Submissions (Repo & Live Links)
- In addition to file uploads (PDF/DOCX/ZIP), engineering FYPs require repository and prototype inspection.
- Supporting optional fields for `github_url` and `demo_url` provides evaluators with direct access to live systems alongside formal reports.

### 3. Feedforward Feedback Loop
- Evaluations should not just record grades; they must guide subsequent work.
- On the student's overview for Iteration $N+1$, display an alert showing the evaluator's constructive comments from Iteration $N$ so students address outstanding weaknesses before submitting the next milestone.

### 4. Automated "At-Risk" Intervention Signals
- If a group fails to submit an iteration, submits late repeatedly, or receives an evaluation score below 50%, the Manager's dashboard highlights the group as **"At Risk"**.
- This enables the university to arrange timely academic counseling rather than discovering failure at the final defense.

---

## 📌 Summary Checklist for System Success

- [x] **Clarity:** Students inspect rubrics before submitting, eliminating post-exam grading disputes.
- [x] **Fairness:** Teachers grade against behavioral criteria (levels 0–5) rather than subjective intuition.
- [x] **Integrity:** Submissions record exact UTC timestamps; evaluations are immutable once submitted.
- [x] **Transparency:** The Manager maintains real-time oversight of all groups, submissions, and evaluation progress across the institution.
