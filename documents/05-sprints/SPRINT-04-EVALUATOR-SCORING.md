# Sprint 4 — Evaluator Scoring, Exhibition Evaluation, and Meetings
## PBL Management System · Beaconhouse National University
**Sprint Goal:** Evaluators can view their assigned groups, submit immutable rubric scores for each iteration, log supervision meetings, and submit exhibition evaluations. All scores are locked on creation — no editing allowed.
**FRs Covered:** FR-6.1, FR-6.2, FR-6.3, FR-7.1, FR-7.2, FR-8.1, FR-8.2
**Dependency:** Sprint 3 fully complete — iterations with rubrics must exist; groups must be approved and evaluators assigned (Sprint 2).
**Owners:** Ismail (all evaluator backend), Ramsha (evaluator groups and eval pages), Sara (meetings + exhibition), Ibrahim (evaluation tests including concurrency + lock enforcement)

---

> [!CAUTION]
> Evaluations are IMMUTABLE. Once submitted, they CANNOT be updated, edited, or deleted — by anyone, including the Manager. This is a hard academic integrity requirement. No PUT, PATCH, or DELETE endpoint must exist for evaluations or exhibition_evaluations. Any attempt must return HTTP 405 Method Not Allowed.

---

## Why Sprint 4 Exists

After Sprints 1–3, there is data but no scoring. The entire reporting system (Sprints 5 and 7) depends on evaluation data. Without evaluations:
- HOD and Dean dashboards (Sprint 5) show no performance metrics
- Group and iteration reports (Sprint 7) are empty
- The FYP process cannot conclude

---

## Sprint 4 Tasks by Team Member

### Ismail (Backend Lead) — Evaluator APIs

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S4-BE-01 | Implement `GET /api/evaluator/dashboard` (pending eval counts, assigned groups) | `backend/app/blueprints/evaluator/routes.py` | ☐ |
| S4-BE-02 | Implement `GET /api/evaluator/groups` (assigned groups only) | `backend/app/blueprints/evaluator/routes.py` | ☐ |
| S4-BE-03 | Implement `GET /api/evaluator/groups/<id>` (group detail + submissions + eval status) | `backend/app/blueprints/evaluator/routes.py` | ☐ |
| S4-BE-04 | Implement `POST /api/evaluator/evaluations` (locked on create, compute weighted score) | `backend/app/blueprints/evaluator/evaluations.py` | ☐ |
| S4-BE-05 | Implement `GET /api/evaluator/evaluations` (filter by group, iteration) | `backend/app/blueprints/evaluator/evaluations.py` | ☐ |
| S4-BE-06 | Block PUT/PATCH/DELETE on evaluations with 405 Method Not Allowed | `backend/app/blueprints/evaluator/evaluations.py` | ☐ |
| S4-BE-07 | Implement `GET /api/evaluator/exhibition` (assigned groups with exhibition eval status) | `backend/app/blueprints/evaluator/exhibition.py` | ☐ |
| S4-BE-08 | Implement `POST /api/evaluator/exhibition` (locked on create) | `backend/app/blueprints/evaluator/exhibition.py` | ☐ |
| S4-BE-09 | Implement `POST /api/evaluator/meetings` | `backend/app/blueprints/evaluator/meetings.py` | ☐ |
| S4-BE-10 | Implement `GET /api/evaluator/meetings` (filter by group, iteration) | `backend/app/blueprints/evaluator/meetings.py` | ☐ |
| S4-BE-11 | Add all Sprint 4 routes to Postman collection | `backend/postman/PBL-System.postman_collection.json` | ☐ |

---

