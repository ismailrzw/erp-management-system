# Sprint 1 — Manager Dashboard and Reference Data CRUD
## PBL Management System · Beaconhouse National University
**Sprint Goal:** The Manager can log in, see a live dashboard with real statistics, and fully manage all reference data — Students, Departments, Courses, and Teachers — including bulk import and a recycle bin.
**FRs Covered:** FR-1.4, FR-2.1, FR-2.2, FR-2.3, FR-2.4, FR-2.5, FR-2.6, FR-10.1, FR-10.2, FR-10.3, FR-10.4, FR-15.1, FR-15.2, FR-15.3
**Dependency:** Sprint 0 fully complete — login works, `@role_required` exists, seed manager runs, `AuthContext` and `api.js` work, `DashboardLayout` renders.
**Owners:** Ismail (all backend), Ramsha (manager pages + reusable components), Sara (login polish + shared UI), Ibrahim (schemas + tests)

---

> [!IMPORTANT]
> Sprint 0 must be 100% done before Sprint 1 starts. This sprint builds on the login flow — if login is broken, nothing in Sprint 1 can be tested.

---

## Why Sprint 1 Exists

After Sprint 0, the manager can log in but is redirected to a placeholder page. Sprint 1 delivers the actual content: the Manager's daily workspace. The Manager needs to enrol students before any groups can form, so this sprint is the **data foundation** for Sprint 2 (groups), Sprint 3 (iterations), and Sprint 4 (evaluations).

**Without Sprint 1:**
- No students → no groups (Sprint 2 blocked)
- No courses → groups have no course to belong to (Sprint 2 blocked)
- No teachers → no evaluators to assign (Sprint 2 blocked)
- No dashboard → manager has no visibility into system health

---

## Sprint 1 Tasks by Team Member

### Ismail (Backend Lead) — Manager API Implementation

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S1-BE-01 | Implement `POST /api/manager/students` (individual add) | `backend/app/blueprints/manager/students.py` | ☐ |
| S1-BE-02 | Implement `POST /api/manager/students/bulk` (Excel/CSV import) | `backend/app/blueprints/manager/students.py` | ☐ |
| S1-BE-03 | Implement `GET /api/manager/students` (paginated + search + filters) | `backend/app/blueprints/manager/students.py` | ☐ |
| S1-BE-04 | Implement `GET /api/manager/students/<id>` | `backend/app/blueprints/manager/students.py` | ☐ |
| S1-BE-05 | Implement `PUT /api/manager/students/<id>` | `backend/app/blueprints/manager/students.py` | ☐ |
| S1-BE-06 | Implement `DELETE /api/manager/students/<id>` (soft delete) | `backend/app/blueprints/manager/students.py` | ☐ |
| S1-BE-07 | Implement `POST /api/manager/students/<id>/restore` | `backend/app/blueprints/manager/students.py` | ☐ |
| S1-BE-08 | Implement `DELETE /api/manager/students/<id>/permanent` | `backend/app/blueprints/manager/students.py` | ☐ |
| S1-BE-09 | Extract student logic to `student_service.py` | `backend/app/services/student_service.py` | ☐ |
| S1-BE-10 | Create email mock in `email_service.py` | `backend/app/services/email_service.py` | ☐ |
| S1-BE-11 | Implement Department CRUD (4 endpoints + restore + permanent) | `backend/app/blueprints/manager/departments.py` | ☐ |
| S1-BE-12 | Implement Course CRUD (4 endpoints + restore + permanent) | `backend/app/blueprints/manager/courses.py` | ☐ |
| S1-BE-13 | Implement Teacher/Evaluator CRUD (4 endpoints + restore) | `backend/app/blueprints/manager/teachers.py` | ☐ |
| S1-BE-14 | Implement `GET /api/manager/dashboard` | `backend/app/blueprints/manager/dashboard.py` | ☐ |
| S1-BE-15 | Implement announcements endpoints (POST, GET, PUT, DELETE) | `backend/app/blueprints/manager/announcements.py` | ☐ |
| S1-BE-16 | Implement attachment endpoints (POST, GET, DELETE) | `backend/app/blueprints/manager/announcements.py` | ☐ |
| S1-BE-17 | Implement `GET /api/common/announcements` and `GET /api/common/attachments` | `backend/app/blueprints/common/routes.py` (new) | ☐ |
| S1-BE-18 | Create marshmallow schemas for student, dept, course, teacher | `backend/app/schemas/` (new directory) | ☐ |
| S1-BE-19 | Add all Sprint 1 routes to Postman collection | `backend/postman/PBL-System.postman_collection.json` | ☐ |
| S1-BE-20 | Register `dashboard_bp` and `common_bp` in `app/__init__.py` | `backend/app/__init__.py` | ☐ |

