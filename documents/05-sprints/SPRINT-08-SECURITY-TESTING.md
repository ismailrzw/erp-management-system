# Sprint 8 — Security Hardening and Testing
## PBL Management System · Beaconhouse National University
**Sprint Goal:** All known security vulnerabilities are fixed. Rate limiting is applied to the login endpoint. CORS is restricted to the production frontend URL. At least 30 automated tests pass. Every team member has reviewed another member's code against the security checklist.
**FRs Covered:** NFR-S-01 through NFR-S-10 (all security non-functional requirements)
**Dependency:** Sprint 7 fully complete — all features must be implemented before security hardening, otherwise new features added later will not be covered.
**Owners:** Ismail (all backend security hardening), Ibrahim (all automated testing), All team (code review round)

---

> [!CAUTION]
> Do NOT skip Sprint 8 before deploying to production. Every item in this sprint is a real security requirement, not optional polish. Deploying with `debug=True`, wildcard CORS, or missing `@role_required` is a production security incident.

---

## Why Sprint 8 Exists

The earlier sprints built features quickly. Sprint 8 is the checkpoint where security, reliability, and code quality are verified systematically:
- Features built under deadline pressure may have missing role checks
- CORS wildcard (`*`) is acceptable in development but dangerous in production
- A login endpoint without rate limiting is vulnerable to brute-force attacks
- Without automated tests, regressions go undetected

---

## Sprint 8 Tasks by Team Member

### Ismail — Backend Security

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S8-SEC-01 | Restrict CORS to known frontend origin | `backend/app/__init__.py` | ☐ |
| S8-SEC-02 | Add `MAX_CONTENT_LENGTH = 10 MB` to config (file upload guard) | `backend/app/config.py` | ☐ |
| S8-SEC-03 | Add rate limiting to login endpoint (5 requests/minute/IP) | `backend/app/blueprints/auth/routes.py` | ☐ |
| S8-SEC-04 | Audit all PUT endpoints — remove `role`, `email`, `password_hash` from updatable fields | All blueprint files | ☐ |
| S8-SEC-05 | Audit all routes for missing `@role_required` | All blueprint files | ☐ |
| S8-SEC-06 | Ensure `debug=False` in all production-facing configs | `backend/app/config.py`, `wsgi.py` | ☐ |
| S8-SEC-07 | Verify `.env` is in `.gitignore` and not tracked in Git | `.gitignore`, run check command | ☐ |
| S8-SEC-08 | Remove all hardcoded fallback secrets | `backend/app/config.py` — raise if missing, don't default | ☐ |

---

### Ibrahim — Automated Tests

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S8-QA-01 | Write `tests/test_role_boundaries.py` (every role blocked on wrong endpoint) | `backend/tests/test_role_boundaries.py` | ☐ |
| S8-QA-02 | Write `tests/test_dept_scoping.py` (HOD locked to own dept — if not done in Sprint 5) | `backend/tests/test_dept_scoping.py` | ☐ |
| S8-QA-03 | Ensure all Sprint 0–7 tests still pass (no regressions) | Run `pytest tests/ -v` | ☐ |
| S8-QA-04 | Achieve ≥ 30 passing tests | Run `pytest tests/ --tb=short` | ☐ |
| S8-QA-05 | Verify CI pipeline runs all tests on every PR | `.github/workflows/ci.yml` | ☐ |

---

### All Team — Code Review Round

Each team member reviews one other person's code. Assignments:
- Ismail reviews Ibrahim's test files
- Ibrahim reviews Ismail's blueprints
- Ramsha reviews Sara's pages
- Sara reviews Ramsha's components

**Review against this checklist for every blueprint file:**
- [ ] Every route has `@role_required`
- [ ] Every mutation calls `log_audit()`
- [ ] No `password_hash` returned in any response
- [ ] No secrets in the code (no hardcoded passwords, tokens, or URIs)
- [ ] Input is validated before touching MongoDB

---

## Step-by-Step Instructions Per Task

---

### S8-SEC-01: Restrict CORS

```python
# backend/app/__init__.py — update the CORS configuration

from flask_cors import CORS
import os

def create_app():
    app = Flask(__name__)
    # ...

    # In development: allow localhost
    # In production: restrict to the real frontend URL
    allowed_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",")]

    CORS(app, resources={r"/api/*": {"origins": allowed_origins}},
         supports_credentials=True)

    # ... rest of app setup
    return app
```

**Set in `.env`:**
```bash
# Development:
CORS_ORIGINS=http://localhost:5173

# Staging:
CORS_ORIGINS=https://pbl-portal.vercel.app

# Production:
CORS_ORIGINS=https://pbl.bnu.edu.pk
```

---

### S8-SEC-03: Rate Limiting on Login

```bash
# Install Flask-Limiter
pip install Flask-Limiter
# Add to requirements.txt
```

