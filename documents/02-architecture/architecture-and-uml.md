# Architecture and UML Design Package
## PBL Management System · Beaconhouse National University
**Version:** 1.0
**Date:** 2026-08-05

---

## 1. System Architecture Overview

The PBL Management System follows a **3-tier client-server architecture** with a REST API separating the frontend from the backend.

```
┌─────────────────────────────────────────────────┐
│            PRESENTATION TIER (React)             │
│  Browser SPA — renders pages based on route      │
│  Role-based routing via React Router             │
│  Tailwind CSS styling                            │
│  No business logic — only display + user input   │
└──────────────────────┬──────────────────────────┘
                       │ HTTPS REST (JSON)
                       │ Authorization: Bearer <jwt>
┌──────────────────────▼──────────────────────────┐
│            APPLICATION TIER (Flask)              │
│  Blueprint-based route handlers                  │
│  @role_required — all endpoints protected        │
│  marshmallow — input validation                  │
│  Business logic in services/                     │
│  Audit logging via log_audit()                   │
│  JWT issued on login, verified on every request  │
└──────────────────────┬──────────────────────────┘
                       │ PyMongo driver
                       │ MongoDB Wire Protocol
┌──────────────────────▼──────────────────────────┐
│            DATA TIER (MongoDB Atlas)             │
│  16 collections                                  │
│  Unique/compound indexes for constraints         │
│  No stored procedures — all logic in Flask       │
└─────────────────────────────────────────────────┘
        │                         │
   File Storage             External Email
   (Cloudinary)             (SMTP / mocked)
```

---

## 2. Use-Case Diagram

```mermaid
graph TD
    subgraph System["PBL Management System"]
        UC01(["Login"])
        UC02(["Change Password"])
        UC03(["Manage Departments"])
        UC04(["Manage Courses"])
        UC05(["Manage Teachers"])
        UC06(["Add Student (Individual)"])
        UC07(["Bulk Import Students"])
        UC08(["View/Edit/Delete Students"])
        UC09(["Restore from Recycle Bin"])
        UC10(["View Dashboard"])
        UC11(["Post Announcement"])
        UC12(["Upload Attachment"])
        UC13(["Create Group"])
        UC14(["Browse Groups"])
        UC15(["Send Join Request"])
        UC16(["Cancel Join Request"])
        UC17(["Accept Join Request"])
        UC18(["Reject Join Request"])
        UC19(["Leave Group"])
        UC20(["Approve Group"])
        UC21(["Delete Group"])
        UC22(["Assign Evaluator to Group"])
        UC23(["Create Iteration"])
        UC24(["Attach Rubrics to Iteration"])
        UC25(["Edit/Delete Iteration"])
        UC26(["View Iterations"])
        UC27(["Submit Iteration Work"])
        UC28(["Score Rubric"])
        UC29(["Submit Exhibition Score"])
        UC30(["Log Meeting"])
        UC31(["View Meetings"])
        UC32(["Create Survey"])
        UC33(["Publish Survey"])
        UC34(["Fill Survey"])
        UC35(["View Survey Report"])
        UC36(["View Group Table (HOD)"])
        UC37(["View Department Dashboard"])
        UC38(["View University Dashboard"])
        UC39(["View Students Without Group"])
        UC40(["View Group Reports"])
        UC41(["View Iteration Reports"])
        UC42(["View Audit Log"])
    end

    Manager["PBL Manager"]
    Student["Student"]
    Evaluator["Evaluator"]
    HOD["HOD / HOD I&C"]
    Dean["Dean"]
    AnyUser["Any Authenticated User"]

    Manager --> UC01 & UC02 & UC03 & UC04 & UC05 & UC06 & UC07 & UC08 & UC09
    Manager --> UC10 & UC11 & UC12 & UC20 & UC21 & UC22 & UC23 & UC24 & UC25
    Manager --> UC32 & UC33 & UC35 & UC40 & UC41 & UC42
    Student --> UC01 & UC02 & UC13 & UC14 & UC15 & UC16 & UC17 & UC18 & UC19
    Student --> UC26 & UC27 & UC34
    Evaluator --> UC01 & UC02 & UC28 & UC29 & UC30 & UC31
    HOD --> UC01 & UC02 & UC36 & UC37 & UC40 & UC41
    Dean --> UC01 & UC02 & UC38 & UC39 & UC40 & UC41
    AnyUser --> UC12
```

