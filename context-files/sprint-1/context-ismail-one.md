# 🚀 Project Handover & Context Summary

## 📋 Executive Overview

**Project:** ERP Management System (PBL Management System)
**Current Sprint:** Sprint 0 (Foundation & Security) — Complete
**Status:** ✅ **Backend authentication layer is fully functional and production-ready**

### What Was Accomplished

The backend authentication system has been completely implemented with:

- ✅ **JWT-based Authentication** — Token generation with 8-hour expiry and role claims
- ✅ **Secure Password Storage** — bcrypt hashing (no plaintext passwords)
- ✅ **Role-Based Access Control** — `@role_required` decorator for endpoint protection
- ✅ **Swagger/OpenAPI Documentation** — Interactive API docs at `/api/docs`
- ✅ **Modular Architecture** — Clear separation: Models → Services → Blueprints (Routes)
- ✅ **MongoDB Integration** — Unified `users` collection for all roles
- ✅ **Seed Script** — Initial manager account creation with hashed password
- ✅ **Docker Setup** — Fully containerized with MongoDB authentication
- ✅ **Middleware Solution** — Auto-fixes Authorization headers (adds `"Bearer "` prefix)
- ✅ **Error Handling** — Standardized success/error response format with JWT error handlers
- ✅ **Testing** — 4 passing auth tests (login success, wrong password, unknown user, `/me` endpoint)
- ✅ **Complete Database Schema** — 16 collections documented with relationships

### Key APIs Implemented

| Endpoint | Method | Description | Status |
|---|---|---|---|
| `/api/auth/login` | POST | Authenticate user and return JWT token | ✅ Working |
| `/api/auth/me` | GET | Get current user info from JWT token | ✅ Working |
| `/api/auth/change-password` | POST | Change user password | ✅ Working |
| `/api/docs` | GET | Swagger UI documentation | ✅ Working |

---

## 🏁 Getting Started

### Step 1: Clone the Repository

```console
git clone https://github.com/your-org/erp-management-system.git
cd erp-management-system
```

### Step 2: Environment Setup

Copy the environment template:

```console
cd backend
cp .env.example .env
```

Update `.env` with your values:

```env
# backend/.env
FLASK_APP=app
FLASK_ENV=development

# For local Docker MongoDB:
MONGO_URI=mongodb://admin:adminpass@mongo:27017/pbl_system?authSource=admin

# For MongoDB Atlas (production):
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/pbl_system

JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
JWT_ACCESS_TOKEN_EXPIRES=28800  # 8 hours in seconds
```

### Step 3: Build and Run with Docker

Build and start all services:

```console
docker-compose up --build
```

Run in detached mode (background):

```console
docker-compose up -d
```

View logs:

```console
docker-compose logs -f
```

Stop all services:

```console
docker-compose down
```

---

## 📁 Files Modified & Created

### Core Application Files

| File | Status | What Changed | Why |
|---|---|---|---|
| `app/__init__.py` | **REWRITTEN** | App factory with Flask-RESTx API, JWT handlers, middleware registration | To properly integrate Swagger UI, fix JWT errors, and auto-fix Authorization headers |
| `app/config.py` | **EXISTS** | Configuration with environment variables | Already configured; reads from `.env` |
| `app/extensions.py` | **EXISTS** | PyMongo + JWTManager initialization | Already configured |

### Blueprints (Routes)

| File | Status | What Changed | Why |
|---|---|---|---|
| `blueprints/auth/routes.py` | **REWRITTEN** | Flask-RESTx Resources with `@jwt_required()`; removed duplicate blueprint routes | To fix `TypeError: Object of type Response is not JSON serializable`; Flask-RESTx expects dicts, not Response objects |
| `blueprints/manager/*.py` | **CREATED (Stubs)** | All manager blueprint stubs with `@role_required` | Sprint 1–5 feature foundation |
| `blueprints/student/*.py` | **CREATED (Stubs)** | Student blueprint stubs with `@role_required` | Sprint 2 feature foundation |

