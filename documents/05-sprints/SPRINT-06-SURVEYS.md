# Sprint 6 — Surveys and Announcement System (Complete)
## PBL Management System · Beaconhouse National University
**Sprint Goal:** The Manager can create Likert-scale surveys, publish them to students, and view aggregate reports with charts. Students fill surveys and can re-submit (idempotent). Announcements and attachments are fully functional with rich-text content.
**FRs Covered:** FR-9.1, FR-9.2, FR-9.3, FR-9.4, FR-9.5
**Dependency:** Sprint 1 complete (courses, announcements partial); Sprint 2 complete (students enrolled in a course so they can respond to course-scoped surveys).
**Owners:** Ibrahim (all survey backend), Ramsha (manager survey pages + report), Sara (student survey pages), Ismail (idempotency logic + SMTP mock upgrade)

---

> [!NOTE]
> Survey responses are **idempotent** — if a student submits twice, the second response overwrites the first. This is intentional. Use `update_one(..., upsert=True)` for survey responses.

---

## Why Sprint 6 Exists

Surveys are BNU's mechanism for gathering student feedback on the FYP process. Without them:
- No feedback loop for improving the programme
- Manager cannot see how students are experiencing the semester

**Without Sprint 6 complete:**
- Survey report page shows no data
- Students have no way to give feedback

---

## Sprint 6 Tasks by Team Member

