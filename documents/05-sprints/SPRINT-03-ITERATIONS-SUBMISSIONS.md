# Sprint 3 — Iterations, Rubrics, and Submissions
## PBL Management System · Beaconhouse National University
**Sprint Goal:** The Manager can create iteration milestones and attach weighted rubrics. Students in approved groups can view iterations and upload their project files. The system detects late submissions automatically.
**FRs Covered:** FR-4.1, FR-4.2, FR-4.3, FR-4.4, FR-5.1, FR-5.2, FR-5.3
**Dependency:** Sprint 2 fully complete — approved groups must exist; evaluators must be assigned (rubric scoring in Sprint 4 depends on iterations from this sprint).
**Owners:** Ismail (iterations + submissions backend), Ramsha (iteration management pages), Sara (student iteration view + file upload), Ibrahim (storage service + tests)

---

> [!IMPORTANT]
> Rubric weight validation (all weights must sum to 100) is a hard server-side rule. Never skip it. If a rubric is saved with weights not summing to 100, the `total_weighted_score` calculation in Sprint 4 will produce wrong numbers that cannot be corrected later.

---

## Why Sprint 3 Exists

Iterations are the milestones of the FYP journey. Every group must work through them in order. Without iterations:
- Evaluators have nothing to score (Sprint 4 blocked)
- Students have no mechanism to submit their work
- HOD and Dean reports (Sprint 5) will show zero iteration data

**Without Sprint 3 complete:**
- Sprint 4 (evaluator scoring) cannot start
- No submission history for any group

---

## Sprint 3 Tasks by Team Member

### Ismail (Backend Lead) — Iteration and Submission APIs

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S3-BE-01 | Implement `POST /api/manager/iterations` | `backend/app/blueprints/manager/iterations.py` | ☐ |
| S3-BE-02 | Implement `GET /api/manager/iterations` (filter by course) | `backend/app/blueprints/manager/iterations.py` | ☐ |
| S3-BE-03 | Implement `PUT /api/manager/iterations/<id>` (title, details, deadline) | `backend/app/blueprints/manager/iterations.py` | ☐ |
| S3-BE-04 | Implement `DELETE /api/manager/iterations/<id>` (block if submissions exist) | `backend/app/blueprints/manager/iterations.py` | ☐ |
| S3-BE-05 | Implement `POST /api/manager/iterations/<id>/rubrics` (replace all rubrics, sum=100) | `backend/app/blueprints/manager/iterations.py` | ☐ |
| S3-BE-06 | Implement `DELETE /api/manager/iterations/<id>/rubrics/<rubric_id>` | `backend/app/blueprints/manager/iterations.py` | ☐ |
| S3-BE-07 | Implement `GET /api/student/iterations` (with submission status per group) | `backend/app/blueprints/student/iterations.py` | ☐ |
| S3-BE-08 | Implement `GET /api/student/iterations/<id>` (detail + rubric + submission) | `backend/app/blueprints/student/iterations.py` | ☐ |
| S3-BE-09 | Implement `POST /api/student/iterations/<id>/submit` (multipart, upsert, late flag) | `backend/app/blueprints/student/iterations.py` | ☐ |
| S3-BE-10 | Create `storage_service.py` (local mock) | `backend/app/services/storage_service.py` | ☐ |
| S3-BE-11 | Add `MAX_CONTENT_LENGTH = 10MB` to config | `backend/app/config.py` | ☐ |
| S3-BE-12 | Add all Sprint 3 routes to Postman collection | `backend/postman/PBL-System.postman_collection.json` | ☐ |

---

### Ramsha (Frontend Lead) — Iteration Management Pages

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S3-FE-01 | Create `IterationsManagePage.jsx` (list of iterations with add/edit/delete) | `frontend/src/pages/manager/iterations/IterationsManagePage.jsx` | ☐ |
| S3-FE-02 | Create `IterationFormModal.jsx` (create/edit form) | `frontend/src/pages/manager/iterations/IterationFormModal.jsx` | ☐ |
| S3-FE-03 | Create `RubricBuilderModal.jsx` (add/remove rubric questions + real-time weight total) | `frontend/src/pages/manager/iterations/RubricBuilderModal.jsx` | ☐ |
| S3-FE-04 | Add Sprint 3 manager routes to `AppRouter.jsx` | `frontend/src/routes/AppRouter.jsx` | ☐ |

---