### Ramsha (Frontend Lead) — Evaluator Dashboard and Groups

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S4-FE-01 | Create `EvaluatorDashboard.jsx` (stat cards: assigned groups, pending evals) | `frontend/src/pages/evaluator/EvaluatorDashboard.jsx` | ☐ |
| S4-FE-02 | Create `AssignedGroupsPage.jsx` (list of assigned groups + eval status per iteration) | `frontend/src/pages/evaluator/groups/AssignedGroupsPage.jsx` | ☐ |
| S4-FE-03 | Create `GroupEvalDetail.jsx` (group view with submission download + eval form or locked view) | `frontend/src/pages/evaluator/groups/GroupEvalDetail.jsx` | ☐ |
| S4-FE-04 | Create `EvaluationSheet.jsx` (rubric form: 0–5 radio buttons per criterion + weight display) | `frontend/src/pages/evaluator/evaluations/EvaluationSheet.jsx` | ☐ |
| S4-FE-05 | Add Sprint 4 evaluator routes to `AppRouter.jsx` | `frontend/src/routes/AppRouter.jsx` | ☐ |

---

### Sara (Frontend Pages) — Exhibition and Meetings

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S4-UI-01 | Create `ExhibitionPage.jsx` (assigned groups with exhibition eval status) | `frontend/src/pages/evaluator/exhibition/ExhibitionPage.jsx` | ☐ |
| S4-UI-02 | Create `ExhibitionEvalForm.jsx` (same rubric-style scoring for exhibition) | `frontend/src/pages/evaluator/exhibition/ExhibitionEvalForm.jsx` | ☐ |
| S4-UI-03 | Create `MeetingsPage.jsx` (list of logged meetings + "Log Meeting" button) | `frontend/src/pages/evaluator/meetings/MeetingsPage.jsx` | ☐ |
| S4-UI-04 | Create `MeetingFormModal.jsx` (date, title, agenda, minutes fields) | `frontend/src/pages/evaluator/meetings/MeetingFormModal.jsx` | ☐ |
| S4-UI-05 | Add Sprint 4 routes to `AppRouter.jsx` | `frontend/src/routes/AppRouter.jsx` | ☐ |

---

### Ibrahim (Backend + Testing) — Evaluation Lock Tests

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S4-QA-01 | Write `tests/test_evaluations.py` (success, duplicate, wrong evaluator, lock enforcement) | `backend/tests/test_evaluations.py` | ☐ |
| S4-QA-02 | Write `tests/test_exhibition.py` (success, duplicate) | `backend/tests/test_exhibition.py` | ☐ |
| S4-QA-03 | Write `tests/test_meetings.py` | `backend/tests/test_meetings.py` | ☐ |
| S4-QA-04 | Verify CI passes with new tests | `.github/workflows/ci.yml` | ☐ |

---

## Step-by-Step Instructions Per Task

---

### S4-BE-04: Submit Evaluation (Locked on Create)

