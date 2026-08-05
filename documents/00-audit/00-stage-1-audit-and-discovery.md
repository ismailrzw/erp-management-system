# Stage 1 — Discovery and Audit
## PBL Management System · Beaconhouse National University
**Prepared by:** Antigravity AI (Senior Software Requirements Engineer + Architect + PM)
**Prepared for:** Muhammad Ismail Rana (F2023-551), Ramsha Naveed (F2023-027), Sara Haider (F2023-744), Sheikh Muhammad Ibrahim (F2023-630)
**Document Status:** Stage 1 Only — Awaiting Approval Before Stage 2
**Date:** 2026-08-04

---

> [!IMPORTANT]
> This is the **mandatory first response only**. It does not contain the final SRS, sprint files, or UML diagrams. Those are produced in Stages 2–6 after your approval.

---

## A. Materials Inspected

| # | Item | Type | Location | Size | Assessed |
|---|------|------|----------|------|----------|
| 1 | `README.md` | Documentation | `/README.md` | 17 KB | Read fully |
| 2 | `1. SRS v1.md` | Requirements Doc | `/documents/1. SRS v1.md` | 52 KB, 1168 lines | Read fully |
| 3 | `pbl-management-system-prototype.html` | Single-file Prototype | `/prototype/` | 161 KB, 2514 lines | Read structure, screens, mock DB, routes |
| 4 | `backend/app/__init__.py` | Flask app factory | `/backend/app/` | 994 B | Read fully |
| 5 | `backend/app/config.py` | App config | `/backend/app/` | 213 B | Read fully |
| 6 | `backend/app/extensions.py` | PyMongo extension | `/backend/app/` | 52 B | Read fully |
| 7 | `backend/app/blueprints/auth/routes.py` | Auth endpoint | `/backend/app/blueprints/auth/` | 1.6 KB | Read fully |
| 8 | `backend/app/blueprints/manager/students.py` | Manager students route | `/backend/app/blueprints/manager/` | 486 B | Read fully |
| 9 | `backend/app/blueprints/manager/groups.py` | Manager groups route | `/backend/app/blueprints/manager/` | 457 B | Read fully |
| 10 | `backend/app/blueprints/student/groups.py` | Student groups route | `/backend/app/blueprints/student/` | 438 B | Read fully |
| 11 | `backend/app/utils/responses.py` | Response helpers | `/backend/app/utils/` | 333 B | Read fully |
| 12 | `backend/app/utils/error_handlers.py` | Error handlers | `/backend/app/utils/` | 303 B | Read fully |
| 13 | `backend/requirements.txt` | Python deps | `/backend/` | 392 B | Read fully |
| 14 | `backend/wsgi.py` | WSGI entry | `/backend/` | 109 B | Read fully |
| 15 | `backend/Dockerfile` | Backend Docker | `/backend/` | 317 B | Read fully |
| 16 | `backend/.env` | **Live secrets file** | `/backend/` | 272 B | **SECURITY ISSUE — see E1** |
| 17 | `backend/.env.example` | Env template | `/backend/` | 184 B | Read fully |
| 18 | `frontend/package.json` | Frontend deps | `/frontend/` | 749 B | Read fully |
| 19 | `frontend/src/App.jsx` | React root | `/frontend/src/` | 3.6 KB | Read fully |
| 20 | `frontend/Dockerfile` | Frontend Docker | `/frontend/` | 162 B | Read fully |
| 21 | `docker-compose.yml` | Compose config | `/` | 841 B | Read fully |
| 22 | `CONTRIBUTING.md` | Git guide | `/` | 1 KB | Read fully |
| 23 | `.gitignore` | Git ignore rules | `/` | 302 B | Read fully |
| 24 | `.github/PULL_REQUEST_TEMPLATE.md` | PR template | `/.github/` | **0 bytes — completely empty** | Read fully |

### Directories Confirmed Empty (No Files Inside)