```python
# backend/app/extensions.py — add limiter
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=[])
```

```python
# backend/app/__init__.py — init limiter
from app.extensions import mongo, jwt, limiter

def create_app():
    app = Flask(__name__)
    # ...
    limiter.init_app(app)
    # ...
```

```python
# backend/app/blueprints/auth/routes.py — apply to login
from app.extensions import limiter

@auth_bp.route("/login", methods=["POST"])
@limiter.limit("5 per minute")   # Max 5 login attempts per IP per minute
def login():
    # ... existing login code
```

---

### S8-SEC-04: Audit PUT Endpoints for Protected Fields

For every `PUT` endpoint in the system, verify the following pattern is applied:

```python
# Standard protection pattern for every PUT/update handler
@bp.route("/<item_id>", methods=["PUT"])
@role_required(Role.MANAGER)
def update_item(item_id):
    data = request.get_json() or {}

    # ALWAYS remove these fields — they must never be updatable via PUT
    IMMUTABLE_FIELDS = ["email", "roll", "role", "password_hash",
                        "_id", "created_at", "deleted", "deleted_at"]
    for field in IMMUTABLE_FIELDS:
        data.pop(field, None)

    if not data:
        return error_response("No updatable fields provided.", 400)

    # Only now proceed with the update
    data["updated_at"] = datetime.now(timezone.utc)
    # ...
```

---

### S8-SEC-05: Quick Route Audit Script

Run this to find routes that might be missing `@role_required`:

```bash
# From the backend/ directory
# This prints all @bp.route definitions and checks if @role_required appears before each
python -c "
import os, re

for root, _, files in os.walk('app/blueprints'):
    for fname in files:
        if not fname.endswith('.py'): continue
        path = os.path.join(root, fname)
        with open(path) as f:
            lines = f.readlines()
        for i, line in enumerate(lines):
            if '@bp.route' in line or '@' in line and '.route' in line:
                # Check if @role_required appears in the 3 lines above
                prev = ''.join(lines[max(0, i-3):i])
                if 'role_required' not in prev:
                    print(f'POSSIBLE MISSING @role_required: {path}:{i+1}')
                    print(f'  Line: {line.strip()}')
"
```

Review every line the script prints. If `@role_required` is intentionally missing (e.g., `/api/auth/login` which is a public endpoint), add a comment:

```python
# No @role_required — this is a public endpoint (login)
@auth_bp.route("/login", methods=["POST"])
def login():
```

---

### S8-SEC-07: Verify .env is Not Tracked

```bash
# Run these from the project root
git check-ignore -v backend/.env
# Expected output: backend/.gitignore:1:backend/.env  backend/.env
# If no output → the file is NOT gitignored → add it NOW

git log --all --full-history -- "backend/.env"
# Expected output: nothing (empty)
# If there are commits listed → credentials were committed → follow the R-01 procedure:
# Stage 6 Execution Guidance → Risk R-01 Response Plan
```

---

### S8-SEC-08: No Default Secrets in Config

```python
# backend/app/config.py — CORRECT pattern
import os

class Config:
    MONGO_URI = os.environ["MONGO_URI"]           # Raises KeyError if not set
    JWT_SECRET_KEY = os.environ["JWT_SECRET_KEY"]  # Raises KeyError if not set
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))  # Has safe default

# WRONG pattern (never do this):
class Config:
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")   # ← No! Falls back to localhost
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret")        # ← No! Insecure fallback
```

---

### S8-QA-01: Role Boundary Tests