---

### Ramsha (Frontend Lead) — Manager Pages and Reusable Components

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S1-FE-01 | Create `ManagerDashboard.jsx` (stats cards + announcements + attachments) | `frontend/src/pages/manager/ManagerDashboard.jsx` | ☐ |
| S1-FE-02 | Create `StudentsListPage.jsx` (table + search + filters + pagination) | `frontend/src/pages/manager/students/StudentsListPage.jsx` | ☐ |
| S1-FE-03 | Create `AddStudentModal.jsx` (individual add form) | `frontend/src/pages/manager/students/AddStudentModal.jsx` | ☐ |
| S1-FE-04 | Create `EditStudentModal.jsx` | `frontend/src/pages/manager/students/EditStudentModal.jsx` | ☐ |
| S1-FE-05 | Create `BulkImportModal.jsx` (file dropzone + results table) | `frontend/src/pages/manager/students/BulkImportModal.jsx` | ☐ |
| S1-FE-06 | Create `StudentRecycleBin.jsx` | `frontend/src/pages/manager/students/StudentRecycleBin.jsx` | ☐ |
| S1-FE-07 | Create `DepartmentsPage.jsx` + `AddDepartmentModal.jsx` | `frontend/src/pages/manager/departments/` | ☐ |
| S1-FE-08 | Create `CoursesPage.jsx` + `AddCourseModal.jsx` | `frontend/src/pages/manager/courses/` | ☐ |
| S1-FE-09 | Create `TeachersPage.jsx` + `AddTeacherModal.jsx` | `frontend/src/pages/manager/teachers/` | ☐ |
| S1-FE-10 | Create reusable `DataTable.jsx` | `frontend/src/components/tables/DataTable.jsx` | ☐ |
| S1-FE-11 | Create `Modal.jsx` (generic overlay) | `frontend/src/components/common/Modal.jsx` | ☐ |
| S1-FE-12 | Create `Toast.jsx` (success/error notifications) | `frontend/src/components/common/Toast.jsx` | ☐ |
| S1-FE-13 | Create `Badge.jsx` (status chips: pending, approved, deleted) | `frontend/src/components/common/Badge.jsx` | ☐ |
| S1-FE-14 | Create `ConfirmDialog.jsx` (delete confirmation popup) | `frontend/src/components/common/ConfirmDialog.jsx` | ☐ |
| S1-FE-15 | Add Sprint 1 routes to `AppRouter.jsx` | `frontend/src/routes/AppRouter.jsx` | ☐ |

---

### Sara (Frontend Pages) — Shared UI and Login Polish

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S1-UI-01 | Polish `LoginPage.jsx` to match prototype (BNU logo, two-panel layout) | `frontend/src/pages/LoginPage.jsx` | ☐ |
| S1-UI-02 | Create `EmptyState.jsx` (illustration + message when list is empty) | `frontend/src/components/common/EmptyState.jsx` | ☐ |
| S1-UI-03 | Create `LoadingSkeleton.jsx` (pulse placeholder rows for tables) | `frontend/src/components/common/LoadingSkeleton.jsx` | ☐ |
| S1-UI-04 | Create `Pagination.jsx` component | `frontend/src/components/common/Pagination.jsx` | ☐ |
| S1-UI-05 | Create `AnnouncementsSection.jsx` (inside Manager Dashboard) | `frontend/src/components/manager/AnnouncementsSection.jsx` | ☐ |
| S1-UI-06 | Create `AttachmentsSection.jsx` (inside Manager Dashboard) | `frontend/src/components/manager/AttachmentsSection.jsx` | ☐ |
| S1-UI-07 | Create `SearchInput.jsx` (reusable search bar with debounce) | `frontend/src/components/forms/SearchInput.jsx` | ☐ |
| S1-UI-08 | Create `useApi.js` custom hook (generic data-fetching with loading + error state) | `frontend/src/hooks/useApi.js` | ☐ |