| Directory | Expected Contents | Status |
|-----------|------------------|--------|
| `backend/app/models/` | MongoDB schemas for 14+ collections | **Empty** |
| `backend/app/services/` | Business logic services | **Empty** |
| `backend/app/middleware/` | JWT/auth middleware | **Empty** |
| `backend/tests/` | pytest test files | **Empty** |
| `backend/postman/` | Postman collection JSON | **Empty** |
| `backend/seed/` | Database seed scripts | **Empty** |

---

## B. Materials Missing or Unreadable

| Missing Item | Expected Location | Impact |
|-------------|-------------------|--------|
| GitHub Actions CI workflows | `/.github/workflows/` (directory does not exist) | CI/CD completely unconfigured despite README and SRS describing it |
| Frontend `.env.example` | `/frontend/.env.example` | Frontend API URL undocumented |
| Postman collection | `/backend/postman/` | Required by Definition of Done; none exists |
| Seed scripts | `/backend/seed/` | No way to bootstrap manager account |
| Test files | `/backend/tests/` | Empty despite pytest installed |
| MongoDB models | `/backend/app/models/` | Zero model implementations for 14+ collections in SRS |
| `@role_required` decorator | `/backend/app/utils/decorators.py` | Called "non-negotiable" in SRS; does not exist |
| `gunicorn_conf.py` | `/backend/` | Referenced in README systemd service; missing |
| `CHANGELOG.md` | `/` | Listed in README directory structure; not present |
| `LICENSE` | `/` | Listed in README directory structure; not present |
| Frontend routing | `/frontend/src/` | `App.jsx` is default Vite template — no routing |
| Frontend components | `/frontend/src/` | Only Vite template files exist |
| SRS v2 | `/documents/` | SRS v1 has multiple TBD items and Superior University references |
| `gunicorn_conf.py` | `/backend/` | Referenced in README; missing |

---

## C. Current Project Understanding

The PBL Management System is a **web-based Final Year Project lifecycle management platform** for Beaconhouse National University. It replaces informal email and spreadsheet workflows with a structured digital system covering: group formation, iterative submissions, rubric-based evaluation, surveys, and departmental/institutional oversight.

### Roles (6 total)

| Role | Access Level | Primary Workflow |
|------|-------------|-----------------|
| PBL Manager | Full admin — CRUD on everything | Enroll students/teachers, approve groups, manage iterations/surveys/announcements |
| Student | Scoped to own account | Create/join groups, submit work, fill surveys |
| Evaluator | Scoped to assigned groups only | Score rubrics per iteration, log meetings, exhibition evaluation |
| HOD | Read-only, department-scoped | View groups and reports for own department |
| HOD I&C | Read-only, department-scoped | Same permissions as HOD, separate account |
| Dean | Read-only, university-wide | Cross-department summaries, students without groups |

### Technology Stack (Confirmed from Code)

| Layer | Technology | Installed / Configured | In Use |
|-------|-----------|------------------------|--------|
| Backend framework | Python 3.11 + Flask 2.3.3 + Blueprints | Yes | Partially |
| Backend auth | Flask-JWT-Extended 4.7.4 | Yes | Login route only |
| MongoDB driver | Flask-PyMongo 2.3.0 + PyMongo 4.15.5 | Yes | Login query only |
| Input validation | marshmallow 3.20.1 | Installed | Not used |
| Password hashing | bcrypt 4.0.1 | Installed | Not used |
| Frontend framework | React 19.2.7 + Vite 8.1.1 | Yes | Default starter only |
| Frontend routing | React Router DOM 7.18.2 | Installed | Not configured |
| Frontend HTTP | Axios 1.18.1 | Installed | Not used |
| Frontend styling | Tailwind CSS 4.3.3 | Installed | Not configured |
| Database | MongoDB Atlas (live URI in .env) | Connected | Partially |
| Containers | Docker + Docker Compose | Configured | Functional |

