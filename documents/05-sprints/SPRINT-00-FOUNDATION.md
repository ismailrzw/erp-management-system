# Sprint 0 — Foundation and Security
## PBL Management System · Beaconhouse National University
**Sprint Goal:** Make the codebase safe, structurally correct, and ready for parallel feature development in Sprint 1.
**Prerequisite For:** Every other sprint. Sprint 1 cannot begin until Sprint 0 is fully complete.
**Owners:** All four team members working in parallel

---

> [!CAUTION]
> Sprint 0 has no visible user features. It feels like "nothing is happening." This is the most important sprint in the entire project. Every security hole patched here prevents catastrophic failures in production. Every structural decision made here removes weeks of rework later. Do not skip or rush Sprint 0.

---

## Why Sprint 0 Must Exist

Before Sprint 0, the codebase has these fatal problems:
1. Live database credentials are readable by anyone with repository access
2. Passwords are compared in plaintext — any stored password is immediately readable if the database is compromised
3. The manager cannot log in through the actual API
4. The `@role_required` decorator — the security guard for every endpoint — does not exist
5. The frontend is a Vite template welcome screen — no routing, no auth, no pages
6. No PR template, no CI, no automated quality gate
7. All MongoDB query constraints exist only in documentation — no indexes enforce them

If you start building Sprint 1 features without fixing these, you will:
- Build on a broken foundation (login doesn't work → nothing works)
- Introduce security holes that cannot be patched without rewriting every route
- Have no way to merge safely (no CI, no PR template = no review process)

---

## Sprint 0 Tasks by Team Member

### Ismail (Backend Lead) — Backend Security and Foundation

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S0-BE-01 | Rotate MongoDB Atlas credentials | External (Atlas dashboard) | ☐ |
| S0-BE-02 | Fix login route (bcrypt + manager lookup) | `backend/app/blueprints/auth/routes.py` | ☐ |
| S0-BE-03 | Create `@role_required` decorator | `backend/app/utils/decorators.py` | ☐ |
| S0-BE-04 | Create seed script + run it locally | `backend/seed/seed_manager.py` | ☐ |
| S0-BE-05 | Fix `wsgi.py` debug flag | `backend/wsgi.py` | ☐ |
| S0-BE-06 | Create `gunicorn_conf.py` | `backend/gunicorn_conf.py` | ☐ |
| S0-BE-07 | Create audit log utility | `backend/app/utils/audit.py` | ☐ |
| S0-BE-08 | Create stub blueprints for all missing modules | `backend/app/blueprints/evaluator/`, `hod/`, `dean/` + remaining manager routes | ☐ |
| S0-BE-09 | Register all stub blueprints in `app/__init__.py` | `backend/app/__init__.py` | ☐ |
| S0-BE-10 | Add `@role_required` to all existing placeholder routes | All existing `routes.py` files | ☐ |
| S0-BE-11 | Fill `PR template` and create CI workflow | `.github/PULL_REQUEST_TEMPLATE.md`, `.github/workflows/ci.yml` | ☐ |

---

### Ramsha (Frontend Lead) — Frontend Foundation

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S0-FE-01 | Clean the Vite default template | Delete `App.css`, reset `index.css`, reset `App.jsx` | ☐ |
| S0-FE-02 | Configure Tailwind CSS | `tailwind.config.js`, `index.css` | ☐ |
| S0-FE-03 | Create `api.js` service | `frontend/src/services/api.js` | ☐ |
| S0-FE-04 | Create `AuthContext.jsx` | `frontend/src/context/AuthContext.jsx` | ☐ |
| S0-FE-05 | Update `main.jsx` | `frontend/src/main.jsx` | ☐ |
| S0-FE-06 | Create `AppRouter.jsx` with `ProtectedRoute` | `frontend/src/routes/AppRouter.jsx` | ☐ |
| S0-FE-07 | Create `DashboardLayout.jsx` (skeleton) | `frontend/src/layouts/DashboardLayout.jsx` | ☐ |
| S0-FE-08 | Create `Sidebar.jsx` with role-based nav config | `frontend/src/layouts/Sidebar.jsx` | ☐ |
| S0-FE-09 | Create `frontend/.env.example` | `frontend/.env.example` | ☐ |
| S0-FE-10 | Create `frontend/.env` locally (not committed) | `frontend/.env` | ☐ |

---

### Sara (Frontend Pages) — Login Page

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S0-UI-01 | Create `LoginPage.jsx` (functional form) | `frontend/src/pages/LoginPage.jsx` | ☐ |
| S0-UI-02 | Wire login form to `POST /api/auth/login` | Inside `LoginPage.jsx` | ☐ |
| S0-UI-03 | Store token + user in `AuthContext` after login | `LoginPage.jsx` + `AuthContext.jsx` | ☐ |
| S0-UI-04 | Redirect to correct dashboard after login | `LoginPage.jsx` using React Router `useNavigate` | ☐ |
| S0-UI-05 | Show error message on wrong credentials | `LoginPage.jsx` | ☐ |

---

### Ibrahim (Backend + Testing) — Validators, Indexes, and CI

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S0-QA-01 | Create `validators.py` with shared helpers | `backend/app/utils/validators.py` | ☐ |
| S0-QA-02 | Create `pytest` test infrastructure | `backend/tests/conftest.py`, `backend/tests/__init__.py` | ☐ |
| S0-QA-03 | Write login tests (success + wrong password + manager) | `backend/tests/test_auth.py` | ☐ |
| S0-QA-04 | Fix `docker-compose.yml` (add Mongo auth) | `docker-compose.yml` | ☐ |
| S0-QA-05 | Update `CONTRIBUTING.md` (fix config snippet) | `CONTRIBUTING.md` | ☐ |
| S0-QA-06 | Update `README.md` (fix repo URL, BNU domain) | `README.md` | ☐ |
| S0-QA-07 | Create model constant files | `backend/app/models/*.py` | ☐ |

---

## Step-by-Step Instructions Per Task

---

### S0-BE-01: Rotate MongoDB Atlas Credentials

**Why:** The current credentials (`ismailrizwanrana_db_user:xA6aCUKBuTNK2UXY`) are visible in `backend/.env`. If this file was ever committed to Git, those credentials are in the history permanently (even if deleted).

**Steps:**
1. Open [MongoDB Atlas](https://cloud.mongodb.com) → Login → Select your `PBLSystem` cluster
2. Go to **Database Access** in the left sidebar
3. Click the **Edit** button next to `ismailrizwanrana_db_user`
4. Click **Autogenerate Secure Password** → Copy the new password
5. Click **Update User**
6. Wait ~30 seconds for the change to propagate
7. Open `backend/.env` on your local machine
8. Replace the old password in the `MONGO_URI` connection string with the new password
9. **Verify:** Run `docker-compose up backend` — if the server starts without a connection error, the credentials work
10. Check Git history: run `git log --all --full-history -- backend/.env`
    - If this shows any commit hashes, the file was committed. You must clean history using BFG Repo Cleaner (ask for help if needed)
    - If this shows nothing, the file was never committed — you are safe

---

### S0-BE-02: Fix Login Route

The complete fixed `auth/routes.py` is provided in the Stage 2 Foundation Package (File 3). Copy it exactly.

**Key changes from the broken version:**
- `bcrypt.checkpw()` replaces the direct `!=` comparison
- Login now searches the unified `users` collection (not separate `students` + `teachers`)
- JWT token includes `role`, `dept`, `section`, `course`, `name`, `email` in additional claims
- Added `/me` endpoint to get current user from token
- Added `change-password` endpoint

**Test that it works:**
1. Run `python seed/seed_manager.py` first (creates the manager account)
2. Open Postman → `POST http://localhost:5000/api/auth/login`
3. Body: `{"email": "manager@bnu.edu.pk", "password": "Admin@BNU2026"}`
4. Expected: `200 OK` with a `token` in the response
5. Copy the token → test `GET /api/auth/me` with `Authorization: Bearer <token>`
6. Expected: `200 OK` with your name, email, and role

---

### S0-BE-03: Create `@role_required` Decorator

The complete implementation is provided in Stage 2 Foundation Package (File 1). Copy it exactly to `backend/app/utils/decorators.py`.

**How to verify it works:**
```python
# In any test route file:
@some_bp.route("/test-manager", methods=["GET"])
@role_required("pbl_manager")
def test_manager():
    return {"message": "Only manager can see this"}, 200
```

Test with Postman:
- Without token → expect `401 Unauthorized`
- With student token → expect `403 Forbidden`
- With manager token → expect `200 OK`

---

### S0-BE-04: Seed Script

The complete script is provided in Stage 2 Foundation Package (File 2). Copy it to `backend/seed/seed_manager.py`.

**Run it:**
```bash
# From the backend/ directory
python seed/seed_manager.py
```

**Expected output:**
```
Manager account created: manager@bnu.edu.pk / Admin@BNU2026
IMPORTANT: Change this password after first login!

Creating indexes...
All indexes created successfully.

Seed complete. You can now log in as the manager.
```

> [!WARNING]
> The initial manager password `Admin@BNU2026` in the seed script is a placeholder. Change it to a strong password before sharing the system with anyone.

---

### S0-BE-05: Fix `wsgi.py`

```python
# backend/wsgi.py
import os
from app import create_app

app = create_app()

if __name__ == "__main__":
    debug = os.getenv("FLASK_ENV", "production") == "development"
    app.run(debug=debug, port=5000)
```

**Why:** `debug=True` in production runs Flask's built-in insecure server (single-threaded, exposes debugger with interactive Python console). Always use `gunicorn` for production, and set `debug` based on the environment variable.

---

### S0-BE-07: Audit Log Utility

```python
# backend/app/utils/audit.py
"""
Audit log helper. Call log_audit() after every mutation.

Usage:
    from app.utils.audit import log_audit
    log_audit(
        db=mongo.db,
        actor_id=current_user_id,
        actor_role=current_user_role,
        entity="students",
        action="create",
        target_id=new_student_id,
        new_value={"name": "Ahmed", "roll": "BCSM-F23-551"}
    )
"""
from datetime import datetime, timezone
from flask import request


def log_audit(db, actor_id, actor_role, entity, action, target_id=None, old_value=None, new_value=None):
    """
    Appends an immutable audit record to the audit_log collection.
    Never raises an exception — if logging fails, the operation still succeeds.
    """
    try:
        db.audit_log.insert_one({
            "timestamp": datetime.now(timezone.utc),
            "actor_id": actor_id,
            "actor_role": actor_role,
            "entity": entity,
            "action": action,         # "create" | "update" | "delete" | "restore" | "login"
            "target_id": target_id,
            "old_value": old_value,
            "new_value": new_value,
            "ip_address": request.remote_addr if request else None,
        })
    except Exception:
        pass  # Audit failure must never break the main operation
```

---

### S0-BE-08: Create Stub Blueprints

Each stub blueprint should have the minimum code needed to register with Flask, with placeholder routes that return a clear "not yet implemented" message. This lets the frontend and Postman confirm routing works before real logic is added.

**Template for each stub:**

```python
# backend/app/blueprints/evaluator/__init__.py
from flask import Blueprint

evaluator_bp = Blueprint("evaluator", __name__)

from . import routes  # noqa: F401, E402
```

```python
# backend/app/blueprints/evaluator/routes.py
from flask import jsonify
from app.blueprints.evaluator import evaluator_bp
from app.utils.decorators import role_required


@evaluator_bp.route("/dashboard", methods=["GET"])
@role_required("evaluator")
def dashboard():
    return jsonify({"success": True, "message": "Evaluator dashboard — Sprint 4", "data": {}}), 200


@evaluator_bp.route("/groups", methods=["GET"])
@role_required("evaluator")
def groups():
    return jsonify({"success": True, "message": "Evaluator groups — Sprint 4", "data": []}), 200
```

Repeat this pattern for:
- `backend/app/blueprints/hod/` → `@role_required("hod", "hodic")`
- `backend/app/blueprints/dean/` → `@role_required("dean")`
- Remaining manager routes: `departments.py`, `courses.py`, `teachers.py`, `assignments.py`, `iterations.py`, `surveys.py`, `announcements.py`, `reports.py`

---

### S0-BE-09: Register All Blueprints in `app/__init__.py`

```python
# backend/app/__init__.py
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from app.extensions import mongo
from app.config import Config
from app.utils.error_handlers import register_error_handlers


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    mongo.init_app(app)
    JWTManager(app)
    CORS(app)  # TODO Sprint 8: restrict to specific origins

    # Register all blueprints
    from app.blueprints.auth.routes import auth_bp
    from app.blueprints.manager.students import students_bp
    from app.blueprints.manager.departments import departments_bp
    from app.blueprints.manager.courses import courses_bp
    from app.blueprints.manager.teachers import teachers_bp
    from app.blueprints.manager.groups import manager_groups_bp
    from app.blueprints.manager.assignments import assignments_bp
    from app.blueprints.manager.iterations import iterations_bp
    from app.blueprints.manager.surveys import surveys_bp
    from app.blueprints.manager.announcements import announcements_bp
    from app.blueprints.manager.reports import reports_bp
    from app.blueprints.student.groups import student_groups_bp
    from app.blueprints.student.iterations import student_iterations_bp
    from app.blueprints.student.surveys import student_surveys_bp
    from app.blueprints.evaluator.routes import evaluator_bp
    from app.blueprints.hod.routes import hod_bp
    from app.blueprints.dean.routes import dean_bp

    app.register_blueprint(auth_bp,               url_prefix="/api/auth")
    app.register_blueprint(students_bp,            url_prefix="/api/manager/students")
    app.register_blueprint(departments_bp,         url_prefix="/api/manager/departments")
    app.register_blueprint(courses_bp,             url_prefix="/api/manager/courses")
    app.register_blueprint(teachers_bp,            url_prefix="/api/manager/teachers")
    app.register_blueprint(manager_groups_bp,      url_prefix="/api/manager/groups")
    app.register_blueprint(assignments_bp,         url_prefix="/api/manager/assignments")
    app.register_blueprint(iterations_bp,          url_prefix="/api/manager/iterations")
    app.register_blueprint(surveys_bp,             url_prefix="/api/manager/surveys")
    app.register_blueprint(announcements_bp,       url_prefix="/api/manager/announcements")
    app.register_blueprint(reports_bp,             url_prefix="/api/manager/reports")
    app.register_blueprint(student_groups_bp,      url_prefix="/api/student/groups")
    app.register_blueprint(student_iterations_bp,  url_prefix="/api/student/iterations")
    app.register_blueprint(student_surveys_bp,     url_prefix="/api/student/surveys")
    app.register_blueprint(evaluator_bp,           url_prefix="/api/evaluator")
    app.register_blueprint(hod_bp,                 url_prefix="/api/hod")
    app.register_blueprint(dean_bp,                url_prefix="/api/dean")

    register_error_handlers(app)

    return app
```

---

### S0-FE-01: Clean the Vite Default Template

```bash
# Delete these files:
frontend/src/App.css           ← delete
frontend/src/assets/react.svg  ← delete
```

```jsx
// Replace frontend/src/App.jsx with:
// App.jsx just renders the router. All routing is in AppRouter.jsx.
import AppRouter from './routes/AppRouter';

export default function App() {
  return <AppRouter />;
}
```

```css
/* Replace frontend/src/index.css with Tailwind imports: */
@import "tailwindcss";

/* Global base styles */
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  font-family: 'Inter', 'Segoe UI', sans-serif;
  font-size: 14px;
  background-color: #f3f4f6;
  color: #374151;
  -webkit-font-smoothing: antialiased;
}

a {
  text-decoration: none;
  color: inherit;
}
```

---

### S0-FE-07: Create `DashboardLayout.jsx` (Skeleton)

```jsx
// frontend/src/layouts/DashboardLayout.jsx
import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';

export default function DashboardLayout() {
  const { user, logout } = useAuth();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Navbar */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '60px',
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 18px', zIndex: 500
      }}>
        <div style={{ fontWeight: 700, fontSize: '15px', color: '#1e3a5f' }}>
          BNU PBL Portal
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            background: '#eff6ff', color: '#2563eb', fontSize: '11px',
            fontWeight: 600, padding: '4px 10px', borderRadius: '20px', textTransform: 'uppercase'
          }}>
            {user?.role?.replace('_', ' ')}
          </span>
          <span style={{ fontSize: '13px', color: '#374151' }}>{user?.name}</span>
          <button
            onClick={logout}
            style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <Sidebar />

      {/* Page Content */}
      <main style={{ marginLeft: '220px', marginTop: '60px', padding: '24px', flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}
```

---

### S0-FE-08: Create `Sidebar.jsx`

```jsx
// frontend/src/layouts/Sidebar.jsx
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Define navigation items per role
const NAV_CONFIG = {
  pbl_manager: [
    { label: 'Dashboard', path: '/manager/dashboard' },
    { label: 'Students', path: '/manager/students' },
    { label: 'Departments', path: '/manager/departments' },
    { label: 'Courses', path: '/manager/courses' },
    { label: 'Teachers', path: '/manager/teachers' },
    { label: 'Groups', path: '/manager/groups' },
    { label: 'Iterations', path: '/manager/iterations' },
    { label: 'Surveys', path: '/manager/surveys' },
    { label: 'Reports', path: '/manager/reports' },
  ],
  student: [
    { label: 'Dashboard', path: '/student/dashboard' },
    { label: 'My Group', path: '/student/groups/my' },
    { label: 'Browse Groups', path: '/student/groups' },
    { label: 'Create Group', path: '/student/groups/create' },
    { label: 'Iterations', path: '/student/iterations' },
    { label: 'Surveys', path: '/student/surveys' },
  ],
  evaluator: [
    { label: 'Dashboard', path: '/evaluator/dashboard' },
    { label: 'Assigned Groups', path: '/evaluator/groups' },
    { label: 'Exhibition', path: '/evaluator/exhibition' },
    { label: 'Meetings', path: '/evaluator/meetings' },
  ],
  hod: [
    { label: 'Dashboard', path: '/hod/dashboard' },
    { label: 'All Groups', path: '/hod/groups' },
    { label: 'Group Reports', path: '/hod/reports/groups' },
    { label: 'Iteration Reports', path: '/hod/reports/iterations' },
  ],
  hodic: [
    { label: 'Dashboard', path: '/hod/dashboard' },
    { label: 'All Groups', path: '/hod/groups' },
    { label: 'Group Reports', path: '/hod/reports/groups' },
    { label: 'Iteration Reports', path: '/hod/reports/iterations' },
  ],
  dean: [
    { label: 'Dashboard', path: '/dean/dashboard' },
    { label: 'All Groups', path: '/dean/groups' },
    { label: 'Group Reports', path: '/dean/reports/groups' },
    { label: 'Iteration Reports', path: '/dean/reports/iterations' },
  ],
};

export default function Sidebar() {
  const { user } = useAuth();
  const navItems = NAV_CONFIG[user?.role] || [];

  return (
    <aside style={{
      position: 'fixed', top: '60px', left: 0, bottom: 0, width: '220px',
      background: '#1e2d3d', color: '#cbd5e1', overflowY: 'auto', zIndex: 400,
      paddingTop: '16px', paddingBottom: '30px'
    }}>
      <div style={{ padding: '8px 16px 16px', fontSize: '11px', color: '#64748b',
        textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700 }}>
        Navigation
      </div>
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          style={({ isActive }) => ({
            display: 'block',
            padding: '10px 18px',
            fontSize: '13.5px',
            fontWeight: isActive ? 600 : 400,
            color: isActive ? '#fff' : '#94a3b8',
            background: isActive ? 'rgba(37,99,235,0.3)' : 'transparent',
            borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
            textDecoration: 'none',
            transition: 'all 0.15s',
          })}
        >
          {item.label}
        </NavLink>
      ))}
    </aside>
  );
}
```

---

### S0-UI-01 to S0-UI-05: Login Page

```jsx
// frontend/src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// Where each role goes after login
const ROLE_HOME = {
  pbl_manager: '/manager/dashboard',
  student:     '/student/dashboard',
  evaluator:   '/evaluator/dashboard',
  hod:         '/hod/dashboard',
  hodic:       '/hod/dashboard',
  dean:        '/dean/dashboard',
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api.post('/auth/login', { email: email.trim(), password });
      // result is { success, message, data: { token, user } } (envelope already unwrapped by interceptor)
      login(result.data.user, result.data.token);
      navigate(ROLE_HOME[result.data.user.role] || '/login', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #eef4f8 0%, #f0f4ff 100%)', padding: '20px'
    }}>
      <div style={{
        background: '#fff', width: '380px', maxWidth: '100%', borderRadius: '6px',
        borderTop: '4px solid #2563eb', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', padding: '36px 32px 28px'
      }}>
        {/* Logo */}
        <div style={{
          width: '46px', height: '46px', borderRadius: '10px', background: '#2563eb', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: '15px', margin: '0 auto 14px'
        }}>
          BNU
        </div>

        <h1 style={{ textAlign: 'center', fontSize: '20px', fontWeight: 700, color: '#1e3a5f', margin: '0 0 4px' }}>
          Sign In
        </h1>
        <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '13px', marginBottom: '24px' }}>
          PBL Management System
        </p>

        {/* Error message */}
        {error && (
          <div style={{
            background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
            padding: '8px 12px', borderRadius: '4px', fontSize: '13px', marginBottom: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '5px' }}>
              Email Address
            </label>
            <input
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. BCSM-F23-551@bnu.edu.pk"
              required
              style={{
                width: '100%', border: '1px solid #d1d5db', borderRadius: '4px',
                padding: '9px 12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '5px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              style={{
                width: '100%', border: '1px solid #d1d5db', borderRadius: '4px',
                padding: '9px 12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', background: loading ? '#93c5fd' : '#2563eb', color: '#fff',
              border: 'none', borderRadius: '4px', padding: '10px', fontSize: '14px',
              fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '22px', color: '#9ca3af', fontSize: '12px' }}>
          BEACONHOUSE NATIONAL UNIVERSITY · PBL PORTAL
        </p>
      </div>
    </div>
  );
}
```

---

### S0-QA-02 and S0-QA-03: Test Infrastructure

```python
# backend/tests/conftest.py
"""
Pytest fixtures shared across all test files.
"""
import pytest
import bcrypt
from app import create_app
from app.extensions import mongo


@pytest.fixture(scope="session")
def app():
    """Create a test Flask application."""
    flask_app = create_app()
    flask_app.config["TESTING"] = True
    flask_app.config["MONGO_URI"] = "mongodb://localhost:27017/pbl_test"
    return flask_app


@pytest.fixture(scope="session")
def client(app):
    """Create a test client."""
    return app.test_client()


@pytest.fixture(autouse=True)
def clean_db(app):
    """Clean the test database before each test."""
    with app.app_context():
        # Drop all collections before each test
        for collection in mongo.db.list_collection_names():
            mongo.db[collection].drop()
    yield


@pytest.fixture
def manager_user(app):
    """Insert a test manager and return credentials."""
    with app.app_context():
        password = "Test@Manager2026"
        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        mongo.db.users.insert_one({
            "name": "Test Manager",
            "email": "manager@bnu.edu.pk",
            "password_hash": hashed,
            "role": "pbl_manager",
            "dept": None,
            "deleted": False,
        })
        return {"email": "manager@bnu.edu.pk", "password": password}
```

```python
# backend/tests/test_auth.py
"""
Tests for POST /api/auth/login
"""


def test_login_success(client, manager_user):
    """Manager can log in with correct credentials."""
    resp = client.post("/api/auth/login", json={
        "email": manager_user["email"],
        "password": manager_user["password"]
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True
    assert "token" in data["data"]
    assert data["data"]["user"]["role"] == "pbl_manager"


def test_login_wrong_password(client, manager_user):
    """Wrong password returns 401."""
    resp = client.post("/api/auth/login", json={
        "email": manager_user["email"],
        "password": "wrong-password"
    })
    assert resp.status_code == 401
    assert resp.get_json()["success"] is False


def test_login_unknown_email(client):
    """Unknown email returns 401."""
    resp = client.post("/api/auth/login", json={
        "email": "nobody@bnu.edu.pk",
        "password": "anything"
    })
    assert resp.status_code == 401


def test_login_missing_fields(client):
    """Missing email returns 400."""
    resp = client.post("/api/auth/login", json={"password": "only-password"})
    assert resp.status_code == 400


def test_role_required_blocks_wrong_role(client, manager_user):
    """A manager token cannot access a student endpoint."""
    # Login as manager
    resp = client.post("/api/auth/login", json=manager_user)
    token = resp.get_json()["data"]["token"]

    # Try to access a student route
    resp = client.get("/api/student/groups", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403


def test_no_token_returns_401(client):
    """Protected routes return 401 without a token."""
    resp = client.get("/api/manager/students")
    assert resp.status_code == 401
```

---

### S0-QA-04: Fix Docker Compose

```yaml
# docker-compose.yml — corrected version
version: "3.8"

services:
  mongo:
    image: mongo:7
    container_name: pbl-mongo
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: adminpass
      MONGO_INITDB_DATABASE: pbl_system
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  backend:
    build: ./backend
    container_name: pbl-backend
    env_file: ./backend/.env
    ports:
      - "5000:5000"
    depends_on:
      - mongo
    volumes:
      - ./backend:/app
      - /app/venv  # Exclude venv from bind mount

  frontend:
    build: ./frontend
    container_name: pbl-frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend
    volumes:
      - ./frontend:/app
      - /app/node_modules  # Exclude node_modules from bind mount
    environment:
      - VITE_API_URL=http://localhost:5000/api

volumes:
  mongo_data:
```

> [!NOTE]
> For local Docker development, update the `MONGO_URI` in `backend/.env` to:
> `mongodb://admin:adminpass@mongo:27017/pbl_system?authSource=admin`
> For Atlas (staging/production), keep the Atlas connection string.

---

### S0-QA-07: Model Constant Files

Model files in this project are NOT an ORM. They are Python files that define **field name constants** and **status enums** to prevent typos across the codebase.

```python
# backend/app/models/user.py
"""Field constants for the users collection."""

COLLECTION = "users"

class Role:
    MANAGER   = "pbl_manager"
    STUDENT   = "student"
    EVALUATOR = "evaluator"
    HOD       = "hod"
    HODIC     = "hodic"
    DEAN      = "dean"
    ALL       = [MANAGER, STUDENT, EVALUATOR, HOD, HODIC, DEAN]
    OVERSIGHT = [HOD, HODIC, DEAN]

class Field:
    ID             = "_id"
    NAME           = "name"
    EMAIL          = "email"
    PASSWORD_HASH  = "password_hash"
    ROLE           = "role"
    DEPT           = "dept"
    SECTION        = "section"
    COURSE         = "course"
    ROLL           = "roll"
    RECOVERY_EMAIL = "recovery_email"
    TYPE           = "type"
    DELETED        = "deleted"
    DELETED_AT     = "deleted_at"
    CREATED_AT     = "created_at"
    UPDATED_AT     = "updated_at"
```

```python
# backend/app/models/group.py
COLLECTION = "groups"

class Status:
    PENDING  = "pending"
    APPROVED = "approved"
    DELETED  = "deleted"

class Field:
    ID           = "_id"
    NAME         = "name"
    PROJECT_TITLE = "project_title"
    COURSE       = "course"
    DEPT         = "dept"
    SECTION      = "section"
    LEADER_ID    = "leader_id"
    MEMBER_IDS   = "member_ids"
    STATUS       = "status"
    EVALUATED    = "evaluated"
    VERSION      = "version"
    CREATED_AT   = "created_at"
    UPDATED_AT   = "updated_at"
```

Repeat for: `join_request.py`, `iteration.py`, `submission.py`, `evaluation.py`, `survey.py`, `survey_response.py`, `announcement.py`, `attachment.py`, `meeting.py`, `assignment.py`, `department.py`, `course.py`, `audit_log.py`.

---

## Sprint 0 Acceptance Criteria

All items must be true before Sprint 1 begins. Check each one off:

### Security
- [ ] MongoDB Atlas credentials have been rotated and the old string no longer connects
- [ ] `backend/.env` has never been committed to Git (or history has been cleaned)
- [ ] `backend/.env` is listed in `.gitignore` and NOT tracked by Git
- [ ] Login endpoint uses `bcrypt.checkpw()` — no plaintext comparison anywhere

### Authentication
- [ ] `POST /api/auth/login` with `manager@bnu.edu.pk` returns `200 OK` with a JWT token
- [ ] `GET /api/auth/me` with a valid token returns correct user data
- [ ] `POST /api/auth/login` with wrong password returns `401 Unauthorized`
- [ ] Any protected route without a token returns `401 Unauthorized`
- [ ] A student token on a manager route returns `403 Forbidden`
- [ ] A manager token on a student route returns `403 Forbidden`

### Backend Structure
- [ ] `backend/app/utils/decorators.py` exists with `@role_required`
- [ ] `backend/seed/seed_manager.py` exists and runs without errors
- [ ] All placeholder routes now have `@role_required` applied
- [ ] `backend/app/blueprints/evaluator/`, `hod/`, `dean/` stub blueprints exist and are registered
- [ ] All remaining manager blueprint stubs exist (departments, courses, teachers, assignments, iterations, surveys, announcements, reports)
- [ ] `backend/app/__init__.py` registers all blueprints at correct URL prefixes
- [ ] `backend/app/utils/audit.py` exists with `log_audit()` function
- [ ] `backend/app/models/` contains constant files for all 16 collections
- [ ] `wsgi.py` does not have hard-coded `debug=True`
- [ ] `gunicorn_conf.py` exists with correct production settings

### Frontend Structure
- [ ] Vite default template (react.svg, App.css, counter) has been deleted
- [ ] `frontend/src/context/AuthContext.jsx` exists — `login()`, `logout()`, `user`, `isAuthenticated`
- [ ] `frontend/src/services/api.js` exists — Axios instance with Bearer interceptor
- [ ] `frontend/src/routes/AppRouter.jsx` exists with `ProtectedRoute`
- [ ] `frontend/src/layouts/DashboardLayout.jsx` exists — navbar + sidebar shell + `<Outlet />`
- [ ] `frontend/src/layouts/Sidebar.jsx` exists — role-based nav links per role
- [ ] `frontend/src/pages/LoginPage.jsx` exists — form functional, calls API, stores token, redirects
- [ ] `frontend/src/main.jsx` wraps app in `<AuthProvider>`
- [ ] Tailwind CSS is configured and working (`npm run dev` compiles without errors)
- [ ] `frontend/.env.example` exists with `VITE_API_URL=http://localhost:5000/api`

### Infrastructure
- [ ] `.github/PULL_REQUEST_TEMPLATE.md` is filled (not 0 bytes)
- [ ] `.github/workflows/ci.yml` exists — lint runs on PRs to `develop` and `main`
- [ ] `docker-compose.yml` has MongoDB auth configured
- [ ] `README.md` clone URL corrected to `erp-management-system`
- [ ] `CONTRIBUTING.md` config snippet corrected

### Testing
- [ ] `backend/tests/conftest.py` exists with fixtures
- [ ] `backend/tests/test_auth.py` exists — all 6 tests pass (`pytest tests/ -v`)
- [ ] `pytest tests/ -v` runs without import errors

### Integration Verification
- [ ] `docker-compose up` starts all three services without errors
- [ ] Login page at `http://localhost:5173` shows the BNU PBL login form
- [ ] Entering manager credentials in the browser → redirects to `/manager/dashboard`
- [ ] Entering student credentials → redirects to `/student/dashboard`
- [ ] Visiting `/manager/dashboard` without being logged in → redirected to `/login`

---

## Definition of Done — Sprint 0

Sprint 0 is done when:
1. All acceptance criteria above are checked
2. Every team member can `git clone` + `docker-compose up` and see the login page
3. `pytest tests/ -v` passes with at least the 6 auth tests
4. A PR has been opened for every Sprint 0 change, reviewed, and merged to `develop`
5. `develop` branch is green in GitHub Actions

---

## Common Beginner Mistakes to Avoid

| Mistake | Why It Happens | How to Avoid |
|---------|---------------|--------------|
| Committing `.env` after fixing it | `git add .` catches everything | Always run `git status` before `git commit`; verify `.gitignore` works with `git check-ignore -v backend/.env` |
| Installing packages globally instead of in venv | Forgot to activate virtual environment | Always run `source venv/bin/activate` (Mac/Linux) or `venv\Scripts\activate` (Windows) before pip install |
| JWT `exp` claim mismatch | Using wrong token from Postman after rotating secrets | Clear Postman variables; log in again to get a fresh token |
| Tailwind classes not working | Tailwind config not pointing at `src/**` files | Check `tailwind.config.js` content array includes `./src/**/*.{js,jsx}` |
| `@role_required` import fails | Wrong import path | Use `from app.utils.decorators import role_required` |
| Tests fail with `MongoClient` error | Test MongoDB not running | Start Docker mongo service first; or use `mongomock` |
| React Router `useNavigate` crash | Used outside `<BrowserRouter>` | Ensure `AppRouter` wraps everything in `<BrowserRouter>` (already done in the provided code) |
| Login redirects to wrong page | `ROLE_HOME` map missing a role | Check all 6 roles are in the `ROLE_HOME` object in `LoginPage.jsx` |
| Sidebar shows no items | User role not in `NAV_CONFIG` | Add the missing role to `Sidebar.jsx` `NAV_CONFIG` object |
| `docker-compose up` fails with connection refused | Frontend trying to reach `localhost:5000` inside Docker | Use Docker service name `http://backend:5000` inside Docker; `http://localhost:5000` for browser |

---

*End of Sprint 0 Document*
*Next: Sprint 0 is complete → Begin Sprint 1 (Manager Dashboard)*