---

## 3. Sequence Diagrams

### SD-01: Successful Login Flow

```mermaid
sequenceDiagram
    participant Browser
    participant LoginPage as LoginPage.jsx
    participant Axios as api.js (Axios)
    participant Flask as Flask /auth/login
    participant MongoDB

    Browser->>LoginPage: User submits email + password
    LoginPage->>Axios: api.post('/auth/login', {email, password})
    Axios->>Flask: POST /api/auth/login {email, password}
    Flask->>MongoDB: db.users.find_one({email, deleted: {$ne: true}})
    MongoDB-->>Flask: user document or null
    alt User not found
        Flask-->>Axios: 401 {success: false, message: "Invalid email or password."}
        Axios-->>LoginPage: throws error
        LoginPage-->>Browser: Show error message
    else User found
        Flask->>Flask: bcrypt.checkpw(password, user.password_hash)
        alt Password wrong
            Flask-->>Axios: 401 {success: false, message: "Invalid email or password."}
            Axios-->>LoginPage: throws error
            LoginPage-->>Browser: Show error message
        else Password correct
            Flask->>Flask: create_access_token(identity, claims={role, dept, ...})
            Flask-->>Axios: 200 {success: true, data: {token, user}}
            Axios-->>LoginPage: response.data
            LoginPage->>LoginPage: login(user, token) → store in localStorage
            LoginPage->>Browser: navigate to ROLE_HOME[user.role]
        end
    end
```

---

### SD-02: Create Group with One-Student-One-Group Check

```mermaid
sequenceDiagram
    participant Browser
    participant React as CreateGroupPage.jsx
    participant Axios
    participant Flask as /api/student/groups
    participant MongoDB

    Browser->>React: Student fills group name and clicks Create
    React->>Axios: api.post('/student/groups', {name})
    Axios->>Flask: POST /api/student/groups + Bearer token
    Flask->>Flask: @role_required("student") — verify JWT
    Flask->>Flask: Extract student_id, course, section, dept from JWT claims
    Flask->>MongoDB: db.groups.find_one({member_ids: student_id, course: course})
    MongoDB-->>Flask: existing group or null
    alt Student already in a group
        Flask-->>Axios: 409 {message: "You are already a member of a group in this course."}
        Axios-->>React: throws error
        React-->>Browser: Show error toast
    else Student not in any group
        Flask->>MongoDB: db.groups.insert_one({name, course, section, dept, leader_id, member_ids: [student_id], status: "pending", version: 1})
        MongoDB-->>Flask: inserted_id
        Flask->>Flask: log_audit(entity="groups", action="create")
        Flask-->>Axios: 201 {success: true, data: {group}}
        Axios-->>React: success response
        React-->>Browser: Show success toast; redirect to /student/groups/my
    end
```

---

### SD-03: Join Request Race Condition Guard (Optimistic Locking)

```mermaid
sequenceDiagram
    participant Leader as Leader Browser
    participant Flask as /api/student/groups/my/join-requests/:id/accept
    participant MongoDB

    Note over Leader, MongoDB: Two leaders try to accept simultaneously
    Leader->>Flask: PATCH accept join_request_id (version=1 expected)
    Flask->>MongoDB: db.groups.find_one({_id: group_id})
    MongoDB-->>Flask: {version: 1, member_ids: [leader], ...}
    Flask->>Flask: Check member_count < max_group ✓
    Flask->>MongoDB: db.groups.update_one(<br/>{_id: group_id, version: 1},<br/>{$push: {member_ids: student_id},<br/> $inc: {version: 1}})
    MongoDB-->>Flask: matched_count: 1
    Note over Flask: First accept succeeds
    Flask->>MongoDB: Set join_request to "accepted"
    Flask->>MongoDB: Cancel all other pending requests for this student in this course
    Flask-->>Leader: 200 OK — Student added to group

    Note over Leader, MongoDB: If a second concurrent accept arrives after version changed:
    Flask->>MongoDB: update_one({_id: group_id, version: 1}) ← version is now 2
    MongoDB-->>Flask: matched_count: 0
    Flask-->>Leader: 409 Conflict — "Group was updated concurrently. Please retry."
```