### Sara (Frontend Pages) — Student Iteration View and File Upload

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S3-UI-01 | Create `StudentIterationsPage.jsx` (list with deadline countdown + submission badge) | `frontend/src/pages/student/iterations/StudentIterationsPage.jsx` | ☐ |
| S3-UI-02 | Create `IterationDetailPage.jsx` (rubric display + submission area + late warning) | `frontend/src/pages/student/iterations/IterationDetailPage.jsx` | ☐ |
| S3-UI-03 | Create `FileDropzone.jsx` (drag-and-drop + file type + size validation) | `frontend/src/components/forms/FileDropzone.jsx` | ☐ |
| S3-UI-04 | Create `DeadlineCountdown.jsx` (shows days/hours remaining or "OVERDUE" badge) | `frontend/src/components/common/DeadlineCountdown.jsx` | ☐ |
| S3-UI-05 | Add Sprint 3 student routes to `AppRouter.jsx` | `frontend/src/routes/AppRouter.jsx` | ☐ |

---

### Ibrahim (Backend + Testing) — Storage and Tests

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S3-QA-01 | Implement `storage_service.py` (local file save + type + size validation) | `backend/app/services/storage_service.py` | ☐ |
| S3-QA-02 | Add `uploads/` to `.gitignore` | `backend/.gitignore` | ☐ |
| S3-QA-03 | Write `tests/test_iterations.py` (CRUD + rubric weight validation) | `backend/tests/test_iterations.py` | ☐ |
| S3-QA-04 | Write `tests/test_submissions.py` (submit, late detection, re-submit, blocked if no group) | `backend/tests/test_submissions.py` | ☐ |
| S3-QA-05 | Verify CI passes with new tests | `.github/workflows/ci.yml` | ☐ |

---

## Step-by-Step Instructions Per Task

---

### S3-BE-05: Rubric Attachment — Weight Validation

```python
# backend/app/blueprints/manager/iterations.py (excerpt)
from flask import request
from bson import ObjectId
from datetime import datetime, timezone

from app.blueprints.manager import manager_iterations_bp as bp
from app.extensions import mongo
from app.utils.decorators import role_required
from app.utils.responses import success_response, error_response
from app.utils.audit import log_audit
from app.models.user import Role
from flask_jwt_extended import get_jwt_identity


def validate_rubric_weights(rubrics: list) -> tuple[bool, str | None]:
    """
    Returns (True, None) if weights sum to 100 or rubrics is empty.
    Returns (False, error_message) if invalid.
    """
    if not rubrics:
        return True, None
    try:
        total = sum(int(r.get("weight", 0)) for r in rubrics)
    except (TypeError, ValueError):
        return False, "All rubric weights must be integers."
    if total != 100:
        return False, f"Rubric weights must sum to exactly 100. Current sum: {total}."
    return True, None


@bp.route("/<iteration_id>/rubrics", methods=["POST"])
@role_required(Role.MANAGER)
def set_rubrics(iteration_id):
    """
    Replaces the entire rubric set for an iteration.
    Body: { "rubrics": [ { "question": "...", "weight": 25, "levels": { "0": "...", ..., "5": "..." } } ] }
    """
    data    = request.get_json() or {}
    rubrics = data.get("rubrics", [])

    valid, err = validate_rubric_weights(rubrics)
    if not valid:
        return error_response(err, 422)

    # Assign sequential IDs to each rubric question
    for i, r in enumerate(rubrics, start=1):
        r["id"] = i
        # Validate levels exist for keys 0–5
        if "levels" not in r or len(r["levels"]) < 6:
            return error_response(f"Rubric {i} must have levels for keys 0, 1, 2, 3, 4, 5.", 422)

    result = mongo.db.iterations.update_one(
        {"_id": ObjectId(iteration_id)},
        {"$set": {"rubrics": rubrics, "updatedAt": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        return error_response("Iteration not found.", 404)

    log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "iterations", "update_rubrics",
              ObjectId(iteration_id), new_value={"rubric_count": len(rubrics)})
    return success_response("Rubrics saved successfully.", data={"rubrics": rubrics})
```

---

### S3-BE-09: Submit Iteration Work

