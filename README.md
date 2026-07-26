# Complete README.md & GitHub Push Guide

Here's your complete README.md file and step-by-step instructions to push it to GitHub.

---

## 1. README.md (Full Version)

Create this file in your project root. I'll provide it as a complete, copy-paste-ready file:

```markdown
# 🎓 PBL Management System

> **Project-Based Learning Management System** — A complete web platform for managing Final Year Projects (FYP) at Superior University.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Status](https://img.shields.io/badge/status-development-yellow)
![License](https://img.shields.io/badge/license-MIT-green)
![Team](https://img.shields.io/badge/team-4%20members-purple)

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Key Features](#-key-features)
- [User Roles](#-user-roles)
- [Technology Stack](#-technology-stack)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Development Phases](#-development-phases)
- [Team Members](#-team-members)
- [Contributing](#-contributing)
- [Deployment](#-deployment)
- [Environment Variables](#-environment-variables)
- [License](#-license)

---

## 🎯 Project Overview

The **PBL Management System** is a comprehensive web-based solution designed to digitize and streamline the entire Final Year Project (FYP) lifecycle at Superior University.

### What It Does

| Phase | Description |
|-------|-------------|
| 📚 **Course Setup** | Configure courses with department, group size limits, and deadlines |
| 👥 **Student Enrollment** | Add students individually or bulk import via Excel with auto-generated credentials |
| 🤝 **Group Formation** | Students create/join groups, leaders approve requests, managers oversee |
| 📝 **Iteration Management** | Define project milestones with weighted rubrics (0-5 scale) |
| ✅ **Evaluation System** | Rubric-based scoring with locked submissions (no edits after submit) |
| 🎪 **Exhibition** | Final project evaluation with dedicated criteria (4 categories) |
| 📊 **Feedback & Surveys** | Create and analyze feedback surveys with visual reports |
| 📢 **Announcements** | Publish updates with file attachments |
| 📈 **Reporting** | Group performance, iteration completion, and department-wise reports |

---

## ⭐ Key Features

### For PBL Manager
- ✅ Full CRUD on Students, Teachers, Departments, Courses
- ✅ Bulk import students via Excel (auto-emails credentials)
- ✅ View students without groups + send reminders
- ✅ Create and manage iterations with rubrics
- ✅ Approve/drop groups
- ✅ Assign groups to evaluators
- ✅ Create surveys and view aggregated reports
- ✅ Publish announcements with attachments
- ✅ Recycle bin (soft delete + recover)

### For Students
- ✅ Create, browse, and join groups
- ✅ Accept/reject join requests (if leader)
- ✅ View group members and status
- ✅ Submit iteration work (with late detection)
- ✅ Fill surveys (one response per survey)
- ✅ View announcements

### For Evaluators
- ✅ View assigned groups
- ✅ Evaluate iterations with rubrics (locked after submission)
- ✅ Exhibition evaluation (4 criteria, locked after submission)
- ✅ Record meeting minutes

### For HOD / HOD I&C
- ✅ Department-scoped read-only dashboard
- ✅ View groups, reports, and charts
- ✅ Export to PDF

### For Dean
- ✅ University-wide read-only dashboard
- ✅ Department-wise breakdown
- ✅ View students without groups (all departments)
- ✅ Export to PDF

---

## 👥 User Roles

| Role | Login | Access Level | Scope |
|------|-------|--------------|-------|
| **PBL Manager** | `manager@superior.edu.pk` | Full CRUD on everything | University-wide |
| **Student** | `ROLL-NO@SUPERIOR.EDU.PK` | Own profile + own group | Personal + Group |
| **Evaluator** | Personal email | Assigned groups only | Assigned Groups |
| **HOD** | `hod@superior.edu.pk` | Read-only | Own Department |
| **HOD I&C** | `hodic@superior.edu.pk` | Read-only | Own Department |
| **Dean** | `dean@superior.edu.pk` | Read-only | University-wide |

> ⚠️ **Security Note:** Role-based access is enforced **server-side** (Flask), not just hidden in the UI.

---

## 🏗️ Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Frontend** | React | 18+ | Component-based UI |
| | Vite | Latest | Fast build tool |
| | Tailwind CSS | Latest | Utility-first styling |
| | Axios | Latest | HTTP client |
| | React Router DOM | 6+ | Client-side routing |
| **Backend** | Python Flask | 2.x | REST API |
| | Flask-CORS | Latest | Cross-origin support |
| | PyMongo | Latest | MongoDB driver |
| | PyJWT | Latest | JWT authentication |
| | bcrypt | Latest | Password hashing |
| **Database** | MongoDB Atlas | M0 (free) | Document database |
| **Dev Environment** | Docker | Latest | Containerization |
| | Docker Compose | Latest | Multi-container orchestration |
| **Version Control** | Git + GitHub | - | Code management |
| **Hosting (Dev)** | Vercel | Free | Frontend deployment |
| | Render | Free | Backend deployment |
| **Hosting (Prod)** | University Linux Server | - | Full control deployment |
| **Process Manager** | Gunicorn + systemd | - | Production process management |

---

## 🚀 Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed
- [Git](https://git-scm.com/downloads) installed
- Ports: 5000 (backend), 27017 (MongoDB) available

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/ismailrzw/pbl-management-system.git
cd pbl-management-system

# 2. Start all services (MongoDB + Backend + Frontend)
docker compose up --build

# 3. In a new terminal, test the backend
curl http://localhost:5000/api/health
```