### Prototype Assessment

The prototype is a **single-file, high-fidelity, in-memory HTML/JavaScript application** that simulates all seven dashboards. It contains:

- Full Login screen with demo account autofill for all 7 user types
- Manager: dashboard (stat cards + announcements + attachments), students CRUD (individual + bulk import + recycle bin), departments CRUD, courses CRUD, teachers CRUD, groups management (approve/delete), evaluator assignment, iterations management, rubrics builder, survey management, survey reports, group reports, iteration reports
- Student: dashboard, create group, my group (with join requests), browse groups, iterations list, iteration detail with submission, survey list, fill survey
- Evaluator: dashboard, assigned groups, rubric scoring sheet (per group per iteration), exhibition evaluation, meetings list, add meeting
- HOD / HOD I&C / Dean: dashboards with stat cards, group tables, group reports, iteration reports
- Global: change password modal, logout confirmation, toast notifications, loading skeletons, empty states, mobile-responsive sidebar

> [!NOTE]
> The prototype footer shows "SUPERIOR UNIVERSITY · PBL PORTAL" and all emails use `@SUPERIOR.EDU.PK`. The README acknowledges Superior University as the original prototype source. BNU-specific branding and domain adaptation is required for the actual implementation.

---

## D. Existing Implementation Status

### Backend

| Feature | Status | Notes |
|---------|--------|-------|
| Flask app factory + blueprint architecture | Implemented | `app/__init__.py` |
| CORS | Configured | Open wildcard — no origin restriction |
| JWT initialization | Configured | `JWTManager` in `__init__.py` |
| MongoDB connection | Configured | Live Atlas URI in `.env` |
| Structured error handlers (404, 500) | Implemented | `utils/error_handlers.py` |
| Standardized response envelope | Implemented | `utils/responses.py` — `{success, message, data}` |
| Login endpoint | Partially implemented | Plaintext password comparison (no bcrypt); no manager lookup |
| Manager students endpoint | Placeholder | Returns hardcoded `{"id":"temp"}` |
| Manager groups endpoint | Placeholder | Returns hardcoded empty array |
| Student groups endpoint | Placeholder | Returns hardcoded empty array |
| `@role_required` decorator | **Missing** | SRS calls it "non-negotiable"; does not exist |
| All other blueprints (teachers, departments, courses, iterations, evaluations, surveys, etc.) | **Missing** | Not created |
| MongoDB models/schemas | **Missing** | Empty `models/` directory |
| Services layer | **Missing** | Empty `services/` directory |
| Middleware | **Missing** | Empty `middleware/` directory |
| Input validation | **Missing** | marshmallow installed, not used |
| bcrypt password hashing | **Missing** | bcrypt installed, not used |
| Audit logging | **Missing** | |
| Manager account seed | **Missing** | No way to log in as manager |
| Unit tests | **Missing** | Empty test directory |
| Postman collection | **Missing** | Empty postman directory |
| GitHub Actions CI | **Missing** | No `.github/workflows/` directory |

### Frontend

| Feature | Status | Notes |
|---------|--------|-------|
| Vite + React project scaffolding | Exists | `package.json`, `vite.config.js` |
| Docker support | Configured | `frontend/Dockerfile` |
| React Router DOM | Installed | Not configured |
| Tailwind CSS | Installed | Not configured |
| Axios | Installed | Not used |
| Any actual pages or components | **Missing** | `App.jsx` is Vite welcome screen |
| Login page | **Missing** | |
| Role-based routing | **Missing** | |
| Authentication context | **Missing** | |
| API service layer | **Missing** | |
| Any UI resembling the prototype | **Missing** | |

### Infrastructure

| Item | Status |
|------|--------|
| `docker-compose.yml` (backend + frontend + mongo) | Functional |
| Backend `Dockerfile` | Functional |
| Frontend `Dockerfile` | Functional |
| `.gitignore` | Present and correct |
| `CONTRIBUTING.md` | Minimal but present |
| `.github/PULL_REQUEST_TEMPLATE.md` | Empty (0 bytes) |
| GitHub Actions workflow | Missing |