```python
# backend/app/blueprints/student/iterations.py (excerpt)
from flask import request
from bson import ObjectId
from datetime import datetime, timezone
from flask_jwt_extended import get_jwt_identity, get_jwt

from app.blueprints.student import student_iterations_bp as bp
from app.extensions import mongo
from app.utils.decorators import role_required
from app.utils.responses import success_response, error_response
from app.utils.audit import log_audit
from app.services.storage_service import upload_file
from app.models.user import Role


def is_submission_late(deadline_str: str) -> bool:
    """Returns True if current UTC time is past the given ISO date deadline."""
    from datetime import datetime, timezone
    deadline = datetime.strptime(deadline_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) > deadline


@bp.route("/<iteration_id>/submit", methods=["POST"])
@role_required(Role.STUDENT)
def submit_iteration(iteration_id):
    student_id = get_jwt_identity()
    claims     = get_jwt()
    course     = claims.get("course")

    # Find the student's group (must be approved)
    group = mongo.db.groups.find_one({
        "member_ids": ObjectId(student_id),
        "course":     course,
        "status":     "approved"
    })
    if not group:
        return error_response(
            "You must be in an approved group to submit iteration work.", 403)

    # Check iteration exists
    iteration = mongo.db.iterations.find_one({"_id": ObjectId(iteration_id)})
    if not iteration:
        return error_response("Iteration not found.", 404)

    # Upload file
    if "file" not in request.files:
        return error_response("No file provided.", 400)

    try:
        file_url  = upload_file(request.files["file"], subfolder="submissions")
        file_name = request.files["file"].filename
        file_size = request.content_length or 0
    except ValueError as e:
        return error_response(str(e), 400)

    note    = (request.form.get("note") or "").strip()
    is_late = is_submission_late(str(iteration.get("deadline", "")))
    now     = datetime.now(timezone.utc)

    # UPSERT: one submission per group per iteration
    mongo.db.submissions.update_one(
        {"group_id": group["_id"], "iteration_id": ObjectId(iteration_id)},
        {"$set": {
            "group_id":      group["_id"],
            "iteration_id":  ObjectId(iteration_id),
            "submitted_by":  ObjectId(student_id),
            "file_url":      file_url,
            "file_name":     file_name,
            "file_size":     file_size,
            "note":          note,
            "is_late":       is_late,
            "submitted_at":  now,
        }},
        upsert=True
    )

    log_audit(mongo.db, student_id, Role.STUDENT, "submissions", "submit",
              group["_id"], new_value={"iteration_id": iteration_id, "is_late": is_late})

    return success_response(
        f"Submission {'received (LATE)' if is_late else 'received on time'}.",
        data={"file_url": file_url, "is_late": is_late}
    ), 201
```

---

### S3-QA-01: Storage Service (Local Mock)

```python
# backend/app/services/storage_service.py
import os
from werkzeug.utils import secure_filename
from datetime import datetime

UPLOAD_DIR        = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
ALLOWED_EXTENSIONS = {"pdf", "docx", "xlsx", "zip"}
MAX_FILE_SIZE     = 10 * 1024 * 1024  # 10 MB


def upload_file(file, subfolder: str = "submissions") -> str:
    """
    Saves file to uploads/<subfolder>/. Returns the relative URL path.
    In production: swap this for Cloudinary upload (Sprint 9).

    Raises ValueError for invalid file type or size.
    """
    if not file or not file.filename:
        raise ValueError("No file provided.")

    extension = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"File type '.{extension}' is not allowed. Accepted: {', '.join(ALLOWED_EXTENSIONS)}."
        )

    # Read to check size (then reset stream)
    file_bytes = file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise ValueError(f"File size exceeds 10 MB limit ({len(file_bytes) / 1024 / 1024:.1f} MB).")
    file.stream.seek(0)  # Reset so we can save it

    # Build a timestamped filename to avoid collisions
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_name = secure_filename(file.filename)
    filename  = f"{timestamp}_{safe_name}"

    save_dir = os.path.join(UPLOAD_DIR, subfolder)
    os.makedirs(save_dir, exist_ok=True)
    file.save(os.path.join(save_dir, filename))

    return f"/uploads/{subfolder}/{filename}"
```

> [!NOTE]
> Add `uploads/` to `backend/.gitignore` so uploaded files are never committed to Git.

---

### S3-FE-03: RubricBuilderModal.jsx