---

### SD-04: Evaluation Submission with Immutability

```mermaid
sequenceDiagram
    participant Evaluator as Evaluator Browser
    participant Flask as /api/evaluator/evaluations
    participant MongoDB

    Evaluator->>Flask: POST /api/evaluator/evaluations {group_id, iteration_id, scores, comment}
    Flask->>Flask: @role_required("evaluator") — verify JWT
    Flask->>Flask: Extract evaluator_id from JWT identity
    Flask->>MongoDB: db.assignments.find_one({evaluator_id, group_id})
    MongoDB-->>Flask: assignment or null
    alt Not assigned
        Flask-->>Evaluator: 403 Forbidden
    else Is assigned
        Flask->>MongoDB: db.evaluations.find_one({group_id, iteration_id, evaluator_id})
        MongoDB-->>Flask: existing evaluation or null
        alt Already evaluated
            Flask-->>Evaluator: 409 Conflict — "You have already submitted an evaluation for this group and iteration."
        else First evaluation
            Flask->>Flask: Validate scores against rubric question IDs
            Flask->>Flask: Compute total_weighted_score
            Flask->>MongoDB: db.evaluations.insert_one({..., locked: true})
            MongoDB-->>Flask: inserted
            Flask->>Flask: log_audit(entity="evaluations", action="create")
            Flask-->>Evaluator: 201 Created — "Evaluation submitted and locked."
        end
    end
```

---

### SD-05: Bulk Student Import Flow

```mermaid
sequenceDiagram
    participant Manager as Manager Browser
    participant Flask as /api/manager/students/bulk
    participant StudentService as student_service.py
    participant EmailService as email_service.py
    participant MongoDB

    Manager->>Flask: POST multipart/form-data {file: students.xlsx}
    Flask->>Flask: @role_required("pbl_manager")
    Flask->>Flask: Validate file type (xlsx or csv)
    Flask->>Flask: Parse file → extract rows
    Flask->>Flask: Validate required columns exist
    loop For each row
        Flask->>StudentService: create_student(row_data)
        StudentService->>MongoDB: db.users.find_one({roll: row.roll})
        alt Roll already exists
            StudentService-->>Flask: {error: "Roll already exists", row: N}
        else Roll is new
            StudentService->>StudentService: Generate email = ROLL@bnu.edu.pk
            StudentService->>StudentService: Generate initial password
            StudentService->>StudentService: bcrypt.hashpw(password)
            StudentService->>MongoDB: db.users.insert_one(student_doc)
            StudentService->>EmailService: send_credentials(email, password, recovery_email)
            Note over EmailService: In dev: prints to console. In prod: sends via SMTP.
            StudentService-->>Flask: {success: true, student_id}
        end
    end
    Flask->>Flask: log_audit(entity="users", action="bulk_import")
    Flask-->>Manager: 201 {imported: N, skipped: M, errors: [...]}
```

---

## 4. Activity Diagram — Group Formation Lifecycle