```python
# backend/app/blueprints/evaluator/evaluations.py
from flask import request
from bson import ObjectId
from datetime import datetime, timezone
from flask_jwt_extended import get_jwt_identity

from app.blueprints.evaluator import evaluations_bp as bp
from app.extensions import mongo
from app.utils.decorators import role_required
from app.utils.responses import success_response, error_response
from app.utils.audit import log_audit
from app.models.user import Role


def compute_total_weighted_score(scores: dict, rubrics: list) -> float:
    """
    Formula: Σ (score_i / 5) × weight_i  for each rubric question.
    scores:  { "1": 4, "2": 3, ... }  — keys are rubric IDs as strings
    rubrics: [ { "id": 1, "weight": 25, ... } ]
    """
    rubric_map = {str(r["id"]): int(r["weight"]) for r in rubrics}
    total = 0.0
    for rubric_id_str, score in scores.items():
        weight = rubric_map.get(str(rubric_id_str), 0)
        total += (int(score) / 5) * weight
    return round(total, 2)


@bp.route("/", methods=["POST"])
@role_required(Role.EVALUATOR)
def submit_evaluation():
    evaluator_id = get_jwt_identity()
    data = request.get_json() or {}

    group_id     = data.get("group_id")
    iteration_id = data.get("iteration_id")
    scores       = data.get("scores", {})
    comment      = (data.get("comment") or "").strip()

    if not group_id or not iteration_id or not scores:
        return error_response("group_id, iteration_id, and scores are required.", 400)

    # Verify evaluator is assigned to this group
    assignment = mongo.db.assignments.find_one({
        "evaluator_id": ObjectId(evaluator_id),
        "group_id":     ObjectId(group_id),
    })
    if not assignment:
        return error_response(
            "You are not assigned to this group. Cannot submit evaluation.", 403)

    # Prevent duplicates (unique compound index handles DB-level, this handles user-facing message)
    existing = mongo.db.evaluations.find_one({
        "group_id":     ObjectId(group_id),
        "iteration_id": ObjectId(iteration_id),
        "evaluator_id": ObjectId(evaluator_id),
    })
    if existing:
        return error_response(
            "You have already submitted an evaluation for this group and iteration. "
            "Evaluations are locked and cannot be resubmitted.", 409)

    # Validate scores against rubric questions
    iteration = mongo.db.iterations.find_one({"_id": ObjectId(iteration_id)})
    if not iteration:
        return error_response("Iteration not found.", 404)

    rubrics        = iteration.get("rubrics", [])
    rubric_ids_str = {str(r["id"]) for r in rubrics}
    for key, val in scores.items():
        if str(key) not in rubric_ids_str:
            return error_response(f"Score key '{key}' does not match any rubric question.", 422)
        if not isinstance(val, int) or val < 0 or val > 5:
            return error_response(f"Score for rubric '{key}' must be an integer between 0 and 5.", 422)

    total_score = compute_total_weighted_score(scores, rubrics)

    # Insert — set locked: True immediately (no future updates possible)
    doc = {
        "group_id":            ObjectId(group_id),
        "iteration_id":        ObjectId(iteration_id),
        "evaluator_id":        ObjectId(evaluator_id),
        "scores":              scores,
        "total_weighted_score": total_score,
        "comment":             comment,
        "locked":              True,      # ALWAYS True — evaluations are immutable
        "submitted_at":        datetime.now(timezone.utc),
    }
    result = mongo.db.evaluations.insert_one(doc)
    log_audit(mongo.db, evaluator_id, Role.EVALUATOR, "evaluations", "create",
              result.inserted_id, new_value={"group_id": group_id, "total_score": total_score})

    return success_response(
        f"Evaluation submitted and locked. Total weighted score: {total_score}.",
        data={"id": str(result.inserted_id), "total_weighted_score": total_score}
    ), 201


# Immutability guard — explicitly block all modification methods
@bp.route("/<evaluation_id>", methods=["PUT", "PATCH", "DELETE"])
@role_required(Role.EVALUATOR)
def evaluation_immutable(evaluation_id):
    return error_response(
        "Evaluations are immutable after submission. "
        "Contact your PBL Manager if you believe there is an error.", 405)
```

---

### S4-FE-04: EvaluationSheet.jsx