---

### Ibrahim (Backend + Testing) — Schemas and Tests

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S1-QA-01 | Install marshmallow: `pip install marshmallow` and update `requirements.txt` | `backend/requirements.txt` | ☐ |
| S1-QA-02 | Create `CreateStudentSchema`, `UpdateStudentSchema` | `backend/app/schemas/student_schema.py` | ☐ |
| S1-QA-03 | Create `DepartmentSchema`, `CourseSchema`, `TeacherSchema` | `backend/app/schemas/` | ☐ |
| S1-QA-04 | Write `tests/test_students.py` (individual add, bulk, edit, soft-delete, restore, permanent delete) | `backend/tests/test_students.py` | ☐ |
| S1-QA-05 | Write `tests/test_departments.py` | `backend/tests/test_departments.py` | ☐ |
| S1-QA-06 | Write `tests/test_courses.py` | `backend/tests/test_courses.py` | ☐ |
| S1-QA-07 | Verify CI passes with new tests | `.github/workflows/ci.yml` | ☐ |

---

## Step-by-Step Instructions Per Task

---

### S1-BE-01 to S1-BE-08: Student Endpoints

The student route file handles all individual-student CRUD. Here is the complete implementation pattern:

```python
# backend/app/blueprints/manager/students.py
from flask import request
from bson import ObjectId
from datetime import datetime, timezone
import bcrypt

from app.blueprints.manager import manager_students_bp as bp  # registered in __init__.py
from app.extensions import mongo
from app.utils.decorators import role_required
from app.utils.responses import success_response, error_response
from app.utils.audit import log_audit
from app.services.student_service import generate_student_email, generate_initial_password
from app.models.user import Role, Field as UF
from flask_jwt_extended import get_jwt_identity


@bp.route("/", methods=["POST"])
@role_required(Role.MANAGER)
def create_student():
    data = request.get_json() or {}
    required = ["name", "roll", "dept", "section", "session", "course", "teacher"]
    for field in required:
        if not data.get(field):
            return error_response(f"'{field}' is required.", 400)

    roll = data["roll"].strip()
    email = generate_student_email(roll)

    # Check for duplicate roll
    if mongo.db.users.find_one({"roll": roll}):
        return error_response(f"A student with roll '{roll}' already exists.", 409)

    password = generate_initial_password(roll)
    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    student_doc = {
        UF.NAME:           data["name"].strip(),
        UF.EMAIL:          email,
        UF.PASSWORD_HASH:  password_hash,
        UF.ROLE:           Role.STUDENT,
        UF.DEPT:           data["dept"].strip().upper(),
        UF.SECTION:        data["section"].strip().upper(),
        UF.COURSE:         data["course"].strip(),
        UF.ROLL:           roll,
        "session":         data["session"].strip(),
        "teacher":         data["teacher"].strip(),
        UF.RECOVERY_EMAIL: (data.get("recovery_email") or "").strip() or None,
        UF.DELETED:        False,
        UF.DELETED_AT:     None,
        UF.CREATED_AT:     datetime.now(timezone.utc),
        UF.UPDATED_AT:     datetime.now(timezone.utc),
    }
    result = mongo.db.users.insert_one(student_doc)
    actor_id = get_jwt_identity()
    log_audit(mongo.db, actor_id, Role.MANAGER, "users", "create", result.inserted_id,
              new_value={"name": data["name"], "roll": roll, "email": email})

    # Send credentials (mocked in dev)
    from app.services.email_service import send_student_credentials
    send_student_credentials(data["name"], email, password, student_doc[UF.RECOVERY_EMAIL])

    return success_response("Student added successfully. Credentials sent to recovery email.", data={
        "id": str(result.inserted_id),
        "email": email,
    }), 201


@bp.route("/", methods=["GET"])
@role_required(Role.MANAGER)
def list_students():
    dept    = request.args.get("dept")
    section = request.args.get("section")
    search  = request.args.get("search", "").strip()
    deleted = request.args.get("deleted", "false").lower() == "true"
    page    = max(1, int(request.args.get("page", 1)))
    limit   = min(100, max(1, int(request.args.get("limit", 20))))

    query = {UF.ROLE: Role.STUDENT, UF.DELETED: deleted}
    if dept:
        query[UF.DEPT] = dept.upper()
    if section:
        query[UF.SECTION] = section.upper()
    if search:
        import re
        pattern = re.compile(search, re.IGNORECASE)
        query["$or"] = [{UF.NAME: pattern}, {UF.ROLL: pattern}]

    total  = mongo.db.users.count_documents(query)
    items  = list(mongo.db.users.find(query, {UF.PASSWORD_HASH: 0})
                  .skip((page - 1) * limit).limit(limit))
    for s in items:
        s["id"] = str(s.pop("_id"))

    return success_response("Students retrieved.", data={
        "items": items, "total": total,
        "page": page, "limit": limit, "pages": -(-total // limit)
    })


@bp.route("/<student_id>", methods=["PUT"])
@role_required(Role.MANAGER)
def update_student(student_id):
    data = request.get_json() or {}
    # Protect immutable fields — never allow changing email, roll, or password_hash via this endpoint
    for protected in [UF.EMAIL, UF.ROLL, UF.PASSWORD_HASH, UF.ROLE]:
        data.pop(protected, None)

    if not data:
        return error_response("No updatable fields provided.", 400)

    data[UF.UPDATED_AT] = datetime.now(timezone.utc)
    result = mongo.db.users.update_one(
        {"_id": ObjectId(student_id), UF.ROLE: Role.STUDENT},
        {"$set": data}
    )
    if result.matched_count == 0:
        return error_response("Student not found.", 404)

    log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "users", "update",
              ObjectId(student_id), new_value=data)
    return success_response("Student updated.")


@bp.route("/<student_id>", methods=["DELETE"])
@role_required(Role.MANAGER)
def soft_delete_student(student_id):
    now = datetime.now(timezone.utc)
    result = mongo.db.users.update_one(
        {"_id": ObjectId(student_id), UF.ROLE: Role.STUDENT, UF.DELETED: False},
        {"$set": {UF.DELETED: True, UF.DELETED_AT: now, UF.UPDATED_AT: now}}
    )
    if result.matched_count == 0:
        return error_response("Student not found or already deleted.", 404)

    # Remove from any active groups
    mongo.db.groups.update_many(
        {"member_ids": ObjectId(student_id)},
        {"$pull": {"member_ids": ObjectId(student_id)}}
    )
    log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "users", "delete", ObjectId(student_id))
    return success_response("Student soft-deleted and removed from groups.")


@bp.route("/<student_id>/restore", methods=["POST"])
@role_required(Role.MANAGER)
def restore_student(student_id):
    result = mongo.db.users.update_one(
        {"_id": ObjectId(student_id), UF.ROLE: Role.STUDENT, UF.DELETED: True},
        {"$set": {UF.DELETED: False, UF.DELETED_AT: None, UF.UPDATED_AT: datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        return error_response("Student not found or not deleted.", 404)
    log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "users", "restore", ObjectId(student_id))
    return success_response("Student restored.")


@bp.route("/<student_id>/permanent", methods=["DELETE"])
@role_required(Role.MANAGER)
def permanent_delete_student(student_id):
    student = mongo.db.users.find_one({"_id": ObjectId(student_id), UF.DELETED: True})
    if not student:
        return error_response("Student not found or must be soft-deleted first.", 400)
    mongo.db.users.delete_one({"_id": ObjectId(student_id)})
    log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "users", "permanent_delete", ObjectId(student_id))
    return success_response("Student permanently deleted.")
```