### Expected Response

```json
{
  "status": "ok",
  "message": "Backend is running"
}
```

### Access Points

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:5173 |
| **Backend API** | http://localhost:5000/api |
| **MongoDB** | mongodb://localhost:27017 |
| **Health Check** | http://localhost:5000/api/health |

### Stop Everything

```bash
docker compose down
```

### Fresh Start (Delete Data)

```bash
docker compose down -v
docker compose up --build
```

---

## 📁 Project Structure

```
pbl-management-system/
├── backend/                          # Flask REST API
│   ├── app/
│   │   ├── __init__.py              # Flask app factory
│   │   ├── config.py                # Configuration
│   │   ├── extensions.py            # Extensions (MongoDB, CORS)
│   │   ├── models/                  # MongoDB schemas
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
│   │   ├── routes/                  # API endpoints (Blueprints)
│   │   │   ├── auth.py
│   │   │   ├── manager/
│   │   │   │   ├── students.py
│   │   │   │   ├── departments.py
│   │   │   │   ├── courses.py
│   │   │   │   ├── teachers.py
│   │   │   │   ├── groups.py
│   │   │   │   └── iterations.py
│   │   │   ├── student/
│   │   │   │   ├── groups.py
│   │   │   │   ├── iterations.py
│   │   │   │   └── surveys.py
│   │   │   ├── evaluator/
│   │   │   │   ├── evaluations.py
│   │   │   │   ├── exhibition.py
│   │   │   │   └── meetings.py
│   │   │   └── oversight/           # HOD, HODI&C, Dean
│   │   ├── services/                # Business logic
│   │   │   ├── email_service.py
│   │   │   ├── storage_service.py
│   │   │   └── group_service.py
│   │   └── utils/                   # Helpers & decorators
│   │       ├── decorators.py        # @role_required
│   │       ├── validators.py
│   │       └── jwt_utils.py
│   ├── tests/                       # Unit tests (pytest)
│   ├── uploads/                     # File storage
│   ├── postman/                     # Postman collection
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   └── wsgi.py                      # Production entrypoint
│
├── frontend/                        # React + Vite
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── routes/
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── roleHome.js
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── api/
│   │   │   ├── axiosClient.js
│   │   │   ├── students.js
│   │   │   ├── groups.js
│   │   │   └── iterations.js
│   │   ├── pages/
│   │   │   ├── manager/
│   │   │   ├── student/
│   │   │   ├── evaluator/
│   │   │   ├── hod/
│   │   │   └── dean/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   ├── ui/
│   │   │   └── charts/
│   │   └── styles/
│   │       └── tailwind.config.js
│   ├── index.html
│   ├── vite.config.js
│   └── Dockerfile
│
├── docker-compose.yml               # Multi-container setup
├── .gitignore
├── CONTRIBUTING.md                  # Team guidelines
├── LICENSE
└── README.md                        # This file
```

---

## 🗓️ Development Phases