---

## E. Critical Problems and Risks

Ordered from most severe to least.

---

### E1 — CRITICAL SECURITY: Live MongoDB Atlas Credentials in `.env`

**File:** `backend/.env`, line 5

The live MongoDB Atlas connection string — including username `ismailrizwanrana_db_user` and password — is present in `backend/.env`. Although `.env` is listed in `.gitignore`, the file may have been committed before `.gitignore` was applied, meaning credentials may be in Git history.

**Immediate actions required (before anything else):**
1. Log into MongoDB Atlas and **rotate the password for `ismailrizwanrana_db_user` immediately**
2. Run `git log --all --full-history -- backend/.env` to check if `.env` was ever committed
3. If committed, use `git filter-repo` to remove it from history; force-push; notify all team members to re-clone
4. Update `.env` with the new password locally; never commit it again

---

### E2 — CRITICAL: Passwords Compared in Plaintext

**File:** `backend/app/blueprints/auth/routes.py`, line 31
**Code:** `if user.get('password') != password:`

The code comment even says "add bcrypt later." bcrypt must be implemented before any real user accounts are created in the database. Any student added right now would have their password stored and compared in plaintext.

---

### E3 — CRITICAL: Manager Cannot Log In

The login route searches `students`, then `teachers`. There is no manager collection and no seed script. The manager — the most important user in the system — cannot authenticate through the actual API.

---

### E4 — CRITICAL: `@role_required` Decorator Does Not Exist

The SRS states this is "non-negotiable." Without it, any authenticated user (regardless of role) can call any endpoint once real logic is added. This must be built before any business logic is added to any route.

---

### E5 — CRITICAL: All Business Logic Is Placeholder

Every route except login returns hardcoded mock responses. The backend cannot create, read, update, or delete any real data.

---

### E6 — CRITICAL: Frontend Is the Vite Default Starter

`App.jsx` is the Vite template welcome screen. Zero UI has been built.

---

### E7 — HIGH: No MongoDB Data Models

The `models/` directory is empty. The SRS defines 14+ collections with detailed schemas. Without agreed-upon models, each developer will write inconsistent database documents.

---

### E8 — HIGH: CORS Is Open Wildcard

`CORS(app)` allows requests from any domain. Must be restricted to the Vercel frontend domain in production.

---

### E9 — HIGH: No Tests + No Role Enforcement = No Safety Net

There is no automated way to verify security boundaries. Features merged now are untested and unprotected.

---

### E10 — HIGH: Docker Compose Loads the `.env` File With Live Credentials

`docker-compose.yml` directly references `./backend/.env` via `env_file`. Until credentials are rotated and properly managed, this exposes the live connection string to anyone running docker-compose.

---

### E11 — MEDIUM: README Clone URL Is Wrong

README says `github.com/ismailrzw/pbl-management-system` but the actual repo is `erp-management-system`.

---

### E12 — MEDIUM: PR Template Is Empty

`.github/PULL_REQUEST_TEMPLATE.md` is 0 bytes. Every PR opens blank.

---

### E13 — MEDIUM: No GitHub Actions CI

No `.github/workflows/` directory exists. No automated quality gate on PRs.

---

### E14 — MEDIUM: `wsgi.py` Runs Flask With `debug=True`

Should be `False` or environment-controlled to prevent running the debug server in production.

---

### E15 — MEDIUM: Superior University Branding in Prototype

All email domains, footer text, and credential references in the prototype use Superior University. These must be adapted to `@bnu.edu.pk` in the implementation.

---

### E16 — MEDIUM: `venv/` Is Inside the Backend Directory

Even if not committed, it risks accidental staging and adds confusion. Should be outside the repository or in a clearly excluded path.