---

### S1-BE-09 and S1-BE-10: Service Files

```python
# backend/app/services/student_service.py
import bcrypt, random, string

def generate_student_email(roll: str, domain: str = "bnu.edu.pk") -> str:
    """'bcsm-f23-551' → 'BCSM-F23-551@bnu.edu.pk'"""
    return f"{roll.strip().upper()}@{domain}"

def generate_initial_password(roll: str) -> str:
    """Generates a readable initial password from the roll number + random suffix."""
    suffix = "".join(random.choices(string.digits, k=4))
    return f"BNU@{roll.upper()[:8]}{suffix}"
```

```python
# backend/app/services/email_service.py
import os

def send_student_credentials(name: str, email: str, password: str, recovery_email: str):
    if os.getenv("FLASK_ENV") == "production":
        # TODO Sprint 6: implement real SMTP
        pass
    else:
        print(f"""
=== CREDENTIAL EMAIL (DEV MODE — not actually sent) ===
Student Name:      {name}
Login Email:       {email}
Initial Password:  {password}
Recovery Email:    {recovery_email or "not provided"}
=======================================================
        """)

def send_teacher_credentials(name: str, email: str, password: str):
    if os.getenv("FLASK_ENV") == "production":
        pass
    else:
        print(f"""
=== TEACHER CREDENTIAL EMAIL (DEV MODE) ===
Name:     {name}
Email:    {email}
Password: {password}
==========================================
        """)
```

