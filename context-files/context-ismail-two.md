# 🚀 Project Handover & Context Summary — Sprint 1 & Production Deployment

## 📋 Executive Overview

- **Project:** ERP Management System (PBL Management System)
- **Previous Milestones:** Sprint 0 (Foundation, Security & Auth) — Complete
- **Current Milestone:** Sprint 1 (Manager CRUD, Full Responsive UI Overhaul & Cloud CI/CD Deployment) — **Complete**
- **Status:** ✅ **Production Ready:** Live Frontend on Vercel, Live Backend on Render, Connected to MongoDB Atlas Cloud, and 100% responsive across Mobile, Tablet, and Desktop.

---

## 🎯 What Was Accomplished & What Was Corrected

### 1. 🌐 Cloud Deployment Architecture & Live Infrastructure
- **Frontend Live on Vercel:** Connected via Vite build system. Configured `frontend/vercel.json` with SPA client-side rewrite rules (`{"rewrites": [{"source": "/(.*)", "destination": "/index.html"}]}`) so direct link navigation and page refreshes never return 404s.
- **Dynamic API Base URL:** Configured `frontend/src/api/client.js` to dynamically read `import.meta.env.VITE_API_BASE_URL` with a graceful `/api` fallback for local Docker environments.
- **Backend Live on Render:** Containerized Python 3.11 Flask API deployed via Docker Web Service using dynamic port binding:
  ```bash
  gunicorn --bind 0.0.0.0:${PORT:-5000} --workers 2 --timeout 120 wsgi:app
  ```
- **Health Checks & OpenAPI:** Added `@app.route('/')` and `@app.route('/health')` returning HTTP 200 JSON status alongside interactive Swagger UI at `/api/docs`.
- **Automated CI/CD Pipeline:**
  - `.github/workflows/ci.yml`: Parallel testing with pip caching, isolated MongoDB 7 Docker container, Flake8 linting, Black formatting check, Pytest coverage, Node 20 caching, ESLint verification (`npx eslint src/`), and Vite build test.
  - `.github/workflows/cd.yml`: Automated deployment triggers to Render (Deploy Hook) and Vercel CLI upon merge to `main`.

---

### 2. 🗄️ MongoDB Atlas Cloud & Database Seeding Strategy
- **Diagnosed the 30s Cold Start / `401 Unauthorized` Cause:**
  - Render free-tier containers spin down after 15 minutes of inactivity (causing an initial 30s wake-up latency).
  - MongoDB Atlas enforces firewall security via **Network Access (IP Whitelist)**. Incoming connections from dynamic cloud IPs require `0.0.0.0/0` (Allow Access from Anywhere) in MongoDB Atlas Security Settings, otherwise Atlas terminates the SSL handshake with `[SSL: TLSV1_ALERT_INTERNAL_ERROR]`.
- **Master Idempotent Database Seeding (`backend/seed/seed_all.py`):**
  - Created a master seeding script using **Idempotent Upserts** (`update_one({"email": email}, {"$setOnInsert": {...}}, upsert=True)`).
  - Seeds all default roles safely:
    - **PBL Manager:** `zamanaziz@bnu.edu.pk` / `11223344`
    - **Evaluators / Teachers:** `sarah.ahmed@superior.edu.pk`, `ali.raza@superior.edu.pk`, `kashif.mehmood@techvista.com` (`pbl123*`)
    - **Students:** `Ahmed Khan` (`bcsm-f16-327@superior.edu.pk`), `Fatima Noor` (`bse-f20-045@superior.edu.pk`)
    - **Reference Data:** CS, SE, EE, BBA Departments, FYP and Software Architecture Courses, and sample announcements.
  - Running this script 1 or 100 times **never throws duplicate key errors** (`E11000`).
- **Optimized Pytest Integration Fixtures (`backend/tests/conftest.py`):**
  - Replaced expensive remote database drops with atomic collection clearing (`delete_many({})`), cutting test runtimes and avoiding asynchronous drop collisions.

---

### 3. 📱 Dynamic Multi-Device Responsive UI System
Refactored the entire presentation layer without altering any business logic, API endpoints, or state management:

| Viewport Tier | Breakpoint | Behavior & Layout Strategy |
| :--- | :--- | :--- |
| **💻 Desktop & Laptop** | `≥ 1024px` | **Unchanged:** Fixed collapsible sidebar (`235px` / `64px`), 5-column metric cards, dual-panel dashboard. |
| **📟 Tablet** | `768px – 1023px` | **Adaptive:** `marginLeft: 0` with fluid `20px` padding. Metric cards scale to 2–3 columns. Announcements and Attachments stack into full-width cards. |
| **📱 Mobile** | `< 768px` | **Off-Canvas Drawer:** Sliding drawer (`translateX(-100%)` ➔ `translateX(0)`) with semi-transparent dark backdrop blur (`rgba(15, 23, 42, 0.6)`). Tap outside or link selection auto-closes drawer. Compact header with `PBL` brand badge. |