```mermaid
stateDiagram-v2
    [*] --> StudentLogsIn: Student logs in

    StudentLogsIn --> ChecksGroup: Views My Group page
    ChecksGroup --> NotInGroup: No group found

    NotInGroup --> CreateGroup: Student creates group
    NotInGroup --> BrowseGroups: Student browses groups

    CreateGroup --> PendingGroup: Group created (status = pending)

    BrowseGroups --> SendJoinRequest: Student sends join request
    SendJoinRequest --> RequestPending: Request status = pending

    RequestPending --> LeaderReviews: Leader views join requests
    LeaderReviews --> AcceptRequest: Leader accepts
    LeaderReviews --> RejectRequest: Leader rejects

    RejectRequest --> BrowseGroups: Student can try another group
    AcceptRequest --> MemberAdded: Student added to group.member_ids
    MemberAdded --> OtherRequestsCancelled: All other pending requests auto-cancelled

    PendingGroup --> ManagerReviews: Manager views pending groups
    MemberAdded --> ManagerReviews: Group notified as ready

    ManagerReviews --> CheckMinSize: Manager checks member count >= course.min_group
    CheckMinSize --> NotEnoughMembers: Too few members
    CheckMinSize --> ApproveGroup: Enough members

    NotEnoughMembers --> ManagerReviews: Wait for more members

    ApproveGroup --> ApprovedGroup: status = approved
    ApprovedGroup --> EvaluatorAssigned: Manager assigns evaluator
    EvaluatorAssigned --> [*]: Group ready for iterations
```

---

## 5. Component Diagram — Backend Structure

```mermaid
graph TD
    subgraph Flask Application
        INIT["app/__init__.py<br/>App Factory"]
        CONFIG["app/config.py<br/>Config Class"]
        EXT["app/extensions.py<br/>PyMongo, JWT init"]

        subgraph Blueprints
            AUTH["auth/routes.py<br/>login, me, change-password"]
            MGR_STU["manager/students.py<br/>CRUD + bulk import"]
            MGR_DEPT["manager/departments.py"]
            MGR_COURSE["manager/courses.py"]
            MGR_TEACHER["manager/teachers.py"]
            MGR_GRP["manager/groups.py<br/>approve, delete"]
            MGR_ASN["manager/assignments.py"]
            MGR_ITER["manager/iterations.py<br/>+ rubrics"]
            MGR_SVY["manager/surveys.py<br/>+ publish + report"]
            MGR_ANN["manager/announcements.py<br/>+ attachments"]
            MGR_RPT["manager/reports.py"]
            STU_GRP["student/groups.py<br/>create, browse, join, leave"]
            STU_ITER["student/iterations.py<br/>view, submit"]
            STU_SVY["student/surveys.py<br/>view, respond"]
            EVL["evaluator/routes.py<br/>groups, evaluate, exhibition, meetings"]
            HOD["hod/routes.py<br/>dashboard, groups, reports"]
            DEAN["dean/routes.py<br/>dashboard, reports"]
        end

        subgraph Utils
            DEC["utils/decorators.py<br/>@role_required"]
            RSP["utils/responses.py<br/>success_response, error_response"]
            ERR["utils/error_handlers.py<br/>404, 500"]
            AUD["utils/audit.py<br/>log_audit()"]
            VAL["utils/validators.py<br/>shared validation"]
        end

        subgraph Services
            STU_SVC["services/student_service.py"]
            GRP_SVC["services/group_service.py"]
            EMAIL_SVC["services/email_service.py"]
            STORE_SVC["services/storage_service.py"]
        end

        subgraph Models
            MODELS["models/*.py<br/>Field constants, Status enums"]
        end
    end

    INIT --> Blueprints
    INIT --> EXT
    INIT --> CONFIG
    Blueprints --> DEC
    Blueprints --> RSP
    Blueprints --> AUD
    Blueprints --> Services
    Blueprints --> MODELS
    Services --> EXT
```

---

## 6. Component Diagram — Frontend Structure