---

### S1-BE-02: Bulk Import Implementation

```python
# Continuation of students.py — add this route:

@bp.route("/bulk", methods=["POST"])
@role_required(Role.MANAGER)
def bulk_import_students():
    """
    Accepts an Excel (.xlsx) or CSV file.
    Required columns: Name, Roll, Department, Section, Session, Course, Teacher, Recovery Email
    """
    import openpyxl
    import io

    if "file" not in request.files:
        return error_response("No file provided. Send a multipart/form-data request with a 'file' field.", 400)

    file = request.files["file"]
    filename = file.filename.lower()

    if not (filename.endswith(".xlsx") or filename.endswith(".csv")):
        return error_response("Only .xlsx and .csv files are accepted.", 400)

    required_columns = ["name", "roll", "department", "section", "session", "course", "teacher"]
    rows = []

    if filename.endswith(".xlsx"):
        wb = openpyxl.load_workbook(io.BytesIO(file.read()))
        ws = wb.active
        headers = [str(c.value or "").strip().lower() for c in next(ws.iter_rows(min_row=1, max_row=1))]
        for col in required_columns:
            if col not in headers:
                return error_response(f"Missing required column: '{col}'. Aborting — no rows imported.", 400)
        for row in ws.iter_rows(min_row=2, values_only=True):
            rows.append(dict(zip(headers, [str(v or "").strip() for v in row])))
    else:
        import csv
        content = file.read().decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(content))
        headers = [h.strip().lower() for h in (reader.fieldnames or [])]
        for col in required_columns:
            if col not in headers:
                return error_response(f"Missing required column: '{col}'. Aborting.", 400)
        rows = [{k.strip().lower(): v.strip() for k, v in r.items()} for r in reader]

    imported, skipped, errors = 0, 0, []
    actor_id = get_jwt_identity()

    for i, row in enumerate(rows, start=2):
        roll = row.get("roll", "")
        if not roll:
            errors.append({"row": i, "roll": None, "reason": "Roll number is empty."})
            skipped += 1
            continue

        if mongo.db.users.find_one({"roll": roll}):
            errors.append({"row": i, "roll": roll, "reason": "Roll number already exists."})
            skipped += 1
            continue

        email    = generate_student_email(roll)
        password = generate_initial_password(roll)
        pw_hash  = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        doc = {
            UF.NAME: row.get("name", ""), UF.EMAIL: email,
            UF.PASSWORD_HASH: pw_hash, UF.ROLE: Role.STUDENT,
            UF.DEPT: row.get("department", "").upper(),
            UF.SECTION: row.get("section", "").upper(),
            UF.COURSE: row.get("course", ""),
            UF.ROLL: roll, "session": row.get("session", ""),
            "teacher": row.get("teacher", ""),
            UF.RECOVERY_EMAIL: row.get("recovery email") or row.get("recovery_email") or None,
            UF.DELETED: False, UF.DELETED_AT: None,
            UF.CREATED_AT: datetime.now(timezone.utc),
            UF.UPDATED_AT: datetime.now(timezone.utc),
        }
        result = mongo.db.users.insert_one(doc)
        log_audit(mongo.db, actor_id, Role.MANAGER, "users", "create", result.inserted_id,
                  new_value={"roll": roll, "email": email})
        from app.services.email_service import send_student_credentials
        send_student_credentials(doc[UF.NAME], email, password, doc[UF.RECOVERY_EMAIL])
        imported += 1

    return success_response(f"Bulk import complete. {imported} imported, {skipped} skipped.", data={
        "imported": imported, "skipped": skipped, "errors": errors
    }), 201
```