```jsx
// frontend/src/pages/manager/iterations/RubricBuilderModal.jsx
import { useState } from 'react';
import Modal from '../../../components/common/Modal';
import api from '../../../services/api';

const EMPTY_RUBRIC = () => ({
  question: '', weight: 0,
  levels: { '0': '', '1': '', '2': '', '3': '', '4': '', '5': '' }
});

export default function RubricBuilderModal({ iterationId, existingRubrics = [], onClose, onSave }) {
  const [rubrics, setRubrics]   = useState(existingRubrics.length > 0 ? existingRubrics : [EMPTY_RUBRIC()]);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const totalWeight = rubrics.reduce((s, r) => s + Number(r.weight || 0), 0);

  function updateRubric(index, field, value) {
    setRubrics(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  }

  function updateLevel(rIndex, level, value) {
    setRubrics(prev => prev.map((r, i) => {
      if (i !== rIndex) return r;
      return { ...r, levels: { ...r.levels, [level]: value } };
    }));
  }

  async function handleSave() {
    if (totalWeight !== 100) {
      setError(`Total weight must be exactly 100. Current: ${totalWeight}.`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post(`/manager/iterations/${iterationId}/rubrics`, { rubrics });
      onSave();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save rubrics.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Edit Rubric" onClose={onClose} width="680px">
      {/* Weight total indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', color: '#6b7280' }}>Total Weight:</span>
        <span style={{ fontWeight: 700, fontSize: '14px',
          color: totalWeight === 100 ? '#16a34a' : totalWeight > 100 ? '#dc2626' : '#d97706' }}>
          {totalWeight} / 100
        </span>
        {totalWeight === 100 && <span style={{ color: '#16a34a', fontSize: '13px' }}>✓ Valid</span>}
      </div>

      {error && <div style={{ color: '#dc2626', background: '#fef2f2', padding: '8px 12px',
        borderRadius: '4px', marginBottom: '12px', fontSize: '13px' }}>{error}</div>}

      {rubrics.map((r, i) => (
        <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: '6px',
          padding: '14px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input
              placeholder={`Criterion ${i + 1} (e.g. Problem Statement Clarity)`}
              value={r.question}
              onChange={e => updateRubric(i, 'question', e.target.value)}
              style={{ flex: 1, padding: '8px 10px', border: '1px solid #d1d5db',
                borderRadius: '4px', fontSize: '13px' }}
            />
            <input
              type="number" min="0" max="100" placeholder="Weight %"
              value={r.weight}
              onChange={e => updateRubric(i, 'weight', e.target.value)}
              style={{ width: '90px', padding: '8px 10px', border: '1px solid #d1d5db',
                borderRadius: '4px', fontSize: '13px' }}
            />
            {rubrics.length > 1 && (
              <button onClick={() => setRubrics(prev => prev.filter((_, j) => j !== i))}
                style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                  borderRadius: '4px', padding: '0 10px', cursor: 'pointer', fontSize: '16px' }}>
                ×
              </button>
            )}
          </div>
          {/* Level descriptors 0–5 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px' }}>
            {['0','1','2','3','4','5'].map(lvl => (
              <input
                key={lvl}
                placeholder={`Level ${lvl} descriptor`}
                value={r.levels[lvl]}
                onChange={e => updateLevel(i, lvl, e.target.value)}
                style={{ padding: '6px 8px', border: '1px solid #e5e7eb',
                  borderRadius: '4px', fontSize: '12px' }}
              />
            ))}
          </div>
        </div>
      ))}

      <button onClick={() => setRubrics(prev => [...prev, EMPTY_RUBRIC()])}
        style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
          padding: '8px 14px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', marginBottom: '16px' }}>
        + Add Criterion
      </button>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button onClick={onClose} style={{ padding: '9px 16px', background: '#f3f4f6',
          border: '1px solid #e5e7eb', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving || totalWeight !== 100}
          style={{ padding: '9px 16px', background: totalWeight === 100 ? '#2563eb' : '#93c5fd',
            color: '#fff', border: 'none', borderRadius: '4px',
            cursor: totalWeight === 100 ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: 600 }}>
          {saving ? 'Saving...' : 'Save Rubrics'}
        </button>
      </div>
    </Modal>
  );
}
```

---

## Sprint 3 Test Cases