```mermaid
graph TD
    MAIN["main.jsx<br/>ReactDOM.render"] --> APP["App.jsx"]
    APP --> AUTH_PROVIDER["AuthProvider<br/>context/AuthContext.jsx"]
    AUTH_PROVIDER --> ROUTER["AppRouter.jsx<br/>BrowserRouter + Routes"]

    ROUTER --> LOGIN["LoginPage.jsx<br/>pages/"]
    ROUTER --> LAYOUT["DashboardLayout.jsx<br/>layouts/"]
    LAYOUT --> SIDEBAR["Sidebar.jsx<br/>layouts/"]

    LAYOUT --> MGR_PAGES["Manager Pages<br/>pages/manager/"]
    LAYOUT --> STU_PAGES["Student Pages<br/>pages/student/"]
    LAYOUT --> EVL_PAGES["Evaluator Pages<br/>pages/evaluator/"]
    LAYOUT --> HOD_PAGES["HOD Pages<br/>pages/hod/"]
    LAYOUT --> DEAN_PAGES["Dean Pages<br/>pages/dean/"]

    MGR_PAGES & STU_PAGES & EVL_PAGES & HOD_PAGES & DEAN_PAGES --> COMMON["Common Components<br/>components/common/"]
    MGR_PAGES & STU_PAGES & EVL_PAGES & HOD_PAGES & DEAN_PAGES --> API_SVC["services/api.js<br/>Axios + interceptors"]

    API_SVC --> BACKEND["Flask REST API<br/>https://api.bnu-pbl.com"]

    LOGIN --> HOOK["useAuth()<br/>from AuthContext"]
    SIDEBAR --> HOOK
    LAYOUT --> HOOK
```

---

## 7. Deployment Architecture

### 7.1 Local Development

```
Developer Machine
├── Terminal 1: docker-compose up
│   ├── pbl-mongo (Docker) — localhost:27017
│   ├── pbl-backend (Docker) — localhost:5000
│   └── pbl-frontend (Docker) — localhost:5173
├── Browser: http://localhost:5173
└── Postman: http://localhost:5000/api
```

### 7.2 Staging / Cloud Deployment

```
GitHub Repository
    │
    ├── Push to `develop` branch
    │       │
    │       ├──▶ GitHub Actions CI runs:
    │       │       └── flake8 lint (backend)
    │       │       └── eslint lint (frontend)
    │       │       └── pytest tests (backend)
    │       │
    │       ├──▶ Render.com (backend)
    │       │       └── Auto-builds Dockerfile
    │       │       └── Runs: gunicorn -c gunicorn_conf.py wsgi:app
    │       │       └── Env vars: from Render dashboard (MONGO_URI, JWT_SECRET_KEY)
    │       │       └── URL: https://pbl-backend.onrender.com
    │       │
    │       └──▶ Vercel (frontend)
    │               └── Auto-builds: npm run build → dist/
    │               └── Env vars: VITE_API_URL=https://pbl-backend.onrender.com/api
    │               └── URL: https://pbl-portal.vercel.app
    │
MongoDB Atlas M0 — shared between staging and backend
Cloudinary — file uploads from backend
```

### 7.3 Production — BNU University Server

```
BNU Linux Server
├── /etc/nginx/sites-available/pbl-portal
│   └── server block:
│       ├── listen 443 ssl (Let's Encrypt cert)
│       ├── location / → serve /var/www/pbl-portal/dist/ (frontend build)
│       └── location /api → proxy_pass http://127.0.0.1:8000 (Gunicorn)
│
├── /opt/pbl-backend/ (Flask app files)
│   ├── venv/ (Python virtual environment)
│   ├── wsgi.py
│   └── gunicorn_conf.py
│
├── /etc/systemd/system/pbl-backend.service
│   └── [Unit] Description=PBL Backend
│       [Service]
│       User=pbl
│       WorkingDirectory=/opt/pbl-backend
│       EnvironmentFile=/etc/pbl-system/.env
│       ExecStart=/opt/pbl-backend/venv/bin/gunicorn -c gunicorn_conf.py wsgi:app
│       Restart=always
│       [Install] WantedBy=multi-user.target
│
└── /etc/pbl-system/.env (readable only by `pbl` user)
    └── MONGO_URI=mongodb+srv://...
        JWT_SECRET_KEY=...
        CLOUDINARY_...=...
```

### 7.4 Environment Variable Matrix