> [!NOTE]
> You need to add `openpyxl` to `requirements.txt`: `pip install openpyxl`.

---

### S1-BE-14: Manager Dashboard

```python
# backend/app/blueprints/manager/dashboard.py
from flask import Blueprint
from app.extensions import mongo
from app.utils.decorators import role_required
from app.utils.responses import success_response
from app.models.user import Role

dashboard_bp = Blueprint("manager_dashboard", __name__)

@dashboard_bp.route("/", methods=["GET"])
@role_required(Role.MANAGER)
def get_dashboard():
    total_students          = mongo.db.users.count_documents({"role": Role.STUDENT, "deleted": False})
    total_evaluators        = mongo.db.users.count_documents({"role": Role.EVALUATOR, "deleted": False})
    total_groups            = mongo.db.groups.count_documents({})
    pending_groups          = mongo.db.groups.count_documents({"status": "pending"})
    approved_groups         = mongo.db.groups.count_documents({"status": "approved"})

    # Students who are NOT in any group's member_ids
    students_in_groups = mongo.db.groups.distinct("member_ids")
    students_without_group = mongo.db.users.count_documents({
        "role": Role.STUDENT, "deleted": False,
        "_id": {"$nin": students_in_groups}
    })

    # Announcements (latest 5)
    announcements = list(mongo.db.announcements.find({}, {"content": 0})
                         .sort("date", -1).limit(5))
    for a in announcements:
        a["id"] = str(a.pop("_id"))

    # Attachments (latest 5)
    attachments = list(mongo.db.attachments.find({}).sort("uploaded_at", -1).limit(5))
    for a in attachments:
        a["id"] = str(a.pop("_id"))

    return success_response("Dashboard data retrieved.", data={
        "total_students":          total_students,
        "total_evaluators":        total_evaluators,
        "total_groups":            total_groups,
        "pending_groups":          pending_groups,
        "approved_groups":         approved_groups,
        "students_without_group":  students_without_group,
        "announcements":           announcements,
        "attachments":             attachments,
    })
```

---

### S1-QA-02: Marshmallow Schema Example

```python
# backend/app/schemas/student_schema.py
from marshmallow import Schema, fields, validate, validates, ValidationError

class CreateStudentSchema(Schema):
    name           = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    roll           = fields.Str(required=True, validate=validate.Length(min=3, max=30))
    dept           = fields.Str(required=True, validate=validate.Length(min=2, max=4))
    section        = fields.Str(required=True, validate=validate.Length(min=1, max=2))
    session        = fields.Str(required=True)
    course         = fields.Str(required=True)
    teacher        = fields.Str(required=True)
    recovery_email = fields.Email(load_default=None)

    @validates("roll")
    def validate_roll(self, value):
        # Roll numbers should not contain spaces
        if " " in value:
            raise ValidationError("Roll number must not contain spaces.")

class UpdateStudentSchema(Schema):
    name           = fields.Str(validate=validate.Length(min=2, max=100))
    section        = fields.Str(validate=validate.Length(min=1, max=2))
    course         = fields.Str()
    teacher        = fields.Str()
    recovery_email = fields.Email(load_default=None)
    # Note: email, roll, dept, password_hash, role are NOT here — they cannot be updated
```