```jsx
// frontend/src/pages/evaluator/evaluations/EvaluationSheet.jsx
/**
 * Rubric scoring form for one iteration.
 * Shows 0-5 radio buttons per criterion with weight.
 * After submission, shows the locked view.
 */
import { useState } from 'react';
import api from '../../../services/api';

export default function EvaluationSheet({ groupId, iterationId, rubrics, existingEval, onSubmit }) {
  const [scores, setScores]     = useState(() => {
    // Pre-fill from existing evaluation if already locked
    const s = {};
    rubrics.forEach(r => { s[String(r.id)] = existingEval?.scores?.[r.id] ?? null; });
    return s;
  });
  const [comment, setComment]   = useState(existingEval?.comment || '');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const isLocked = !!existingEval;

  async function handleSubmit() {
    const incomplete = rubrics.some(r => scores[String(r.id)] === null);
    if (incomplete) { setError('Please score all criteria before submitting.'); return; }
    setSaving(true);
    setError('');
    try {
      await api.post('/evaluator/evaluations', {
        group_id: groupId, iteration_id: iterationId,
        scores: Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, Number(v)])),
        comment,
      });
      onSubmit();
    } catch (err) {
      setError(err.message || 'Submission failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {isLocked && (
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a',
          borderRadius: '4px', padding: '8px 12px', fontSize: '13px', color: '#92400e', marginBottom: '16px' }}>
          🔒 This evaluation has been submitted and is <strong>locked</strong>.
          Score: <strong>{existingEval.total_weighted_score}</strong> / 100
        </div>
      )}

      {rubrics.map(r => (
        <div key={r.id} style={{ marginBottom: '20px', padding: '14px',
          background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontWeight: 600, fontSize: '13.5px', color: '#1e3a5f' }}>
              {r.question}
            </span>
            <span style={{ background: '#eff6ff', color: '#2563eb', fontSize: '12px',
              padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
              Weight: {r.weight}%
            </span>
          </div>
          {/* 0–5 radio buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[0,1,2,3,4,5].map(lvl => (
              <label key={lvl} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                cursor: isLocked ? 'not-allowed' : 'pointer',
                opacity: isLocked && scores[String(r.id)] !== lvl ? 0.4 : 1
              }}>
                <input
                  type="radio" name={`r-${r.id}`} value={lvl}
                  checked={scores[String(r.id)] === lvl}
                  onChange={() => !isLocked && setScores(s => ({...s, [String(r.id)]: lvl}))}
                  disabled={isLocked}
                  style={{ marginBottom: '4px' }}
                />
                <span style={{ fontSize: '12px', fontWeight: 600 }}>{lvl}</span>
                <span style={{ fontSize: '10px', color: '#6b7280', textAlign: 'center',
                  maxWidth: '70px', lineHeight: '1.2' }}>
                  {r.levels?.[String(lvl)]}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '5px' }}>
          General Comment (optional)
        </label>
        <textarea
          value={comment} rows={3} disabled={isLocked}
          onChange={e => setComment(e.target.value)}
          placeholder="Any general feedback for this group..."
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db',
            borderRadius: '4px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }}
        />
      </div>

      {error && <div style={{ color: '#dc2626', fontSize: '13px', marginBottom: '10px' }}>{error}</div>}

      {!isLocked && (
        <button onClick={handleSubmit} disabled={saving} style={{
          background: saving ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none',
          padding: '10px 20px', borderRadius: '4px', fontSize: '14px',
          fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Submitting...' : 'Submit Evaluation (Locked After Submit)'}
        </button>
      )}
    </div>
  );
}
```

---

## Sprint 4 Test Cases