---

### E17 — MEDIUM: `__pycache__/` May Be in Repository

Python bytecode directories are present. Verify they are excluded from Git tracking.

---

## F. Contradictions and Gaps

| ID | Source A | Source B | Contradiction | Impact | Decision Required |
|----|----------|----------|---------------|--------|-------------------|
| C-01 | SRS §8.1: bcrypt mandatory | `auth/routes.py` line 31: plaintext | Functionally insecure | High | Fix immediately |
| C-02 | README: `manager@bnu.edu.pk` | Prototype: `manager@superior.edu.pk` | Two email domains | Medium | Decide on `@bnu.edu.pk` |
| C-03 | README: repo is `pbl-management-system` | Actual: `erp-management-system` | Wrong clone URL | Low | Update README |
| C-04 | SRS §3.1 FR-1.3: `@role_required` is non-negotiable | Codebase: decorator missing | Role enforcement absent | High | Implement first |
| C-05 | README: `Flask-PyMongo 2.3.0` | requirements.txt: `pymongo==4.15.5` | Flask-PyMongo 2.3.0 targets PyMongo 3.x; may have breaking changes with 4.x | Medium | Verify; consider upgrading Flask-PyMongo |
| C-06 | SRS §2.2: Students log in with `ROLL@SUPERIOR.EDU.PK` | BNU context requires `@bnu.edu.pk` | Wrong domain in requirements | Medium | Confirm BNU domain |
| C-07 | SRS §7.3: endpoint `POST /manager/students` | `__init__.py`: registered as `/api/manager/students/` (trailing slash) | Flask treats these differently | Low | Standardize; remove trailing slashes |
| C-08 | README: `PyJWT 2.8.0` in stack table | requirements.txt: `PyJWT==2.13.0`, via `Flask-JWT-Extended` | README stack table inaccurate | Low | Update README |
| C-09 | CONTRIBUTING.md: `config.py` uses `SECRET_KEY` | Actual `config.py`: uses `JWT_SECRET_KEY` | Documentation inconsistency | Low | Update CONTRIBUTING.md |
| C-10 | docker-compose.yml: MongoDB with no auth | `.env.example`: `admin:secret@mongodb:27017?authSource=admin` | Compose mongo has no root credentials set | Medium | Add Mongo auth to compose |
| C-11 | SRS §3.6 FR-6.2: surveys have `publishedAt` field | Data model: no `status: draft/published` field | Published vs draft surveys undefined | Medium | Add `status` field to surveys |
| C-12 | SRS FR-3.7: group delete is "hard-delete (TBD)" | No decision recorded | Hard or soft delete for groups unresolved | Medium | Confirm: hard-delete or soft-delete |
| C-13 | HOD I&C described identically to HOD | README and SRS list same permissions | Role may be unnecessary | Optional | Confirm whether BNU has this role |
| C-14 | SRS §3.3 FR-3.8: one-student-one-group enforced at DB level | No indexes or models exist yet | Constraint cannot be enforced | High | Create unique/compound indexes |
| C-15 | SRS §9.2: "Render auto-deploys `develop` branch" | No CI/CD pipeline exists | Deployment cannot auto-deploy | Medium | Create CI/CD first |

---

## G. Recommended Documentation and Development Order

```
IMMEDIATE   → Rotate MongoDB credentials (security emergency)
IMMEDIATE   → Fix login: bcrypt + manager lookup
STAGE 1     → This document — team reviews and approves
STAGE 2     → Foundation Approval Package (scope, roles, architecture, DB schema, API contracts)
SPRINT 0    → Foundation code: @role_required, seed, indexes, frontend routing, AuthContext, CI
SPRINT 1    → Manager Dashboard (departments, courses, teachers, students, announcements)
SPRINT 2    → Group Formation (create, browse, join, approve, leave)
SPRINT 3    → Iterations and Submissions (manager creates, students submit)
SPRINT 4    → Evaluator Dashboard (rubric scoring, meetings, exhibition)
SPRINT 5    → HOD and Dean Dashboards (read-only oversight)
SPRINT 6    → Surveys and Reports (parallel to Sprints 3-5 if capacity allows)
SPRINT 7    → Integration, prototype fidelity, polish
SPRINT 8    → Security hardening, full test suite
SPRINT 9    → Staging and university deployment
```