**How to use schema validation in a route:**
```python
from app.schemas.student_schema import CreateStudentSchema
from marshmallow import ValidationError

@bp.route("/", methods=["POST"])
@role_required(Role.MANAGER)
def create_student():
    data = request.get_json() or {}
    schema = CreateStudentSchema()
    try:
        validated = schema.load(data)   # raises ValidationError if invalid
    except ValidationError as err:
        return error_response(f"Validation error: {err.messages}", 422)
    # Use `validated` dict from here on...
```

---

### S1-FE-10 and S1-FE-11: Reusable Components

```jsx
// frontend/src/components/tables/DataTable.jsx
/**
 * Generic data table.
 * Props:
 *   columns: [{ key, label, render? }]  — render(row) is optional custom cell renderer
 *   data: array of row objects
 *   loading: boolean
 *   emptyMessage: string
 */
import LoadingSkeleton from '../common/LoadingSkeleton';
import EmptyState from '../common/EmptyState';

export default function DataTable({ columns, data, loading, emptyMessage = "No data found." }) {
  if (loading) return <LoadingSkeleton rows={5} />;
  if (!data || data.length === 0) return <EmptyState message={emptyMessage} />;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
        <thead>
          <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            {columns.map(col => (
              <th key={col.key} style={{ padding: '10px 14px', textAlign: 'left',
                fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.id || i} style={{ borderBottom: '1px solid #f3f4f6',
              background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
              {columns.map(col => (
                <td key={col.key} style={{ padding: '10px 14px', color: '#374151' }}>
                  {col.render ? col.render(row) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

```jsx
// frontend/src/components/common/Modal.jsx
/**
 * Generic modal overlay.
 * Props:
 *   title: string
 *   onClose: fn
 *   children: content
 *   width: optional CSS width string (default '500px')
 */
export default function Modal({ title, onClose, children, width = '500px' }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '8px', width, maxWidth: '100%',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e3a5f' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none',
            fontSize: '20px', cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '20px' }}>{children}</div>
      </div>
    </div>
  );
}
```

```jsx
// frontend/src/hooks/useApi.js
/**
 * Generic data-fetching hook.
 * Usage:
 *   const { data, loading, error, refetch } = useApi('/manager/students?page=1&limit=20');
 */
import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export default function useApi(url, deps = []) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetch = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(url);
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [url, ...deps]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
```

---

## Sprint 1 Test Cases

```python
# backend/tests/test_students.py

def test_create_student_success(client, manager_token, db):
    resp = client.post("/api/manager/students",
        json={"name": "Ahmed Khan", "roll": "BCSM-F23-001", "dept": "SE",
              "section": "A", "session": "Fall 2025",
              "course": "Final Year Project - Fall 2025", "teacher": "Dr. Ali"},
        headers={"Authorization": f"Bearer {manager_token}"})
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["success"] is True
    assert data["data"]["email"] == "BCSM-F23-001@bnu.edu.pk"

def test_create_student_duplicate_roll(client, manager_token, existing_student):
    resp = client.post("/api/manager/students",
        json={"name": "Someone Else", "roll": existing_student["roll"],
              "dept": "SE", "section": "A", "session": "Fall 2025",
              "course": "Final Year Project - Fall 2025", "teacher": "Dr. Ali"},
        headers={"Authorization": f"Bearer {manager_token}"})
    assert resp.status_code == 409

def test_soft_delete_student(client, manager_token, existing_student):
    resp = client.delete(f"/api/manager/students/{existing_student['id']}",
        headers={"Authorization": f"Bearer {manager_token}"})
    assert resp.status_code == 200
    # Student should not appear in normal listing
    resp2 = client.get("/api/manager/students",
        headers={"Authorization": f"Bearer {manager_token}"})
    ids = [s["id"] for s in resp2.get_json()["data"]["items"]]
    assert existing_student["id"] not in ids

def test_student_appears_in_recycle_bin(client, manager_token, deleted_student):
    resp = client.get("/api/manager/students?deleted=true",
        headers={"Authorization": f"Bearer {manager_token}"})
    ids = [s["id"] for s in resp.get_json()["data"]["items"]]
    assert deleted_student["id"] in ids