#### Specific UI Component Enhancements:
1. **`frontend/src/index.css`:** Added responsive grid tokens (`.stat-grid-responsive`, `.dashboard-dual-grid`, `.form-grid-2`, `.toolbar-responsive`, `.table-responsive-container`, `.mobile-backdrop`).
2. **`frontend/src/components/layout/AppShell.jsx` & `Sidebar.jsx`:** Dynamic window resize listener, mobile drawer overlay toggle, and automatic drawer closing on navigation.
3. **`frontend/src/components/layout/Navbar.jsx`:** Replaced rigid desktop brand column with compact mobile badge and touch-friendly hamburger trigger.
4. **`frontend/src/components/ui/Modal.jsx`:** Clamped to `min(calc(100vw - 24px), maxWidth)` with `maxHeight: 92vh` and scrollable body.
5. **`frontend/src/pages/manager/ManagerDashboard.jsx`:** Fluid 5 ➔ 3 ➔ 2 ➔ 1 column metric cards and stacked layout for Announcements & Attachments.
6. **`frontend/src/pages/auth/SignInPage.jsx`:** Demo account credentials wrapped into touch-friendly autofill pills with responsive text wrapping.
7. **Data Tables (All List & Trash Pages):** Wrapped inside `-webkit-overflow-scrolling: touch` containers to eliminate table squishing and layout breaking.

---

## 🏛️ System Architecture Summary

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 Vercel Production Edge                 │
                  │             React 19 + Vite SPA (Responsive)           │
                  └───────────────────────────┬────────────────────────────┘
                                              │ HTTPS / JSON API
                                              ▼
                  ┌────────────────────────────────────────────────────────┐
                  │                  Render Cloud Web Service              │
                  │             Python 3.11 + Flask + Gunicorn             │
                  └───────────────────────────┬────────────────────────────┘
                                              │ TLS 1.3
                                              ▼
                  ┌────────────────────────────────────────────────────────┐
                  │                  MongoDB Atlas Cluster                 │
                  │               Database: "pbl_system"                   │
                  └────────────────────────────────────────────────────────┘
```

---

## 🧪 Quality & Test Verification

| Test Suite / Verification Step | Tool / Command | Result |
| :--- | :--- | :--- |
| **Frontend Code Quality** | `npx eslint src/` | ✅ **0 errors, 0 warnings (100% clean)** |
| **Frontend Production Bundle** | `npm run build` | ✅ **✓ Built successfully (`dist/assets/`)** |
| **Backend Integration Suite** | `pytest tests/` | ✅ **74/74 passing** |
| **Database Contract Tests** | `pytest tests/test_announcements.py` | ✅ **4/4 passed (100% green)** |
| **Responsive Validation** | Chrome DevTools Viewport Emulation | ✅ Tested across iPhone 14, iPad Mini, iPad Pro, 1080p Desktop |

---

## 🔮 What Happens Next (Sprint 2 Roadmap)

For the next engineer picking up the project, here are the scheduled priorities for Sprint 2:

### 1. 👥 Student Group Management Workflow
- Implement Project Group formation API & UI.
- Support student group registration, invitation acceptance/rejection, and maximum group limit rules according to course configurations.
- Manager group approval/rejection panel with supervisor assignments.

### 2. 👨‍🏫 Evaluator & Teacher Workflows
- Teacher evaluation portal for scoring assigned student projects according to rubrics.
- Internal vs External evaluator review flows.

### 3. 📋 Survey & Feedback Module
- Enable PBL Managers to design custom survey questionnaires.
- Student & Teacher submission forms with aggregation reports on the Manager Dashboard.

### 4. 🎓 Role-Specific Dashboards
- Tailor dashboard views for `Student`, `Evaluator`, `HOD`, and `DEAN` roles based on JWT claims.

---

## 🔑 Demo Credentials Reference

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **PBL Manager** | `zamanaziz@bnu.edu.pk` | `11223344` | Full Administrative & Reference Data CRUD |
| **Student** | `bcsm-f16-327@superior.edu.pk` | `pbl123*` | Project Group Registration & Submissions |
| **Evaluator (Internal)** | `sarah.ahmed@superior.edu.pk` | `pbl123*` | Evaluation & Grading Assigned Groups |
| **Evaluator (Internal)** | `ali.raza@superior.edu.pk` | `pbl123*` | Evaluation & Grading Assigned Groups |
| **Evaluator (External)** | `kashif.mehmood@techvista.com` | `pbl123*` | External Evaluation Scoring |

---

## 🛠️ Essential Commands Cheat Sheet

### Run Locally with Docker:
```bash
docker compose up --build
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`
- Swagger Docs: `http://localhost:5000/api/docs`

### Run Backend Locally:
```bash
cd backend
.\venv\Scripts\activate
flask run
```

### Run Master Seed Script:
```bash
cd backend
.\venv\Scripts\python seed/seed_all.py
```

### Run Frontend Locally:
```bash
cd frontend
npm run dev
```

### Run Verification Checks:
```bash
# Frontend
cd frontend
npx eslint src/
npm run build

# Backend
cd backend
pytest tests/
```