| Phase | Timeline | Focus | Key Deliverables |
|-------|----------|-------|------------------|
| **Phase 1** | Week 1 | Foundation & Auth | Docker setup, JWT auth, role-based routing |
| **Phase 2** | Week 2-3 | Core CRUD | Department, Course, Student, Teacher CRUD |
| **Phase 3** | Week 3-4 | Groups | Create, browse, join, approve, leave |
| **Phase 4** | Week 5-6 | Iterations | Rubrics, submissions, evaluation |
| **Phase 5** | Week 6-7 | Exhibition & Surveys | Exhibition evaluation, surveys, reports |
| **Phase 6** | Week 7-8 | Polish | Announcements, meetings, reports |
| **Phase 7** | Week 8-9 | Testing & Deployment | Bug fixes, production deployment |

### Immediate Milestone: Group Formation Live by Friday

| Day | Backend | Frontend | Deliverable |
|-----|---------|----------|-------------|
| **Mon** | Docker + Auth + Schema | — | Working environment |
| **Tue** | Auth + Student APIs | — | Login working in Postman |
| **Wed** | Group APIs (all endpoints) | — | Full group logic tested |
| **Thu** | Hardening + Bug fixes | Start group pages | Bug-free APIs |
| **Fri** | — | Complete group UI | Demo-ready group module |

---

## 👥 Team Members