### Middleware (New)

| File | Status | What Changed | Why |
|---|---|---|---|
| `middleware/__init__.py` | **CREATED** | Exports `fix_authorization_header` function | Modular middleware registration |
| `middleware/auth_middleware.py` | **CREATED** | Auto-adds `"Bearer "` prefix to Authorization header | Fixes Swagger UI and clients that forget the prefix |

### Models

| File | Status | What Changed | Why |
|---|---|---|---|
| `models/user.py` | **REWRITTEN** | Pydantic model with validation, bcrypt helpers, field constants | Defines user data structure; prevents typos with constants |
| `models/group.py` | **EXISTS** | Constants only | Sprint 0 requirement |
| `models/*.py` (additional files, e.g. `group.py`, `user.py`) | **CREATED** | Model constant files for remaining collections | Consistency across the schema |

### Services

| File | Status | What Changed | Why |
|---|---|---|---|
| `services/auth_service.py` | **REWRITTEN** | Added `ObjectId` import and conversion for user queries | CRITICAL: Without `ObjectId` import, `find_one({"_id": user_id})` fails with a string ID |
| `services/user_service.py` | **CREATED** | User management logic (create, get, delete users) | Future feature foundation |

### Utilities

| File | Status | What Changed | Why |
|---|---|---|---|
| `utils/responses.py` | **REWRITTEN** | Returns `(dict, status_code)`, NOT Flask `Response` objects | CRITICAL: Flask-RESTx expects dicts, not Response objects; fixed serialization error |
| `utils/decorators.py` | **CREATED** | `@role_required` decorator for endpoint protection | JWT verification + role checking |
| `utils/jwt_handlers.py` | **CREATED** | JWT error handlers (unauthorized, invalid, expired, revoked) | Modular error handling, keeps `__init__.py` clean |
| `utils/validators.py` | **CREATED** | Email, roll number, password strength validation | Shared validation helpers |

### Infrastructure

| File | Status | What Changed | Why |
|---|---|---|---|
| `seed/seed_manager.py` | **REWRITTEN** | Creates manager with bcrypt hashed password | Manager: `zamanaziz@bnu.edu.pk` / `11223344` |
| `tests/test_auth.py` | **REWRITTEN** | 4 passing auth tests | Quality assurance; tests login success, wrong password, unknown user, `/me` |
| `requirements.txt` | **UPDATED** | Added Flask-RESTx, pydantic, email-validator, bcrypt | Dependencies for auth and validation |
| `docker-compose.yml` | **UPDATED** | Added MongoDB authentication | Security; MongoDB now has a root user/password |
| `wsgi.py` | **CREATED** | Entry point for gunicorn | Production deployment |
| `.env.example` | **CREATED** | Template for environment variables | Onboarding new developers |
| `.github/workflows/ci.yml` | **CREATED** | Lint + test on PRs | CI/CD quality gate |
| `.github/PULL_REQUEST_TEMPLATE.md` | **CREATED** | PR checklist | Code review standardization |

---

## 🧠 Key Context & Decisions Made

### 1. Architecture Decision: One Users Collection for All Roles

**Decision:** All users (manager, student, evaluator, HOD, HODIC, dean) are stored in a single `users` collection.

**Why:**
- No separate tables/collections for each role
- Role field (`role: "pbl_manager"`) differentiates user types
- Simpler queries, unified login
- No need for joins or complex relationships

**Implication:** When checking if a user is a manager, check `user["role"] == "pbl_manager"`.

```python
# ✅ CORRECT
user = mongo.db.users.find_one({"email": email})
if user["role"] == "pbl_manager":
    # Manager logic

# ❌ WRONG (this doesn't exist)
user = mongo.db.managers.find_one({"email": email})
```

---

### 2. Critical: Flask-RESTx Response Handling

**Decision:** All response helpers MUST return plain dictionaries, not Flask `Response` objects.

