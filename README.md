# PBL Management System — Beaconhouse National University

> **Project-Based Learning Management System** — A comprehensive web platform for managing Final Year Projects (FYP) at Beaconhouse National University (BNU).

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Status](https://img.shields.io/badge/status-development-yellow)
![BNU](https://img.shields.io/badge/BNU-Beaconhouse%20National%20University-purple)
![Python](https://img.shields.io/badge/python-3.11-blue)
![Flask](https://img.shields.io/badge/flask-2.3.3-lightgrey)
![React](https://img.shields.io/badge/react-18-61DAFB)

---

# 📖 Table of Contents

- [Project Overview](#-project-overview)
- [Key Features](#-key-features)
- [User Roles](#-user-roles)
- [Technology Stack](#-technology-stack)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Development Phases](#-development-phases)
- [Team](#-team)
- [Contributing](#-contributing)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)

---

# 🎯 Project Overview

The **PBL Management System** is a web-based solution designed specifically for **Beaconhouse National University (BNU)** to digitize and streamline the entire Final Year Project (FYP) lifecycle.

## The Problem We Solve

| Challenge | Our Solution |
|-----------|--------------|
| Manual group formation | Online group creation with join requests |
| Paper-based submissions | Digital iteration submissions with deadlines |
| Inconsistent evaluation | Standardized rubric-based scoring |
| Fragmented communication | Centralized announcements and meeting logs |
| No visibility for HOD/Dean | Real-time dashboards with analytics |

## Complete FYP Lifecycle

```text
Course Setup
    ↓
Student Enrollment
    ↓
Group Formation
    ↓
Iteration Submissions
    ↓
Evaluation
    ↓
Exhibition
    ↓
Reporting
```

---

# ✨ Key Features

| Category | Feature | Description |
|----------|---------|-------------|
| **Student Management** | Individual Add | Add students with auto-generated credentials |
| | Bulk Import | Excel/CSV upload with email notifications |
| | Recycle Bin | Soft-delete and recover students |
| | Filters | Search by department, section, session |
| **Group Management** | Create Group | Students form groups with project titles |
| | Join Requests | Browse and request to join groups |
| | Leader Approval | Accept/reject join requests |
| | Approve Groups | PBL Manager approves groups |
| **Course Management** | Course CRUD | Configure courses with group size limits |
| | Department CRUD | Manage academic departments |
| | Teacher CRUD | Internal and external evaluators |
| **Iterations** | Create Iterations | Define milestones with deadlines |
| | Rubrics Builder | Weighted criteria with 0–5 levels |
| | Submissions | File uploads with late detection |
| **Evaluation** | Rubric Scoring | Weighted evaluation with auto-calculated totals |
| | Exhibition Evaluation | Final project showcase evaluation |
| | Locked Submissions | Once submitted, cannot be changed |
| **Surveys** | Create Surveys | Custom questions with 1–5 scale |
| | Student Responses | One response per student |
| | Reports | Visual charts and detailed data |
| **Communication** | Announcements | Rich text updates with attachments |
| | Meeting Logs | Record supervision meetings |
| **Oversight** | HOD Dashboard | Department-scoped read-only access |
| | Dean Dashboard | University-wide cross-department view |
| | Reports | Group and iteration performance |

---

# 👥 User Roles

| Role | Login Credentials | Access Scope |
|------|-------------------|--------------|
| **PBL Manager** | `manager@bnu.edu.pk` | Full CRUD on everything, approves groups, assigns evaluators, publishes announcements, surveys, and iterations |
| **Student** | `ROLL-NO@BNU.EDU.PK` | Own profile, own group, create, browse, join groups, submit work, fill surveys |
| **Evaluator** | Own email | Assigned groups only, rubric scoring, exhibition evaluation, meeting logs |
| **HOD** | `hod@bnu.edu.pk` | Read-only, department-scoped oversight |
| **HOD I&C** | `hodic@bnu.edu.pk` | Read-only, department-scoped oversight |
| **Dean** | `dean@bnu.edu.pk` | Read-only, university-wide oversight |

## Permission Matrix

| Action | Manager | Student | Evaluator | HOD | Dean |
|--------|:-------:|:-------:|:---------:|:---:|:----:|
| CRUD Students | ✅ | ❌ | ❌ | ❌ | ❌ |
| CRUD Courses | ✅ | ❌ | ❌ | ❌ | ❌ |
| Approve Groups | ✅ | ❌ | ✅ | ❌ | ❌ |
| Create Group | ❌ | ✅ | ❌ | ❌ | ❌ |
| Join Group | ❌ | ✅ | ❌ | ❌ | ❌ |
| Submit Work | ❌ | ✅ | ❌ | ❌ | ❌ |
| Evaluate | ❌ | ❌ | ✅ | ❌ | ❌ |
| View Reports | ✅ | ❌ | ❌ | ✅ | ✅ |

---

# 🏗️ Technology Stack

| Layer | Technology | Version | Purpose |
|--------|------------|---------|---------|
| **Frontend** | React | 18.2+ | Component-based UI |
| | Vite | Latest | Fast build tool |
| | Tailwind CSS | Latest | Utility-first styling |
| | React Router DOM | 6+ | Client-side routing |
| | Axios | Latest | HTTP client |
| **Backend** | Python Flask | 2.3.3 | REST API framework |
| | Flask-CORS | 4.0.0 | Cross-origin support |
| | Flask-PyMongo | 2.3.0 | MongoDB driver |
| | PyJWT | 2.8.0 | JWT authentication |
| | Bcrypt | 4.0.1 | Password hashing |
| **Database** | MongoDB Atlas | M0 (Free) | Document database |
| **Authentication** | JWT + bcrypt | Custom | Secure token-based authentication |
| **File Storage** | Cloudinary | Dev | Free tier for testing |
| | Local Server | Prod | Full control |
| **Development Environment** | Docker | Latest | Containerization |
| | Docker Compose | Latest | Multi-container orchestration |
| **Version Control** | Git + GitHub | — | Code collaboration |
| **Hosting (Development)** | Vercel | Free | Frontend deployment |
| | Render | Free | Backend deployment |
| **Hosting (Production)** | BNU Linux Server | — | Full control deployment |
| **Process Manager** | Gunicorn + systemd | — | Production process management |

---

# 🚀 Quick Start

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed
- [Git](https://git-scm.com/downloads) installed

## 1. Clone the Repository

```bash
git clone https://github.com/ismailrzw/pbl-management-system.git
cd pbl-management-system
```

## 2. Start the Application

```bash
# Start all services (MongoDB + Backend + Frontend)
docker compose up --build
```

## 3. Access the Application

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:5173 |
| **Backend API** | http://localhost:5000/api |
| **Health Check** | http://localhost:5000/api/health |
| **MongoDB** | mongodb://localhost:27017 |

## 4. Test the Backend

```bash
# Health check
curl http://localhost:5000/api/health

# Expected response:
# {"status":"ok","message":"Backend is running"}
```

## 5. Stop the Application

```bash
# Stop all containers
docker compose down

# Stop and remove volumes (fresh start)
docker compose down -v
```

---

# 📁 Project Structure

```text
pbl-management-system/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── extensions.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── student.py
│   │   │   ├── teacher.py
│   │   │   ├── department.py
│   │   │   ├── course.py
│   │   │   ├── group.py
│   │   │   ├── iteration.py
│   │   │   ├── evaluation.py
│   │   │   ├── survey.py
│   │   │   └── meeting.py
│   │   ├── routes/
│   │   │   ├── auth.py
│   │   │   ├── students.py
│   │   │   ├── groups.py
│   │   │   ├── iterations.py
│   │   │   ├── evaluations.py
│   │   │   ├── surveys.py
│   │   │   └── reports.py
│   │   ├── services/
│   │   │   ├── student_service.py
│   │   │   ├── group_service.py
│   │   │   ├── email_service.py
│   │   │   └── storage_service.py
│   │   └── utils/
│   │       ├── decorators.py
│   │       └── validators.py
│   ├── tests/
│   ├── uploads/
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   └── wsgi.py

├── frontend/
│   ├── src/
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.js

├── docker-compose.yml
├── .github/
├── .gitignore
├── CONTRIBUTING.md
└── README.md
```

---

# 📡 API Documentation

## Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login with email/password |
| `POST` | `/api/auth/change-password` | Change current user password |
| `GET` | `/api/auth/me` | Get current user info (protected) |

---

## Student Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/students` | List all students (with filters) |
| `POST` | `/api/students` | Add a new student |
| `POST` | `/api/students/import` | Bulk import students (Excel) |
| `PUT` | `/api/students/:id` | Update student |
| `DELETE` | `/api/students/:id` | Soft delete student |
| `POST` | `/api/students/:id/recover` | Recover soft-deleted student |

---

## Group Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/groups` | Create a new group |
| `GET` | `/api/groups/my` | Get current user's group |
| `GET` | `/api/groups/browse` | Browse available groups |
| `POST` | `/api/groups/:id/join-request` | Request to join a group |
| `POST` | `/api/join-requests/:id/accept` | Accept join request (leader only) |
| `POST` | `/api/join-requests/:id/reject` | Reject join request (leader only) |
| `DELETE` | `/api/groups/:id/leave` | Leave group |
| `PUT` | `/api/groups/:id/approve` | Approve group (manager/evaluator) |

---

## Iteration Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/iterations` | List all iterations |
| `POST` | `/api/iterations` | Create a new iteration |
| `GET` | `/api/iterations/:id` | Get iteration details |
| `POST` | `/api/iterations/:id/submit` | Submit work (file upload) |
| `POST` | `/api/iterations/:id/evaluate` | Evaluate a submission |
| `GET` | `/api/iterations/:id/rubrics` | Get rubrics for iteration |

---

## Survey Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/surveys` | List all surveys |
| `POST` | `/api/surveys` | Create a new survey |
| `POST` | `/api/surveys/:id/respond` | Submit survey response |
| `GET` | `/api/surveys/:id/report` | Get survey report with statistics |

---

## Exhibition Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/exhibition/evaluate` | Submit exhibition evaluation |
| `GET` | `/api/exhibition/assignments` | Get evaluator assignments |

---

## Report Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/reports/groups` | Group performance report |
| `GET` | `/api/reports/iterations` | Iteration completion report |

---

# 🗓️ Development Phases

| Phase | Duration | Focus | Deliverable |
|-------|----------|-------|-------------|
| **Phase 1** | Week 1 | Docker setup, Authentication, Role-based routing | Login working, Docker environment |
| **Phase 2** | Week 2–3 | Department, Course, Student, Teacher CRUD | All CRUD operations working |
| **Phase 3** | Week 3–4 | Group management (create, join, approve) | Group formation live |
| **Phase 4** | Week 5–6 | Iterations, Rubrics, Submissions, Evaluation | Submission workflow complete |
| **Phase 5** | Week 6–7 | Exhibition evaluation, Surveys, Reports | Exhibition and surveys working |
| **Phase 6** | Week 7–8 | Announcements, Meetings, Final polish | All features complete |
| **Phase 7** | Week 8–9 | Testing, Bug fixes, Deployment | Production ready |

## Current Focus: Phase 3 — Group Management

**Goal:** Group formation module live by **Friday, July 31st** or might take a week or so 

| Task | Owner | Status |
|------|-------|--------|
| Create group endpoint | Sara | In Progress |
| Browse groups endpoint | Sara | In Progress |
| Join request endpoint | Sara | In Progress |
| Accept/reject join request | Sara | In Progress |
| Leave group endpoint | Sara | In Progress |
| Approve group endpoint | Ismail | Pending |
| Group UI pages | Ramsha | Pending |
| Postman tests | Ibrahim | Pending |

---

# 👥 Team

| Role | Name | Responsibilities |
|------|------|------------------|
| **Project Lead / Backend Lead** | Ismail | Architecture, Docker, Authentication, PR Reviews, Deployment, Integration Testing |
| **Assistant Lead / Frontend Lead** | Ramsha | Frontend Architecture, Components, Design System, Co-reviewer |
| **Frontend Developer** | Sara | Page Components, API Integration, Routing, Group Module |
| **Backend Developer** | Ibrahim | API Endpoints, Testing, Postman Collection, Bug Hunting |

---

# 📝 Contributing

Please read **CONTRIBUTING.md** for detailed guidelines.

## Git Workflow

```bash
# 1. Always branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# 2. Make your changes and commit
git add .
git commit -m "feat(module): description of changes"

# 3. Push and create PR
git push -u origin feature/your-feature-name

# Create Pull Request on GitHub against develop
```

## Commit Convention

| Type | Purpose | Example |
|------|---------|---------|
| `feat` | New feature | `feat(groups): add join-request endpoint` |
| `fix` | Bug fix | `fix(auth): correct role check` |
| `chore` | Maintenance | `chore(docker): add mongo service` |
| `docs` | Documentation | `docs(readme): update setup instructions` |
| `test` | Testing | `test(groups): add unit tests` |
| `refactor` | Code improvement | `refactor(services): extract validation logic` |

---

# 🔧 Environment Variables

## Backend `.env`

Location:

```text
backend/.env
```

```env
# Flask
FLASK_APP=app
FLASK_ENV=development
SECRET_KEY=your-strong-secret-key-here-change-this

# MongoDB
MONGO_URI=mongodb://admin:secret@mongodb:27017/pbl_system?authSource=admin

# JWT
JWT_EXPIRATION_HOURS=24

# Email (Production)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# File Storage
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=10485760
```

## Frontend `.env`

Location:

```text
frontend/.env
```

```env
VITE_API_URL=http://localhost:5000
```

---

# 🚢 Deployment

## Development Environment

- **Frontend:** Vercel (Free Tier)
- **Backend:** Render (Free Tier)
- **Database:** MongoDB Atlas (M0 Free Tier)

---

## Production Environment

Deployed on **Beaconhouse National University** Linux Server.

### Start the Backend Service

```bash
# Using Gunicorn + systemd

sudo systemctl start pbl-backend
sudo systemctl enable pbl-backend
```

---

## Systemd Service File

**Location**

```text
/etc/systemd/system/pbl-backend.service
```

```ini
[Unit]
Description=PBL Management System Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/pbl-system/backend
Environment="PATH=/home/ubuntu/pbl-system/venv/bin"
ExecStart=/home/ubuntu/pbl-system/venv/bin/gunicorn -c gunicorn_conf.py wsgi:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

---


# 🙏 Acknowledgments

- **Beaconhouse National University** — Project oversight and support
- **Superior University** — Original prototype and requirements
- **Team Members** — For their dedication and hard work

---

# 📞 Contact

| Role | Name | Email |
|------|------|-------|
| Project Lead | Muhammad Ismail Rana| f2023-551@bnu.edu.pk |
| Team Member | Ramsha Naveed| f2023-026@bnu.edu.pk |
| Team Member | Sara Haider| f2023-744@bnu.edu.pk |
| Team Member | Sheikh Muhammad Ibrahim | f2023-630@bnu.edu.pk |

For questions or support, please open an issue on GitHub.

---



*Last Updated: July 2026*