### Ibrahim (Backend) — Survey APIs

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S6-BE-01 | Implement `POST /api/manager/surveys` (create with questions, draft status) | `backend/app/blueprints/manager/surveys.py` | ☐ |
| S6-BE-02 | Implement `GET /api/manager/surveys` | `backend/app/blueprints/manager/surveys.py` | ☐ |
| S6-BE-03 | Implement `PUT /api/manager/surveys/<id>` (draft only) | `backend/app/blueprints/manager/surveys.py` | ☐ |
| S6-BE-04 | Implement `PATCH /api/manager/surveys/<id>/publish` | `backend/app/blueprints/manager/surveys.py` | ☐ |
| S6-BE-05 | Implement `PATCH /api/manager/surveys/<id>/close` | `backend/app/blueprints/manager/surveys.py` | ☐ |
| S6-BE-06 | Implement `DELETE /api/manager/surveys/<id>` (blocked if responses exist) | `backend/app/blueprints/manager/surveys.py` | ☐ |
| S6-BE-07 | Implement `GET /api/manager/surveys/<id>/report` (mean, median, distribution per question) | `backend/app/blueprints/manager/surveys.py` | ☐ |
| S6-BE-08 | Implement `GET /api/student/surveys` (published surveys for student's course with `responded` flag) | `backend/app/blueprints/student/surveys.py` | ☐ |
| S6-BE-09 | Implement `POST /api/student/surveys/<id>/respond` (upsert — idempotent) | `backend/app/blueprints/student/surveys.py` | ☐ |
| S6-BE-10 | Write `tests/test_surveys.py` | `backend/tests/test_surveys.py` | ☐ |
| S6-BE-11 | Add all Sprint 6 routes to Postman collection | `backend/postman/PBL-System.postman_collection.json` | ☐ |

---

### Ramsha (Frontend Lead) — Manager Survey Pages

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S6-FE-01 | Create `ManageSurveysPage.jsx` (list with status badges + publish/close/delete actions) | `frontend/src/pages/manager/surveys/ManageSurveysPage.jsx` | ☐ |
| S6-FE-02 | Create `CreateSurveyModal.jsx` (title, course, questions builder) | `frontend/src/pages/manager/surveys/CreateSurveyModal.jsx` | ☐ |
| S6-FE-03 | Create `SurveyReportPage.jsx` (per-question mean, bar chart, response count) | `frontend/src/pages/manager/surveys/SurveyReportPage.jsx` | ☐ |
| S6-FE-04 | Add Sprint 6 manager routes to `AppRouter.jsx` | `frontend/src/routes/AppRouter.jsx` | ☐ |

---

### Sara (Frontend Pages) — Student Survey Pages

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S6-UI-01 | Create `StudentSurveysPage.jsx` (published surveys with "Completed" badge) | `frontend/src/pages/student/surveys/StudentSurveysPage.jsx` | ☐ |
| S6-UI-02 | Create `FillSurveyPage.jsx` (Likert scale 1–5 radio buttons per question) | `frontend/src/pages/student/surveys/FillSurveyPage.jsx` | ☐ |
| S6-UI-03 | Add Sprint 6 student routes to `AppRouter.jsx` | `frontend/src/routes/AppRouter.jsx` | ☐ |

---

### Ismail — Email Upgrade (Optional)

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S6-OPT-01 | If SMTP is available: implement real `smtplib` email sending in `email_service.py` | `backend/app/services/email_service.py` | ☐ |

---

## Step-by-Step Instructions Per Task

---

### S6-BE-01 to S6-BE-06: Survey CRUD

```python
# backend/app/blueprints/manager/surveys.py
from flask import request
from bson import ObjectId
from datetime import datetime, timezone
from flask_jwt_extended import get_jwt_identity

from app.blueprints.manager import manager_surveys_bp as bp
from app.extensions import mongo
from app.utils.decorators import role_required
from app.utils.responses import success_response, error_response
from app.utils.audit import log_audit
from app.models.user import Role


@bp.route("/", methods=["POST"])
@role_required(Role.MANAGER)
def create_survey():
    data      = request.get_json() or {}
    title     = (data.get("title") or "").strip()
    course    = (data.get("course") or "").strip()
    questions = data.get("questions", [])

    if not title or not course:
        return error_response("'title' and 'course' are required.", 400)
    if len(questions) < 1:
        return error_response("At least one question is required.", 400)

    # Validate each question has a text and 5 level labels
    for i, q in enumerate(questions, start=1):
        if not q.get("text", "").strip():
            return error_response(f"Question {i} is missing 'text'.", 422)
        labels = q.get("labels", [])
        if len(labels) != 5:
            return error_response(
                f"Question {i} must have exactly 5 level labels (for Likert scale 1–5).", 422)
        q["id"] = i  # assign sequential ID

    doc = {
        "title":      title,
        "course":     course,
        "questions":  questions,
        "status":     "draft",       # always starts as draft
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = mongo.db.surveys.insert_one(doc)
    log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "surveys", "create",
              result.inserted_id, new_value={"title": title, "course": course})
    return success_response("Survey created as draft.", data={"id": str(result.inserted_id)}), 201


@bp.route("/<survey_id>/publish", methods=["PATCH"])
@role_required(Role.MANAGER)
def publish_survey(survey_id):
    result = mongo.db.surveys.update_one(
        {"_id": ObjectId(survey_id), "status": "draft"},
        {"$set": {"status": "published", "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        return error_response("Survey not found or not in draft status.", 404)
    log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "surveys", "publish", ObjectId(survey_id))
    return success_response("Survey published. Students can now fill it.")


@bp.route("/<survey_id>/close", methods=["PATCH"])
@role_required(Role.MANAGER)
def close_survey(survey_id):
    result = mongo.db.surveys.update_one(
        {"_id": ObjectId(survey_id), "status": "published"},
        {"$set": {"status": "closed", "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        return error_response("Survey not found or not in published status.", 404)
    log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "surveys", "close", ObjectId(survey_id))
    return success_response("Survey closed. No new responses will be accepted.")


@bp.route("/<survey_id>", methods=["DELETE"])
@role_required(Role.MANAGER)
def delete_survey(survey_id):
    # Block deletion if responses exist
    response_count = mongo.db.survey_responses.count_documents(
        {"survey_id": ObjectId(survey_id)})
    if response_count > 0:
        return error_response(
            f"Cannot delete — this survey has {response_count} response(s). Close it instead.", 400)

    mongo.db.surveys.delete_one({"_id": ObjectId(survey_id)})
    log_audit(mongo.db, get_jwt_identity(), Role.MANAGER, "surveys", "delete", ObjectId(survey_id))
    return success_response("Survey deleted.")
```

---

### S6-BE-07: Survey Report — Mean, Median, Distribution

```python
# Continuation of surveys.py

@bp.route("/<survey_id>/report", methods=["GET"])
@role_required(Role.MANAGER)
def survey_report(survey_id):
    survey = mongo.db.surveys.find_one({"_id": ObjectId(survey_id)})
    if not survey:
        return error_response("Survey not found.", 404)

    responses = list(mongo.db.survey_responses.find({"survey_id": ObjectId(survey_id)}))
    total_responses = len(responses)

    if total_responses == 0:
        return success_response("Survey report (no responses yet).", data={
            "total_responses": 0, "questions": []})

    import statistics

    question_reports = []
    for q in survey.get("questions", []):
        qid = str(q["id"])
        # Collect all scores for this question
        scores = [int(r["answers"].get(qid, 0)) for r in responses if qid in r.get("answers", {})]
        scores = [s for s in scores if 1 <= s <= 5]

        distribution = {str(lvl): scores.count(lvl) for lvl in range(1, 6)}
        mean_val   = round(statistics.mean(scores), 2)   if scores else 0
        median_val = statistics.median(scores)           if scores else 0

        question_reports.append({
            "id":           q["id"],
            "text":         q.get("text", ""),
            "total":        len(scores),
            "mean":         mean_val,
            "median":       median_val,
            "distribution": distribution,
        })

    return success_response("Survey report.", data={
        "survey_id":      str(survey["_id"]),
        "title":          survey["title"],
        "total_responses": total_responses,
        "questions":      question_reports,
    })
```

---

### S6-BE-09: Student Survey Response — Idempotent Upsert

```python
# backend/app/blueprints/student/surveys.py (excerpt)

@student_surveys_bp.route("/<survey_id>/respond", methods=["POST"])
@role_required(Role.STUDENT)
def respond_to_survey(survey_id):
    """
    Idempotent: if the student already responded, their previous answers are overwritten.
    This is intentional — students may change their mind.
    """
    student_id = get_jwt_identity()
    data       = request.get_json() or {}
    answers    = data.get("answers", {})  # { "1": 4, "2": 3, "3": 5, ... }

    # Verify survey is published
    survey = mongo.db.surveys.find_one({"_id": ObjectId(survey_id)})
    if not survey:
        return error_response("Survey not found.", 404)
    if survey.get("status") != "published":
        return error_response(
            "This survey is not open for responses. "
            f"Status: {survey.get('status', 'unknown')}.", 400)

    # Validate answers: all question IDs present and values are 1–5
    question_ids = {str(q["id"]) for q in survey.get("questions", [])}
    for qid in question_ids:
        if str(qid) not in answers:
            return error_response(f"Missing answer for question {qid}.", 422)
        val = answers.get(str(qid))
        if not isinstance(val, int) or val < 1 or val > 5:
            return error_response(f"Answer for question {qid} must be an integer 1–5.", 422)

    # UPSERT: one response per student per survey
    mongo.db.survey_responses.update_one(
        {"survey_id": ObjectId(survey_id), "student_id": ObjectId(student_id)},
        {"$set": {
            "survey_id":    ObjectId(survey_id),
            "student_id":   ObjectId(student_id),
            "answers":      answers,
            "submitted_at": datetime.now(timezone.utc),
        }},
        upsert=True
    )

    log_audit(mongo.db, student_id, Role.STUDENT, "survey_responses", "respond",
              ObjectId(survey_id))
    return success_response("Survey response recorded. Thank you!")
```

---

### S6-FE-02: FillSurveyPage.jsx

```jsx
// frontend/src/pages/student/surveys/FillSurveyPage.jsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useApi from '../../../hooks/useApi';
import api from '../../../services/api';
import LoadingSkeleton from '../../../components/common/LoadingSkeleton';

export default function FillSurveyPage() {
  const { surveyId }              = useParams();
  const navigate                  = useNavigate();
  const { data: survey, loading } = useApi(`/student/surveys/${surveyId}`);
  const [answers, setAnswers]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]         = useState('');

  if (loading) return <LoadingSkeleton rows={5} />;
  if (!survey) return <div>Survey not found.</div>;

  const allAnswered = survey.questions?.every(q => answers[String(q.id)] !== undefined);

  async function handleSubmit() {
    if (!allAnswered) { setError('Please answer all questions before submitting.'); return; }
    setSubmitting(true); setError('');
    try {
      await api.post(`/student/surveys/${surveyId}/respond`, { answers });
      setSubmitted(true);
      setTimeout(() => navigate('/student/surveys'), 2000);
    } catch (err) {
      setError(err.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
      <div style={{ fontSize: '18px', fontWeight: 600, color: '#16a34a' }}>
        Response submitted! Redirecting...
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1e3a5f', marginBottom: '6px' }}>
        {survey.title}
      </h1>
      <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '24px' }}>
        Rate each item from 1 (Strongly Disagree) to 5 (Strongly Agree).
      </p>

      {survey.questions?.map((q, i) => (
        <div key={q.id} style={{ marginBottom: '24px', padding: '16px', background: '#f9fafb',
          borderRadius: '6px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontWeight: 600, fontSize: '14px', color: '#1e3a5f', marginBottom: '12px' }}>
            {i + 1}. {q.text}
          </div>
          {/* Labels: q.labels is a 5-element array for values 1–5 */}
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between' }}>
            {[1,2,3,4,5].map(val => (
              <label key={val} style={{ flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', cursor: 'pointer', padding: '10px 4px',
                background: answers[String(q.id)] === val ? '#dbeafe' : '#fff',
                border: `2px solid ${answers[String(q.id)] === val ? '#2563eb' : '#e5e7eb'}`,
                borderRadius: '6px', transition: 'all 0.1s' }}>
                <input
                  type="radio" name={`q-${q.id}`} value={val}
                  checked={answers[String(q.id)] === val}
                  onChange={() => setAnswers(a => ({...a, [String(q.id)]: val}))}
                  style={{ display: 'none' }}
                />
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#2563eb' }}>{val}</span>
                <span style={{ fontSize: '10px', color: '#6b7280', textAlign: 'center',
                  marginTop: '4px', lineHeight: '1.2' }}>
                  {q.labels?.[val - 1]}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}

      {error && <div style={{ color: '#dc2626', fontSize: '13px', marginBottom: '10px' }}>{error}</div>}

      <button onClick={handleSubmit} disabled={submitting || !allAnswered} style={{
        background: allAnswered ? '#2563eb' : '#93c5fd', color: '#fff',
        border: 'none', padding: '11px 24px', borderRadius: '4px',
        fontSize: '14px', fontWeight: 600, cursor: allAnswered ? 'pointer' : 'not-allowed',
        width: '100%' }}>
        {submitting ? 'Submitting...' : 'Submit Survey Response'}
      </button>
    </div>
  );
}
```

---

## Sprint 6 Test Cases

```python
# backend/tests/test_surveys.py

def test_create_survey_success(client, manager_token):
    resp = client.post("/api/manager/surveys",
        json={"title": "Semester Feedback", "course": "Final Year Project - Fall 2025",
              "questions": [
                  {"text": "I found the FYP process clear.", "labels": ["SD","D","N","A","SA"]},
                  {"text": "My supervisor was helpful.", "labels": ["SD","D","N","A","SA"]},
              ]},
        headers={"Authorization": f"Bearer {manager_token}"})
    assert resp.status_code == 201
    assert resp.get_json()["data"]["id"]

def test_survey_created_as_draft(client, manager_token, survey_id):
    resp = client.get(f"/api/manager/surveys/{survey_id}",
        headers={"Authorization": f"Bearer {manager_token}"})
    assert resp.get_json()["data"]["status"] == "draft"

def test_student_cannot_see_draft_survey(client, student_token, draft_survey_id):
    resp = client.get("/api/student/surveys",
        headers={"Authorization": f"Bearer {student_token}"})
    ids = [s["id"] for s in resp.get_json()["data"]]
    assert draft_survey_id not in ids

def test_student_can_fill_published_survey(client, student_token, published_survey_id):
    resp = client.post(f"/api/student/surveys/{published_survey_id}/respond",
        json={"answers": {"1": 4, "2": 5}},
        headers={"Authorization": f"Bearer {student_token}"})
    assert resp.status_code == 200

def test_student_resubmit_overwrites(client, student_token, published_survey_id):
    """Idempotent: second submission updates the first."""
    client.post(f"/api/student/surveys/{published_survey_id}/respond",
        json={"answers": {"1": 2, "2": 3}},
        headers={"Authorization": f"Bearer {student_token}"})
    client.post(f"/api/student/surveys/{published_survey_id}/respond",
        json={"answers": {"1": 5, "2": 5}},
        headers={"Authorization": f"Bearer {student_token}"})
    # Only 1 response should exist
    count = get_response_count_for(published_survey_id, student_token)
    assert count == 1

def test_closed_survey_blocks_response(client, student_token, closed_survey_id):
    resp = client.post(f"/api/student/surveys/{closed_survey_id}/respond",
        json={"answers": {"1": 3}},
        headers={"Authorization": f"Bearer {student_token}"})
    assert resp.status_code == 400

def test_survey_with_responses_cannot_be_deleted(client, manager_token, survey_with_response):
    resp = client.delete(f"/api/manager/surveys/{survey_with_response}",
        headers={"Authorization": f"Bearer {manager_token}"})
    assert resp.status_code == 400
```

---

## Sprint 6 Acceptance Criteria

### Backend
- [ ] Manager creates survey → status is `draft`
- [ ] Draft survey is not visible to students in `GET /api/student/surveys`
- [ ] Manager publishes survey → students see it
- [ ] Student fills all questions (1–5) → response saved
- [ ] Student re-submits → only one response document per student per survey
- [ ] Closed survey → student response returns `400 Bad Request` with clear message
- [ ] Survey with at least one response → delete returns `400 Bad Request`
- [ ] Survey report returns `total_responses`, `mean`, `median`, `distribution` per question
- [ ] All survey tests pass

### Frontend
- [ ] Manager Surveys page shows all surveys with status badges (Draft / Published / Closed)
- [ ] Publish and Close buttons appear based on current status
- [ ] Create Survey modal has question builder (add/remove questions)
- [ ] Survey Report page shows bar chart per question (using Recharts)
- [ ] Student Surveys page shows "Completed" badge on surveys already filled
- [ ] Fill Survey page shows Likert scale cards (1–5) with level labels
- [ ] Submit button disabled until all questions answered

---

## Common Beginner Mistakes to Avoid

| Mistake | How to Avoid |
|---------|-------------|
| Student sees draft surveys | Always filter `GET /api/student/surveys` with `{"status": "published"}` |
| `upsert=True` not used for responses | Without upsert, re-submit creates a second document. Always use `update_one(..., upsert=True)` |
| Survey deleted even with responses | Check `survey_responses.count_documents({survey_id})` before deleting |
| Question labels array has wrong length | Validate `len(labels) == 5` for each question |
| Median fails with empty list | Check `if scores:` before calling `statistics.median(scores)` |
| Recharts bar chart showing no bars | Ensure data key matches `dataKey` prop exactly |
| Fill survey submits partial answers | Validate `allAnswered` flag in frontend before enabling the submit button |

---

*End of Sprint 6 Document*
*Next: Sprint 7 — Reporting, PDF Export, and Integration Polish*