```python
# backend/tests/test_role_boundaries.py
"""
Tests that every role is blocked on endpoints it should not access.
Each test uses a token for role X and calls an endpoint for role Y.
Expected result: 403 Forbidden
"""
import pytest

# --- Manager endpoints blocked for non-managers ---
def test_student_cannot_access_manager_students(client, student_token):
    resp = client.get("/api/manager/students",
                      headers={"Authorization": f"Bearer {student_token}"})
    assert resp.status_code == 403

def test_evaluator_cannot_access_manager_students(client, evaluator_token):
    resp = client.get("/api/manager/students",
                      headers={"Authorization": f"Bearer {evaluator_token}"})
    assert resp.status_code == 403

def test_hod_cannot_approve_group(client, hod_token):
    resp = client.patch("/api/manager/groups/fake-id/approve",
                        headers={"Authorization": f"Bearer {hod_token}"})
    assert resp.status_code == 403

def test_dean_cannot_create_student(client, dean_token):
    resp = client.post("/api/manager/students",
                       json={"name": "Test"},
                       headers={"Authorization": f"Bearer {dean_token}"})
    assert resp.status_code == 403

# --- Student endpoints blocked for non-students ---
def test_manager_cannot_create_group(client, manager_token):
    resp = client.post("/api/student/groups",
                       json={"name": "Test Group"},
                       headers={"Authorization": f"Bearer {manager_token}"})
    assert resp.status_code == 403

def test_evaluator_cannot_submit_iteration(client, evaluator_token, iteration_id):
    resp = client.post(f"/api/student/iterations/{iteration_id}/submit",
                       data={"file": (b"test", "file.pdf")},
                       content_type="multipart/form-data",
                       headers={"Authorization": f"Bearer {evaluator_token}"})
    assert resp.status_code == 403

# --- Evaluator endpoints blocked for non-evaluators ---
def test_student_cannot_submit_evaluation(client, student_token):
    resp = client.post("/api/evaluator/evaluations",
                       json={},
                       headers={"Authorization": f"Bearer {student_token}"})
    assert resp.status_code == 403

def test_manager_cannot_log_meeting(client, manager_token):
    resp = client.post("/api/evaluator/meetings",
                       json={},
                       headers={"Authorization": f"Bearer {manager_token}"})
    assert resp.status_code == 403

# --- HOD endpoints blocked for non-HOD ---
def test_student_cannot_access_hod_dashboard(client, student_token):
    resp = client.get("/api/hod/dashboard",
                      headers={"Authorization": f"Bearer {student_token}"})
    assert resp.status_code == 403

def test_dean_cannot_access_hod_groups(client, dean_token):
    resp = client.get("/api/hod/groups",
                      headers={"Authorization": f"Bearer {dean_token}"})
    assert resp.status_code == 403

# --- Dean endpoints blocked for non-Dean ---
def test_hod_cannot_access_dean_dashboard(client, hod_token):
    resp = client.get("/api/dean/dashboard",
                      headers={"Authorization": f"Bearer {hod_token}"})
    assert resp.status_code == 403

def test_student_cannot_access_dean_dashboard(client, student_token):
    resp = client.get("/api/dean/dashboard",
                      headers={"Authorization": f"Bearer {student_token}"})
    assert resp.status_code == 403

# --- Unauthenticated requests blocked ---
def test_no_token_blocked_on_manager_endpoint(client):
    resp = client.get("/api/manager/students")
    assert resp.status_code == 401

def test_no_token_blocked_on_student_endpoint(client):
    resp = client.get("/api/student/groups")
    assert resp.status_code == 401
```

---

## Sprint 8 Acceptance Criteria

### Security
- [ ] `CORS_ORIGINS` env var is set in `.env.example` and all origins use the env var (no hardcoded `"*"`)
- [ ] Login endpoint rate limited: 6th attempt in one minute returns `429 Too Many Requests`
- [ ] `MAX_CONTENT_LENGTH` set in Flask config: uploading a 15 MB file returns `413 Request Entity Too Large`
- [ ] `debug=False` in production Config class
- [ ] `git check-ignore -v backend/.env` confirms `.env` is gitignored
- [ ] `git log --all -- "backend/.env"` returns no commits
- [ ] `MONGO_URI` and `JWT_SECRET_KEY` raise `KeyError` if not in env (no defaults)
- [ ] No route returns `password_hash` in the response body

### Testing
- [ ] `pytest tests/ -v` output shows at least **30 PASSED** tests
- [ ] `tests/test_role_boundaries.py` all pass — all 14 boundary tests green
- [ ] `tests/test_dept_scoping.py` all pass — HOD scoping enforced
- [ ] No regressions — tests that passed in earlier sprints still pass
- [ ] CI GitHub Actions workflow runs `pytest` and shows green checkmark on `develop` branch

### Code Review
- [ ] Ismail's review of Ibrahim's files complete — all findings addressed
- [ ] Ibrahim's review of Ismail's files complete — all findings addressed
- [ ] Ramsha's review of Sara's files complete — all findings addressed
- [ ] Sara's review of Ramsha's files complete — all findings addressed

---

## Common Beginner Mistakes to Avoid

| Mistake | How to Avoid |
|---------|-------------|
| Merging Sprint 8 without CI passing | CI must be green before merge — never merge a failing PR |
| Rate limiter not initialised in `app/__init__.py` | `limiter.init_app(app)` must be called in `create_app()` |
| CORS still set to `"*"` after this sprint | Check with browser DevTools: Network → any API request → `Access-Control-Allow-Origin` header should NOT be `*` |
| `KeyError` on startup because `.env` is missing | Copy `.env.example` to `.env` and fill in values before `docker-compose up` |
| Test file not discovered by pytest | All test files must start with `test_` and all test functions must start with `test_` |
| `conftest.py` missing fixtures for role tokens | Add `manager_token`, `student_token`, etc. as fixtures in `tests/conftest.py` |
| Code review is superficial | Use the Definition of Done checklist as the review rubric — check every item |

---

*End of Sprint 8 Document*
*Next: Sprint 9 — Deployment to Staging and Production*