---

## H. Minimum Files to Create First

No feature PR should be merged until all P0 and P1 files exist.

| Priority | File Path | Purpose | Owner | Depends On |
|----------|-----------|---------|-------|------------|
| P0 | `backend/app/utils/decorators.py` | `@role_required` decorator | Ismail | Nothing |
| P0 | `backend/seed/seed_manager.py` | Create seeded manager account | Ismail | bcrypt fix |
| P0 | Fix `backend/app/blueprints/auth/routes.py` | bcrypt + manager lookup | Ismail | Seed script |
| P0 | Rotate MongoDB Atlas password | Security | Ismail | External |
| P1 | `backend/app/utils/validators.py` | Shared input validation helpers | Ibrahim | Nothing |
| P1 | `backend/app/utils/audit.py` | Audit log utility for mutations | Ibrahim | MongoDB |
| P1 | `frontend/src/main.jsx` (updated) | Add BrowserRouter | Ramsha | Nothing |
| P1 | `frontend/src/context/AuthContext.jsx` | Current user + token state | Ramsha | Router |
| P1 | `frontend/src/services/api.js` | Axios instance + Bearer interceptor | Ramsha | AuthContext |
| P1 | `frontend/src/pages/LoginPage.jsx` | Login UI — entry point | Sara | api.js |
| P1 | `frontend/src/layouts/DashboardLayout.jsx` | Shared navbar + sidebar shell | Ramsha | AuthContext |
| P1 | `frontend/.env.example` | Documents `VITE_API_URL` | Ramsha | Nothing |
| P2 | `.github/workflows/ci.yml` | Lint + test gate on PRs | Ismail | Tests exist |
| P2 | `.github/PULL_REQUEST_TEMPLATE.md` (filled) | Enforce review standards | Ismail | Nothing |
| P2 | MongoDB index definitions (in seed) | Enforce data constraints efficiently | Ismail | Seed script |
| P2 | `backend/gunicorn_conf.py` | Production WSGI config | Ismail | Nothing |

---

## I. Proposed Sprint Structure

Sprints are **milestone-based, not time-based**. A sprint is complete only when all acceptance criteria and the Definition of Done are met.

### Sprint 0 — Foundation and Security
**Prerequisite for all other sprints.**

Deliverables: Rotate credentials; fix login (bcrypt + manager); implement `@role_required`; seed manager account; define MongoDB indexes; configure frontend routing + AuthContext + API service + shared layout skeleton; fill PR template; create CI workflow; finalize SRS v2 (BNU domain, role clarifications); approve API contract and database schema documents.

**Why first:** No feature can be safely built without authentication, authorization, and a shared contract. Building features before these exist causes security holes and expensive rework.

---

### Sprint 1 — Manager Dashboard
**Depends on: Sprint 0**

Deliverables: Manager login (real bcrypt + JWT); Department CRUD; Course CRUD; Teacher CRUD; Student CRUD (individual add, view with filters, soft-delete, restore, bulk import); Manager dashboard (stat cards, announcements, attachments); Manager sidebar navigation.

**Why before Student sprint:** Students, courses, and departments must exist before groups can be formed.

---

### Sprint 2 — Group Formation
**Depends on: Sprint 1**

Deliverables: Student login + dashboard; Create group; Browse groups (course+section scoped); Send join request; Leader accept/reject join request (with race-condition guard); Leave group (leadership transfer); Manager: view, approve, delete groups; Manager: assign evaluators to groups; One-student-one-group constraint enforced.

