# PBL Management System — Master Document Index
## Beaconhouse National University
**Team:** Muhammad Ismail Rana (F2023-551) · Ramsha Naveed (F2023-027) · Sara Haider (F2023-744) · Sheikh Muhammad Ibrahim (F2023-630)
**Updated:** 2026-08-05

---

## Folder Structure

```
documents/
├── MASTER-INDEX.md                     ← You are here
├── stage-6-execution-guidance.md       ← Git workflow guide + Risk register
│
├── 00-audit/
│   └── 00-stage-1-audit-and-discovery.md
│
├── 01-requirements/
│   ├── SRS-v2.md
│   └── foundation-approval-package.md
│
├── 02-architecture/
│   └── architecture-and-uml.md
│
├── 03-database/
│   └── database-schema.md
│
├── 04-api/
│   └── api-contracts.md
│
└── 05-sprints/
    ├── SPRINT-00-FOUNDATION.md
    ├── SPRINT-01-MANAGER-CRUD.md
    ├── SPRINT-02-GROUP-FORMATION.md
    ├── SPRINT-03-ITERATIONS-SUBMISSIONS.md
    ├── SPRINT-04-EVALUATOR-SCORING.md
    ├── SPRINT-05-HOD-DEAN-DASHBOARDS.md
    ├── SPRINT-06-SURVEYS.md
    ├── SPRINT-07-REPORTS-POLISH.md
    ├── SPRINT-08-SECURITY-TESTING.md
    └── SPRINT-09-DEPLOYMENT.md
```

---

## All Documents at a Glance

| # | Document | Purpose | Start Here If… |
|---|----------|---------|---------------|
| 1 | [00-stage-1-audit-and-discovery.md](00-audit/00-stage-1-audit-and-discovery.md) | System audit, 17 issues found, 10-sprint roadmap | You want to understand what was wrong initially |
| 2 | [foundation-approval-package.md](01-requirements/foundation-approval-package.md) | Vision, scope, roles, permission matrix, architecture, full Sprint 0 code | You want to understand the full project scope |
| 3 | [SRS-v2.md](01-requirements/SRS-v2.md) | IEEE-style SRS — 55 functional requirements, 7 NFR categories, traceability | You are writing a requirements section |
| 4 | [architecture-and-uml.md](02-architecture/architecture-and-uml.md) | System architecture, UML diagrams (use-case, sequence, activity, component, deployment) | You are writing the design/architecture section |
| 5 | [database-schema.md](03-database/database-schema.md) | All 16 MongoDB collections — fields, types, example documents, indexes | You are setting up the database or creating models |
| 6 | [api-contracts.md](04-api/api-contracts.md) | All 90 API endpoints — request/response, error cases, sprint assignment | You are implementing or testing API endpoints |
| 7 | [SPRINT-00-FOUNDATION.md](05-sprints/SPRINT-00-FOUNDATION.md) | Sprint 0 setup — all 4 team members, exact file code, 38-item checklist | You are starting the project from scratch |
| 8 | [SPRINT-01-MANAGER-CRUD.md](05-sprints/SPRINT-01-MANAGER-CRUD.md) | Manager dashboard + CRUD for students/departments/courses/teachers + bulk import | Ismail (backend), Ramsha (frontend) |
| 9 | [SPRINT-02-GROUP-FORMATION.md](05-sprints/SPRINT-02-GROUP-FORMATION.md) | Group creation, join requests, optimistic locking, manager approval | Ismail (backend), Ramsha + Sara (frontend) |
| 10 | [SPRINT-03-ITERATIONS-SUBMISSIONS.md](05-sprints/SPRINT-03-ITERATIONS-SUBMISSIONS.md) | Iterations, rubrics (weights sum=100), file uploads, late detection | Ismail (backend), Ramsha + Sara (frontend) |
| 11 | [SPRINT-04-EVALUATOR-SCORING.md](05-sprints/SPRINT-04-EVALUATOR-SCORING.md) | Rubric scoring (locked on create), exhibition, meetings | Ismail (backend), Ramsha + Sara (frontend) |
| 12 | [SPRINT-05-HOD-DEAN-DASHBOARDS.md](05-sprints/SPRINT-05-HOD-DEAN-DASHBOARDS.md) | HOD dept-scoped dashboard, Dean university dashboard, charts | Ibrahim (backend), Sara (frontend) |
| 13 | [SPRINT-06-SURVEYS.md](05-sprints/SPRINT-06-SURVEYS.md) | Likert surveys, idempotent student responses, aggregate report | Ibrahim (backend), Ramsha + Sara (frontend) |
| 14 | [SPRINT-07-REPORTS-POLISH.md](05-sprints/SPRINT-07-REPORTS-POLISH.md) | Group + iteration reports, PDF print CSS, integration polish | Ibrahim (backend), All team (polish) |
| 15 | [SPRINT-08-SECURITY-TESTING.md](05-sprints/SPRINT-08-SECURITY-TESTING.md) | CORS, rate limiting, route audit, 30+ automated tests, code review | Ismail (security), Ibrahim (tests) |
| 16 | [SPRINT-09-DEPLOYMENT.md](05-sprints/SPRINT-09-DEPLOYMENT.md) | Render.com + Vercel deployment, BNU server, v1.0.0 tag | Ismail (backend), Ramsha (frontend) |
| 17 | [stage-6-execution-guidance.md](stage-6-execution-guidance.md) | Beginner Git workflow, file ownership, 15-risk register | Anyone new to Git |

---

## What to Do Right Now (Ordered)

> [!CAUTION]
> Do these in order. Step 1 is a security issue — do not skip it.

**Step 1 — Rotate MongoDB Credentials (Today, 5 minutes):**
[stage-6-execution-guidance.md](stage-6-execution-guidance.md) → Part C → Risk R-01 Response Plan.

**Step 2 — Confirm BNU-specific details with your faculty supervisor:**
- Student email domain: is it `@bnu.edu.pk`?
- Does BNU have an "HOD I&C" role?

**Step 3 — Begin Sprint 0:**
Open [SPRINT-00-FOUNDATION.md](05-sprints/SPRINT-00-FOUNDATION.md). All 4 team members work in parallel on their assigned tasks.

---

*All 6 stages of documentation complete — 17 documents, 10 sprint files, ready for implementation.*