```python
# backend/tests/test_iterations.py

def test_create_iteration(client, manager_token):
    resp = client.post("/api/manager/iterations",
        json={"title": "Project Proposal", "details": "Submit a proposal.",
              "course": "Final Year Project - Fall 2025", "deadline": "2026-07-10"},
        headers={"Authorization": f"Bearer {manager_token}"})
    assert resp.status_code == 201
    assert resp.get_json()["data"]["title"] == "Project Proposal"

def test_set_rubrics_weight_sum_100(client, manager_token, iteration_id):
    resp = client.post(f"/api/manager/iterations/{iteration_id}/rubrics",
        json={"rubrics": [
            {"question": "Q1", "weight": 60, "levels": {"0":"","1":"","2":"","3":"","4":"","5":""}},
            {"question": "Q2", "weight": 40, "levels": {"0":"","1":"","2":"","3":"","4":"","5":""}},
        ]},
        headers={"Authorization": f"Bearer {manager_token}"})
    assert resp.status_code == 200

def test_set_rubrics_weight_not_100_fails(client, manager_token, iteration_id):
    resp = client.post(f"/api/manager/iterations/{iteration_id}/rubrics",
        json={"rubrics": [
            {"question": "Q1", "weight": 50, "levels": {"0":"","1":"","2":"","3":"","4":"","5":""}},
        ]},
        headers={"Authorization": f"Bearer {manager_token}"})
    assert resp.status_code == 422
    assert "100" in resp.get_json()["message"]

def test_delete_iteration_blocked_if_submissions_exist(client, manager_token, iteration_with_submission):
    resp = client.delete(f"/api/manager/iterations/{iteration_with_submission}",
        headers={"Authorization": f"Bearer {manager_token}"})
    assert resp.status_code == 400

# backend/tests/test_submissions.py

def test_submit_on_time(client, student_token, approved_group, open_iteration):
    resp = client.post(f"/api/student/iterations/{open_iteration}/submit",
        data={"note": "First submission", "file": (open("tests/fixtures/sample.pdf", "rb"), "sample.pdf")},
        content_type="multipart/form-data",
        headers={"Authorization": f"Bearer {student_token}"})
    assert resp.status_code == 201
    assert resp.get_json()["data"]["is_late"] is False

def test_submit_late(client, student_token, approved_group, past_deadline_iteration):
    resp = client.post(f"/api/student/iterations/{past_deadline_iteration}/submit",
        data={"file": (open("tests/fixtures/sample.pdf", "rb"), "sample.pdf")},
        content_type="multipart/form-data",
        headers={"Authorization": f"Bearer {student_token}"})
    assert resp.status_code == 201
    assert resp.get_json()["data"]["is_late"] is True

def test_submit_rejected_if_not_in_approved_group(client, student_token_no_group, open_iteration):
    resp = client.post(f"/api/student/iterations/{open_iteration}/submit",
        data={"file": (open("tests/fixtures/sample.pdf", "rb"), "sample.pdf")},
        content_type="multipart/form-data",
        headers={"Authorization": f"Bearer {student_token_no_group}"})
    assert resp.status_code == 403
```

---

## Sprint 3 Acceptance Criteria

### Backend
- [ ] Manager can create an iteration with title, details, course, and deadline
- [ ] Manager can attach rubrics where weights sum to 100 → saved successfully
- [ ] Attaching rubrics where weights don't sum to 100 returns `422 Unprocessable Entity`
- [ ] Manager cannot delete an iteration that has submissions
- [ ] `GET /api/student/iterations` returns iterations for student's course with submission status per group
- [ ] Student in an approved group can upload a PDF for an open iteration
- [ ] `is_late: true` is set when the deadline has passed
- [ ] Re-submitting overwrites the previous submission (only one per group per iteration)
- [ ] Student not in an approved group receives `403 Forbidden` on submit
- [ ] File type rejection works: `.exe` → `400 Bad Request`
- [ ] File size over 10 MB → `400 Bad Request`

### Frontend
- [ ] Manager Iterations page lists all iterations with edit and delete controls
- [ ] "Add Iteration" modal works; new iteration appears in list
- [ ] Rubric builder shows real-time weight total; Save button disabled unless total = 100
- [ ] Student Iterations page shows each iteration with deadline countdown
- [ ] "OVERDUE" badge appears on past-deadline iterations
- [ ] Submission status badge (Submitted / Not Submitted / Submitted Late) shows per iteration
- [ ] File dropzone accepts PDF, DOCX, XLSX, ZIP only
- [ ] File over 10 MB shows an error in the UI before even sending to server

---

## Common Beginner Mistakes to Avoid

| Mistake | How to Avoid |
|---------|-------------|
| Rubric IDs not assigned before saving | Always set `r["id"] = i` (sequential from 1) before inserting rubrics |
| `file.read()` empties the stream — file.save() writes nothing | After reading for size check, call `file.stream.seek(0)` before saving |
| `uploads/` directory committed to Git | Add `uploads/` to `backend/.gitignore` immediately |
| Late detection based on client clock | Always compute `is_late` server-side using `datetime.now(timezone.utc)` |
| Rubric weight stored as string `"25"` not integer `25` | Use `int(r.get("weight", 0))` when summing |
| Student can submit to wrong course iteration | Always scope by `group.course == iteration.course` |
| Weight total shows as 0 in rubric builder | Ensure `Number(r.weight || 0)` is used in the frontend reduce, not string addition |

---

*End of Sprint 3 Document*
*Next: Sprint 4 — Evaluator Scoring, Exhibition, and Meetings*