**Why before Evaluator sprint:** Evaluators cannot score groups that do not exist and are not assigned.

---

### Sprint 3 — Iterations and Submissions
**Depends on: Sprint 2**

Deliverables: Manager creates iterations with deadline; Manager attaches rubrics (weighted, 0–5 levels); Student views iterations; Student submits work (file + note, late flagging); Submission status tracking.

**Why before Evaluation sprint:** Evaluators score submissions, which must exist first.

---

### Sprint 4 — Evaluator Dashboard and Scoring
**Depends on: Sprints 2, 3**

Deliverables: Evaluator login + dashboard; Assigned groups list; Rubric scoring sheet per iteration (locked after submit); Exhibition evaluation (locked after submit); Meeting log (create, view).

---

### Sprint 5 — HOD and Dean Dashboards
**Depends on: Sprints 2, 3, 4**

Deliverables: HOD dashboard (dept-scoped group table, status charts, PDF export); HOD I&C dashboard (same); Dean dashboard (university-wide dept breakdown, students-without-group list, PDF export).

---

### Sprint 6 — Surveys and Announcements
**Depends on: Sprint 1; can run parallel to Sprints 3–5**

Deliverables: Manager creates/views surveys; Students fill surveys (idempotent); Manager views survey reports (charts + stats); Announcements (if not completed in Sprint 1).

---

### Sprint 7 — Integration, Prototype Fidelity, and Polish
**Depends on: Sprints 1–6**

Deliverables: End-to-end workflow verification; Prototype fidelity review (every screen matched); Error states, empty states, loading skeletons on all pages; Mobile responsiveness; Audit log review.

---

### Sprint 8 — Security Hardening and Testing
**Depends on: Sprint 7**

Deliverables: CORS restricted to specific origins; marshmallow validation on all endpoints; NoSQL injection review; DOMPurify for rich text; Rate limiting on login; Full pytest unit test suite; API integration tests; Role-permission boundary tests; Lighthouse ≥ 80.

---

### Sprint 9 — Staging Deployment and University Migration
**Depends on: Sprint 8**

Deliverables: Backend on Render; Frontend on Vercel; Atlas M0 connected; Cloudinary configured; University server deployment guide (Nginx + Gunicorn + systemd); Environment variable matrix for all environments; Rollback procedure; Final acceptance testing.

---

## J. Blocking Clarification Questions

### BQ-01 — BLOCKING (Security)
**Have the MongoDB Atlas credentials in `backend/.env` been rotated?**

The live connection string with username `ismailrizwanrana_db_user` must be invalidated immediately. Confirm: (a) password rotated in Atlas, (b) `.env` was never committed to Git history (or history has been cleaned).

---

### BQ-02 — BLOCKING (Architecture)
**What is the correct institutional email domain for BNU students and staff?**

The prototype uses `@SUPERIOR.EDU.PK`. The README uses `@bnu.edu.pk`. This affects: student email auto-generation format, manager/HOD/Dean account emails, and login instructions shown to users.

Confirm the correct domain (e.g., `@bnu.edu.pk`).

---

### BQ-03 — BLOCKING (Architecture)
**Is HOD I&C a real role at BNU, or should it be removed?**

If BNU does not have a Head of Innovation & Coordination, this role adds code complexity with zero benefit. Removing it simplifies the RBAC matrix and reduces development effort.

Answer: Does BNU actually have this role? If yes, describe their specific responsibilities different from HOD.

---

### BQ-04 — BLOCKING (Data Model)
**How should the manager account be stored?**

The login route currently searches `students` then `teachers`. The manager is in neither collection.

Options:
- **A (Recommended):** A single `users` collection with a `role` field covering all user types. Login searches `users` only, using the `role` field for RBAC.
- **B:** A separate `managers` collection with one seeded document.
- **C (Not recommended):** Hardcoded credentials in config.