**Why:** Flask-RESTx Resources expect `(dict, status_code)` or just a dict. If a Flask `Response` object (from `jsonify()`) is returned, Flask-RESTx tries to JSON-serialize the `Response` object itself, causing `TypeError: Object of type Response is not JSON serializable`.

**The Fix:**

```python
# ❌ WRONG - Returns Flask Response
def success_response(message, data=None, status=200):
    return jsonify({"success": True, "message": message, "data": data}), status

# ✅ CORRECT - Returns plain dict
def success_response(message, data=None, status=200):
    response = {"success": True, "message": message}
    if data is not None:
        response["data"] = data
    return response, status
```

**Implication:** All `Resource` methods must use the updated `responses.py`. Do not use `jsonify()` in any `Resource` method.

---

### 3. No Blueprint Routes for Auth

**Decision:** Auth endpoints are registered only via the Flask-RESTx Namespace, not via a Blueprint.

**Why:**
- A Flask-RESTx Namespace and a Blueprint create two separate route registrations
- Both would handle `/api/auth/login`, causing a conflict
- Blueprint routes calling Resources returned Responses, resulting in double wrapping and errors

**The Fix:**

```python
# ❌ WRONG - Don't do this
auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login_blueprint():
    return LoginResource().post()

# ✅ CORRECT - Only use Namespace
@auth_ns.route('/login')
class LoginResource(Resource):
    def post(self):
        return success_response(...)  # Returns (dict, status)
```

**Implication:** Only register the namespace in `app/__init__.py`:

```python
from app.blueprints.auth.routes import auth_ns
api.add_namespace(auth_ns, path='/api/auth')
# DO NOT register auth_bp
```

---

### 4. Critical: ObjectId Conversion

**Decision:** Always convert string IDs to `ObjectId` when querying MongoDB.

**Why:** MongoDB stores `_id` as `ObjectId`, but `get_jwt_identity()` returns a string. Without conversion, queries fail silently, causing a "User not found" error.

**The Fix:**

```python
# ✅ CORRECT
from bson.objectid import ObjectId

user = mongo.db.users.find_one({"_id": ObjectId(user_id)})

# ❌ WRONG
user = mongo.db.users.find_one({"_id": user_id})  # user_id is a string
```

**Implication:** Always import `ObjectId` in any service that queries by `_id`.

---

### 5. Middleware for Authorization Header

**Decision:** Add middleware to auto-fix Authorization headers that are missing the `"Bearer "` prefix.

**Why:** Swagger UI and some clients send tokens without the `"Bearer "` prefix, causing a `NoAuthorizationError`.

**The Fix:**

```python
# middleware/auth_middleware.py
def fix_authorization_header():
    auth_header = request.headers.get('Authorization')
    if auth_header and not auth_header.startswith('Bearer '):
        request.environ['HTTP_AUTHORIZATION'] = f'Bearer {auth_header}'
```

**Implication:** Users can now paste tokens with or without `"Bearer "` in Swagger UI.

---

### 6. JWT Error Handlers

**Decision:** Register custom JWT error handlers to return consistent JSON responses.

**Why:** Default Flask-JWT-Extended errors are not JSON-friendly and don't match the API's response format.

**The Fix:**

```python
# utils/jwt_handlers.py
@jwt_manager.unauthorized_loader
def missing_token_callback(error):
    return jsonify({
        "success": False,
        "message": "Authorization header is missing or invalid"
    }), 401
```

**Implication:** All JWT errors return consistent JSON with proper HTTP status codes.

---

### 7. Database Relationships (NoSQL Pattern)

**Decision:** Use references (IDs), not embedded documents, for relationships.

**Why:**
- Users change (name, email updates)
- Embedding would duplicate data, creating an update nightmare
- References keep data normalized

**Pattern:**

```python
# Store IDs as references
group = {
    "leader_id": "user_456",
    "member_ids": ["user_456", "user_789"]  # Array of references
}

# Query to get related data
members = db.users.find({"_id": {"$in": group["member_ids"]}})
```