def test_restore_student(client, manager_token, deleted_student):
    resp = client.post(f"/api/manager/students/{deleted_student['id']}/restore",
        headers={"Authorization": f"Bearer {manager_token}"})
    assert resp.status_code == 200
    assert resp.get_json()["success"] is True

def test_student_endpoint_blocked_for_student_role(client, student_token):
    resp = client.get("/api/manager/students",
        headers={"Authorization": f"Bearer {student_token}"})
    assert resp.status_code == 403

def test_bulk_import_success(client, manager_token, tmp_xlsx_file):
    with open(tmp_xlsx_file, "rb") as f:
        resp = client.post("/api/manager/students/bulk",
            data={"file": (f, "students.xlsx")},
            content_type="multipart/form-data",
            headers={"Authorization": f"Bearer {manager_token}"})
    assert resp.status_code == 201
    d = resp.get_json()["data"]
    assert d["imported"] > 0
```

---

## Sprint 1 Acceptance Criteria

### Backend
- [ ] `POST /api/manager/students` creates a student, returns generated email, prints credentials to console (dev)
- [ ] Duplicate roll number returns `409 Conflict`
- [ ] `POST /api/manager/students/bulk` with a valid Excel file returns `imported`, `skipped`, `errors` breakdown
- [ ] `GET /api/manager/students` supports `?dept=SE&section=A&search=Ahmed&page=1&limit=20`
- [ ] `PUT /api/manager/students/<id>` cannot change `email`, `roll`, or `role`
- [ ] `DELETE /api/manager/students/<id>` sets `deleted: true` and removes from groups
- [ ] `POST /api/manager/students/<id>/restore` sets `deleted: false`
- [ ] `DELETE /api/manager/students/<id>/permanent` only works if already soft-deleted
- [ ] All Department, Course, Teacher CRUD endpoints work the same way as students
- [ ] `GET /api/manager/dashboard` returns real counts (not zero or hardcoded)
- [ ] All announcement endpoints work
- [ ] All attachment endpoints work
- [ ] Every endpoint has `@role_required(Role.MANAGER)`
- [ ] Every mutation calls `log_audit()`
- [ ] `pytest tests/ -v` passes (all tests including Sprint 0 tests)

### Frontend
- [ ] Manager Dashboard shows real stats from the API
- [ ] Students page loads a table with pagination and search
- [ ] "Add Student" modal opens, fills, and creates a student that appears in the table
- [ ] "Bulk Import" modal accepts an Excel file and shows the results
- [ ] Edit and delete work in the table
- [ ] Recycle bin shows deleted students and allows restore
- [ ] Departments, Courses, Teachers pages follow the same pattern
- [ ] Loading skeleton shows while data is fetching
- [ ] Empty state shows when no data

### Integration
- [ ] Log in as Manager → navigate to every Sprint 1 page without any console errors
- [ ] All forms show validation errors on empty submit
- [ ] All destructive actions show a confirm dialog before executing

---

## Common Beginner Mistakes to Avoid

| Mistake | How to Avoid |
|---------|-------------|
| Forgetting `@role_required` on a new route | Check PR template security checklist before every PR |
| Not calling `log_audit()` after mutations | Add it immediately after every `insert_one`, `update_one`, or `delete_one` |
| Returning `password_hash` in the student list | Add `{UF.PASSWORD_HASH: 0}` to every `find()` projection |
| Email generated in lowercase | Use `roll.strip().upper()` before appending `@bnu.edu.pk` |
| `openpyxl` not in `requirements.txt` | Run `pip install openpyxl` and immediately update `requirements.txt` |
| Frontend showing raw `_id` ObjectId format | Always serialize ObjectId: `str(doc.pop("_id"))` → `doc["id"]` |
| Empty marshmallow `load()` crashing | Wrap schema `.load()` in `try/except ValidationError` |
| Modal not closing after successful submit | Call `onClose()` inside the `.then()` after the API call succeeds |
| Table not refreshing after add/edit/delete | Call `refetch()` from `useApi` after every successful mutation |

---

*End of Sprint 1 Document*
*Next: Sprint 2 — Group Formation and Evaluator Assignment*