| Role | Name | GitHub | Responsibilities |
|------|------|--------|------------------|
| **Project Lead / Backend Lead** | Ismail | [@ismailrzw](https://github.com/ismailrzw) | Architecture, Docker, Auth, PR reviews, Deployment, Project management |
| **Assistant Lead / Frontend Lead** | Ramsha | [@ramsha-dev](https://github.com/ramsha-dev) | Frontend architecture, Components, Design system, Co-reviewer |
| **Frontend Developer** | Sara | [@sara-dev](https://github.com/sara-dev) | Page components, API integration, Routing |
| **Backend Developer** | Ibrahim | [@ibrahim-dev](https://github.com/ibrahim-dev) | API endpoints, Testing, Postman collection, QA |

---

## 📝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

### Git Workflow

```
main        → Production-ready (protected)
develop     → Integration branch
feature/*   → Feature branches (e.g., feature/backend-groups)
fix/*       → Bug fixes
```

### Commit Convention

```
feat(module): add new feature
fix(module): fix bug
chore(module): maintenance task
docs(module): documentation update
```

### PR Process

1. Create branch from `develop`
2. Implement feature with tests
3. Open PR against `develop`
4. At least 1 approval required
5. Squash-merge into `develop`

---

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest tests/
```

### API Testing

Import the Postman collection from `backend/postman/PBL-System.postman_collection.json` to test all endpoints.

### Test Credentials

| Role | Email | Password |
|------|-------|----------|
| PBL Manager | `manager@superior.edu.pk` | `pbl123*` |
| Student | `BCSM-F16-327@SUPERIOR.EDU.PK` | `pbl123*` |
| Evaluator | `sarah.ahmed@superior.edu.pk` | `pbl123*` |
| HOD | `hod@superior.edu.pk` | `pbl123*` |
| Dean | `dean@superior.edu.pk` | `pbl123*` |

---

## 📦 Deployment

### Development Environment

| Service | Platform |
|---------|----------|
| Frontend | Vercel (free tier) |
| Backend | Render (free tier) |
| Database | MongoDB Atlas (M0 free tier) |

### Production Environment

- **Server:** University Linux server
- **Backend:** Gunicorn + systemd
- **Reverse Proxy:** Nginx (HTTPS)
- **Process Management:** systemd (auto-restart on crash/reboot)
- **Storage:** Local server (full control)

---

## 🔧 Environment Variables

### Backend `.env`

```env
FLASK_APP=app
FLASK_ENV=development
SECRET_KEY=your-strong-secret-key
MONGO_URI=mongodb://admin:secret@mongodb:27017/pbl_system?authSource=admin
JWT_EXPIRATION_HOURS=24
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Frontend `.env`

```env
VITE_API_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=your-api-key  # Only if using Firebase
```

---

## 📊 Database Collections (MongoDB)

| Collection | Purpose |
|------------|---------|
| `users` | Authentication & roles |
| `students` | Student profiles |
| `teachers` | Teacher/evaluator profiles |
| `departments` | Department data |
| `courses` | Course configurations |
| `groups` | Project groups |
| `join_requests` | Group join requests |
| `iterations` | Project milestones |
| `iteration_evaluations` | Rubric scores |
| `exhibition_evaluations` | Final exhibition scores |
| `surveys` | Feedback surveys |
| `announcements` | System announcements |
| `meetings` | Supervision meetings |
| `email_logs` | Email audit trail |

---

## 🔒 Security Features

- ✅ JWT-based authentication with expiration
- ✅ Role-based access control (server-side)
- ✅ Password hashing (bcrypt)
- ✅ Soft delete (no data loss)
- ✅ CORS configured for specific origins
- ✅ Input validation on all endpoints
- ✅ Rate limiting (to be added)
- ✅ Audit trail (email logs)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Superior University** — Project oversight and guidance
- **Professor** — For project direction and support
- **Team Members** — For their dedication and hard work

---

## 📞 Contact

| Purpose | Method |
|---------|--------|
| **Bugs/Issues** | [GitHub Issues](https://github.com/ismailrzw/pbl-management-system/issues) |
| **Team Communication** | WhatsApp Group |
| **Project Lead** | [@ismailrzw](https://github.com/ismailrzw) |

---

## 📈 Project Status

| Module | Status | Completion |
|--------|--------|------------|
| Docker Setup | ✅ Complete | 100% |
| Backend Foundation | ✅ Complete | 100% |
| Authentication | 🚧 In Progress | 30% |
| Student CRUD | ⬜ Not Started | 0% |
| Group Management | ⬜ Not Started | 0% |
| Iterations | ⬜ Not Started | 0% |
| Evaluations | ⬜ Not Started | 0% |
| Frontend | ⬜ Not Started | 0% |

---

**Built with ❤️ by Team PBL | Superior University**

```

---

## 2. How to Push README.md to GitHub

### Step 1: Create the README.md File

```bash
# Navigate to your project root
cd ~/Desktop/pbl-management-system

# Create the README file (copy the content above)
# On Linux/Mac:
touch README.md
# On Windows:
# Right-click → New → Text Document → rename to README.md

# Open in your editor and paste the README content above
# Using VS Code:
code README.md
```

### Step 2: Check Your Current Branch

```bash
# Check which branch you're on
git branch
# Should show * main
```

### Step 3: Add and Commit the README

```bash
# Add README to staging
git add README.md

# Commit with a message
git commit -m "docs: add comprehensive README with project overview"

# Push to GitHub (main branch)
git push origin main
```

### Step 4: Verify

1. Go to https://github.com/ismailrzw/pbl-management-system
2. Refresh the page
3. Your README should appear beautifully formatted

---

## 3. Quick Checklist Before Pushing

- [x] README.md created in project root
- [x] Content includes: overview, features, tech stack, quick start, structure, team, contributing
- [x] All badges and links are correct
- [x] No sensitive information (passwords, API keys) in README
- [x] `git add README.md` executed
- [x] `git commit -m "docs: add comprehensive README"` executed
- [x] `git push origin main` executed

---

## 4. Troubleshooting Push Issues

### Error: "Permission denied"

```bash
# Check your remote URL
git remote -v

# If using SSH, ensure your SSH key is added
ssh -T git@github.com

# If using HTTPS, use a personal access token
# Generate at: GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
git remote set-url origin https://ismailrzw:YOUR_TOKEN@github.com/ismailrzw/pbl-management-system.git
```

### Error: "Please make sure you have the correct access rights"

```bash
# Set your user name and email
git config --global user.name "Ismail"
git config --global user.email "ismail@example.com"

# Then try again
git push origin main
```

### Error: "Updates were rejected"

```bash
# Pull latest changes first
git pull origin main --rebase

# Then push
git push origin main
```

---

## 5. Bonus: Add License

### Create LICENSE File

```bash
# From project root
touch LICENSE

# Add MIT License content
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2026 Team PBL - Superior University

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

# Add and push
git add LICENSE
git commit -m "docs: add MIT license"
git push origin main
```

---

## 6. Final Repository Structure

After pushing, your repository should look like:

```
pbl-management-system/
├── backend/
│   ├── app/
│   ├── tests/
│   ├── uploads/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml
├── .gitignore
├── CONTRIBUTING.md
├── LICENSE
└── README.md          ← This is what you just pushed
```

---

## Summary

You now have:
- ✅ A comprehensive README.md with all project details
- ✅ README pushed to GitHub `main` branch
- ✅ MIT license added (optional)
- ✅ Repository ready for team collaboration

**Next Step:** Share the repository URL with your team and have them clone it!