```python
# backend/tests/test_evaluations.py

def test_submit_evaluation_success(client, evaluator_token, assigned_group, iteration_with_rubrics):
    resp = client.post("/api/evaluator/evaluations",
        json={
            "group_id":     assigned_group["id"],
            "iteration_id": iteration_with_rubrics["id"],
            "scores":       {"1": 4, "2": 3},
            "comment":      "Good proposal."
        },
        headers={"Authorization": f"Bearer {evaluator_token}"})
    assert resp.status_code == 201
    d = resp.get_json()["data"]
    assert "total_weighted_score" in d
    assert d["total_weighted_score"] >= 0

def test_duplicate_evaluation_returns_409(client, evaluator_token, submitted_evaluation):
    """Second submit for same group+iteration returns 409."""
    resp = client.post("/api/evaluator/evaluations",
        json={
            "group_id":     submitted_evaluation["group_id"],
            "iteration_id": submitted_evaluation["iteration_id"],
            "scores":       {"1": 5, "2": 5},
        },
        headers={"Authorization": f"Bearer {evaluator_token}"})
    assert resp.status_code == 409

def test_evaluation_locked_cannot_update(client, evaluator_token, submitted_evaluation):
    """PUT on an evaluation returns 405 Method Not Allowed."""
    resp = client.put(f"/api/evaluator/evaluations/{submitted_evaluation['id']}",
        json={"scores": {"1": 5}},
        headers={"Authorization": f"Bearer {evaluator_token}"})
    assert resp.status_code == 405

def test_evaluator_cannot_evaluate_unassigned_group(client, evaluator_token, unassigned_group):
    resp = client.post("/api/evaluator/evaluations",
        json={"group_id": unassigned_group["id"], "iteration_id": "some_id", "scores": {}},
        headers={"Authorization": f"Bearer {evaluator_token}"})
    assert resp.status_code == 403

def test_total_weighted_score_computed_correctly():
    """Unit test for score computation — no HTTP call needed."""
    from app.blueprints.evaluator.evaluations import compute_total_weighted_score
    rubrics = [{"id": 1, "weight": 60}, {"id": 2, "weight": 40}]
    scores  = {"1": 5, "2": 3}
    # (5/5 × 60) + (3/5 × 40) = 60 + 24 = 84
    assert compute_total_weighted_score(scores, rubrics) == 84.0

def test_invalid_score_range_rejected(client, evaluator_token, assigned_group, iteration_with_rubrics):
    resp = client.post("/api/evaluator/evaluations",
        json={"group_id": assigned_group["id"],
              "iteration_id": iteration_with_rubrics["id"],
              "scores": {"1": 6}},  # 6 is out of range
        headers={"Authorization": f"Bearer {evaluator_token}"})
    assert resp.status_code == 422
```

---

## Sprint 4 Acceptance Criteria

### Backend
- [ ] `GET /api/evaluator/groups` returns ONLY groups assigned to the logged-in evaluator
- [ ] Evaluator calling `GET /api/evaluator/groups` does not see unassigned groups (even with correct ID in URL)
- [ ] `POST /api/evaluator/evaluations` creates evaluation with `locked: true`, returns `total_weighted_score`
- [ ] Score values outside 0–5 return `422 Unprocessable Entity`
- [ ] Score key not matching a rubric question ID returns `422`
- [ ] Duplicate evaluation (same group + iteration + evaluator) returns `409 Conflict`
- [ ] `PUT /api/evaluator/evaluations/<id>` returns `405 Method Not Allowed`
- [ ] Exhibition evaluation follows same rules (locked, no duplicate, 405 on update)
- [ ] Meeting logged successfully with all optional fields working
- [ ] `total_weighted_score` calculation is mathematically correct (unit test passes)

### Frontend
- [ ] Evaluator dashboard shows real counts from the API
- [ ] Assigned groups page shows only that evaluator's groups
- [ ] Evaluation sheet shows rubric criteria with 0–5 radio buttons per criterion
- [ ] Each level shows its descriptor text next to the radio button
- [ ] Submit button shows warning: "Evaluation locked after submit"
- [ ] After submit, form is replaced with a locked view showing submitted scores
- [ ] "Log Meeting" button opens a modal with date, title, agenda, minutes fields

---

## Common Beginner Mistakes to Avoid

| Mistake | How to Avoid |
|---------|-------------|
| Setting `locked: false` initially then updating to `True` | Always set `locked: True` at insert time — never a two-step process |
| Weighted score computed with string division `"4" / 5` | Cast all scores to `int()` before arithmetic |
| Evaluator can see groups not in `assignments` collection | The `GET /api/evaluator/groups` query must do a lookup/join against `assignments` |
| Forgetting to block PUT/PATCH/DELETE | Add the `evaluation_immutable` route explicitly — Flask does not auto-block unused methods |
| Exhibition form shows same rubrics as iteration rubrics | Exhibition uses a separate rubric set defined by the Manager — fetch from `exhibition_rubrics` (or embed in course doc) |
| Meeting modal has no loading state | Disable the submit button while `saving = true` |
| Score keys in dict are integers vs strings | MongoDB stores dict keys as strings — use `str(rubric_id)` consistently |

---

*End of Sprint 4 Document*
*Next: Sprint 5 — HOD and Dean Dashboards*