Which approach should be used? Option A is recommended because it avoids searching multiple collections on every login.

---

### BQ-05 — BLOCKING (Scope)
**Should Cloudinary file upload be implemented in Sprint 1, or deferred?**

Student bulk import (Excel/CSV), submission file uploads, and announcement attachments all require Cloudinary. Setting up Cloudinary is an additional dependency.

Answer: Should Sprint 1 include real file upload with Cloudinary, or should a placeholder be used (accept the file, return a mock URL) until Sprint 3?

---

### BQ-06 — IMPORTANT (Team)
**Confirm current team work assignments.**

The README Phase 3 table shows Sara owns group backend endpoints and Ramsha owns group UI. Are these assignments still current, or has the team reorganized?

Answer: Who currently owns (a) backend routes, (b) frontend pages, (c) testing, (d) documentation review?

---

### BQ-07 — IMPORTANT (Deployment)
**Have Render, Vercel, and MongoDB Atlas accounts been created?**

Knowing whether cloud accounts exist prevents Sprint 9 from being blocked at the last moment.

---

### BQ-08 — IMPORTANT (Prototype)
**Should email sending (credential emails to students on import) be real or mocked in Sprint 1?**

Real email requires SMTP credentials. Mocking in development is faster and avoids SMTP setup risk for Sprint 1.

Answer: Mock email in Sprint 1 and configure SMTP later, or set up SMTP (e.g., Gmail App Password or SendGrid) from the start?

---

### BQ-09 — OPTIONAL
**Should the Manager have access to Group and Iteration reports, or only oversight roles?**

The prototype Manager sidebar includes "Group Reports" and "Iteration Reports" links. The SRS places reports under oversight (HOD/Dean). Confirm whether the Manager can also view these reports.

---

### BQ-10 — OPTIONAL
**Should group deletion be hard-delete or soft-delete?**

SRS FR-3.7 says hard-delete but marks soft-delete as "TBD." If a manager accidentally deletes a legitimate group, hard-delete is unrecoverable. Soft-delete is safer for an academic context.

Confirm: hard-delete (simpler, irreversible) or soft-delete (recoverable)?

---

## Stage 1 Summary

### What Has Been Confirmed
- Technology stack (Flask + React + MongoDB Atlas + Docker) is appropriate for the project size
- The prototype is a complete, high-fidelity UI reference for all screens
- The SRS v1 is detailed, covering all 10 modules with full API contracts and data models
- The dependency-safe sprint order (Sprint 0 → Sprint 9) is structurally sound
- The Git workflow (feature/* → develop → main) is correctly defined
- Docker Compose infrastructure is functional

### What Remains Uncertain
- Correct BNU email domain (BQ-02)
- Whether HOD I&C is a real BNU role (BQ-03)
- Manager account storage pattern (BQ-04)
- Cloudinary timing for file uploads (BQ-05)
- Current team assignments (BQ-06)

### What Must Be Approved Before Stage 2
1. Immediate: rotate MongoDB Atlas credentials (BQ-01)
2. Confirm BNU email domain (BQ-02)
3. Confirm HOD I&C role status (BQ-03)
4. Confirm manager account storage approach (BQ-04)
5. Approve the Sprint 0–9 structure in Section I
6. Confirm Cloudinary timing (BQ-05)

### What Will Be Built in Stage 2
Once this Stage 1 document is approved and blocking questions answered, Stage 2 will deliver:
- Confirmed project scope and system boundary
- Finalized role definitions with BNU-specific details
- Complete recommended directory structure with migration steps
- Full database schema (all 14+ collections with indexes)
- Complete API contract document (all endpoints with request/response examples)
- Sprint 0 detailed execution document (exact tasks, owners, acceptance criteria)
- Foundation files with exact code content

---

*End of Stage 1 — Initial Response*

*Next step: Team reviews this document, answers BQ-01 through BQ-05, and clicks Proceed to approve Stage 2.*