| Variable | Local Docker | Staging (Render) | Production (BNU) |
|----------|-------------|-----------------|-----------------|
| `MONGO_URI` | `mongodb://admin:adminpass@mongo:27017/pbl_system?authSource=admin` | Atlas M0 URI | Atlas M2 URI or local |
| `JWT_SECRET_KEY` | `dev-jwt-secret-key` | Strong random (Render env) | Strong random (/etc/pbl-system/.env) |
| `FLASK_ENV` | `development` | `production` | `production` |
| `JWT_EXPIRATION_HOURS` | `24` | `24` | `8` |
| `STORAGE_BACKEND` | `local` | `cloudinary` | `cloudinary` or `local` |
| `CLOUDINARY_CLOUD_NAME` | — | Set in Render | Set in /etc/pbl-system/.env |
| `CORS_ORIGINS` | `http://localhost:5173` | `https://pbl-portal.vercel.app` | `https://pbl.bnu.edu.pk` |
| `VITE_API_URL` | `http://localhost:5000/api` | `https://pbl-backend.onrender.com/api` | `https://pbl.bnu.edu.pk/api` |

---

## 8. Git Branching Model

```
main  ←──── Tagged releases only (v0.1.0, v0.2.0 per sprint)
  ↑
develop  ←── Integration branch; PR gate (CI must pass + 1 approval)
  ↑
feature/sprint0-decorators     Ismail — Sprint 0 task
feature/sprint0-auth-fix       Ismail — Sprint 0 task
feature/sprint0-frontend-auth  Ramsha — Sprint 0 task
feature/sprint0-login-page     Sara   — Sprint 0 task
feature/sprint0-validators     Ibrahim — Sprint 0 task
feature/sprint1-manager-dash   ...
feature/sprint1-students-crud  ...
fix/login-bcrypt-comparison    (bug fix branch)
chore/update-gitignore         (maintenance)
```

### Branch Naming Rules

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/<sprint>-<short-description>` | `feature/sprint1-students-crud` |
| Bug Fix | `fix/<short-description>` | `fix/join-request-race-condition` |
| Chore | `chore/<short-description>` | `chore/add-mongodb-indexes` |
| Document | `docs/<short-description>` | `docs/update-srs-v2` |

### Commit Convention (Conventional Commits)

```
feat(groups): add create group endpoint
fix(auth): use bcrypt instead of plaintext comparison
chore(deps): update flask-jwt-extended to 4.7.4
docs(srs): update BNU domain references
test(auth): add login and role boundary tests
refactor(students): extract bulk import to student_service
```

---

## 9. Definition of Done

A feature is considered DONE when ALL of the following are true:

### Backend (API Feature)
- [ ] Route implemented in the correct Blueprint file
- [ ] `@role_required` decorator applied with correct role(s)
- [ ] Input validated with marshmallow schema (or explicit field checks)
- [ ] MongoDB query uses field constants from `models/` (no string literals)
- [ ] `log_audit()` called for every mutation
- [ ] Error cases return the correct HTTP status code and `{success: false, message: ...}`
- [ ] Manual Postman test: success case passes and adds to Postman collection
- [ ] Manual Postman test: at least one failure case tested (wrong role, missing field, duplicate)
- [ ] `pytest tests/ -v` still passes (no regressions)
- [ ] PR opened with template filled, at least one reviewer assigned

### Frontend (Page / Component)
- [ ] Page/component renders correctly for the intended role
- [ ] Loading skeleton shown while data is fetching
- [ ] Empty state shown when no data is returned
- [ ] Error toast shown when API returns an error
- [ ] Success toast shown on successful mutation
- [ ] Confirmation dialog shown before destructive actions
- [ ] Route is protected with `ProtectedRoute` with correct `allowedRoles`
- [ ] Manually tested in browser: login as the correct role, navigate to the page, verify all interactions
- [ ] Mobile view tested (resize to 375px width)
- [ ] PR opened with template filled, at least one reviewer assigned

### Both
- [ ] No hardcoded secrets
- [ ] No `console.log` left in production code
- [ ] No `print()` debugging left in production code (except `email_service.py` mock)
- [ ] PR description explains what changed and why (not just what the code does)
- [ ] CI is green (all checks pass in GitHub Actions)

---

*End of Architecture and UML Design Package*