**Implication:** Don't embed user data in groups. Query users separately when their details are needed.

---

## 🚧 Current Status & Known Issues

### ✅ Working Features

- [x] `POST /api/auth/login` — Returns JWT token
- [x] `GET /api/auth/me` — Returns current user info (with token)
- [x] `POST /api/auth/change-password` — Changes user password
- [x] `@role_required` decorator — Protects endpoints
- [x] Swagger UI at `/api/docs` — Interactive API docs
- [x] Middleware auto-adds `"Bearer "` prefix
- [x] JWT error handlers return consistent JSON
- [x] Seed script — Creates manager account
- [x] Tests — 4 passing auth tests
- [x] Docker — All services start without errors
- [x] 16 model constant files for all collections

### ⚠️ Known Issues

1. **Pydantic Deprecation Warnings** — The `@validator` decorators in `user.py` are deprecated in Pydantic V2. They work but should be migrated to `@field_validator`. Not blocking; can be addressed later.
2. **Empty Blueprint Stubs** — All non-auth blueprints are placeholders and need business logic in future sprints.
3. **No Email Service** — Password reset via email is not implemented. This is a future feature.

### 🚫 Not Implemented

- ❌ Frontend (React/Vite) — Sprint 0 frontend tasks are on hold
- ❌ Student CRUD operations — Sprint 1
- ❌ Group management — Sprint 1–2
- ❌ Iterations & submissions — Sprint 2–3
- ❌ Evaluations — Sprint 3–4
- ❌ Reports — Sprint 5
- ❌ Email service — Future
- ❌ Password reset via email — Future
- ❌ Forgot password flow — Future

---

## ⏭️ Next Steps for the Team

### Immediate (Before Sprint 1)

1. **Verify Auth Works** — Test all 3 auth endpoints in Swagger UI (`/api/docs`)
2. **Run Tests** — `python -m pytest tests/test_auth.py -v` — Should pass all 4 tests
3. **Review Code** — Ensure `@jwt_required()` is on the `/me` and `/change-password` Resources
4. **Update Environment** — Copy `.env.example` to `.env` and set proper values
5. **Rebuild Docker** — `docker-compose up --build` — Ensure no errors

---

## 📌 Important Reminders

### For All Developers

1. Never use `jsonify()` in Flask-RESTx Resources — return dicts + status codes
2. Always import `ObjectId` when querying by `_id` in services
3. Always use `@role_required` for protected endpoints
4. Store IDs as references — don't embed documents unnecessarily
5. Use model constants — `UserFields.EMAIL`, not `"email"`
6. Write tests for every new feature
7. Run tests before opening a PR — `pytest tests/ -v`

### Database Connection

- **Local Docker:** `mongodb://admin:adminpass@mongo:27017/pbl_system?authSource=admin`
- **Atlas (Production):** Update `.env` with your Atlas URI

### Common Errors & Fixes

| Error | Cause | Fix |
|---|---|---|
| `TypeError: Object of type Response is not JSON serializable` | Using `jsonify()` in a Resource | Use `responses.py` helpers (return dicts) |
| `User not found` on `/me` | Missing `ObjectId` import | Add `from bson.objectid import ObjectId` |
| `NoAuthorizationError` | Missing `"Bearer "` prefix | Middleware now auto-fixes this |
| `ModuleNotFoundError: No module named 'pydantic'` | Missing dependency | `pip install -r requirements.txt` |

---

## 🎯 Summary

You have a working authentication layer with JWT, bcrypt, role-based access, and Swagger documentation.

The system is ready for Sprint 1 feature development. Your team can now build student, group, and evaluation features on top of this secure foundation.

**Key achievement:** The auth system is production-ready. All credentials are hashed, tokens are secure, endpoints are protected, and the `"Bearer "` prefix issue is permanently solved.

**Next immediate action:** Run the tests, verify the auth endpoints, and start Sprint 1 development.

---

*Document generated for handover purposes.*
*Auth layer is stable and ready for feature development.*
*Date: August 15, 2026*