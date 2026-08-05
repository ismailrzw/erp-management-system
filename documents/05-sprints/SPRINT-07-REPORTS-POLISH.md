# Sprint 7 — Reports, PDF Export, and Integration Polish
## PBL Management System · Beaconhouse National University
**Sprint Goal:** All reporting endpoints are complete (Group Reports, Iteration Reports for Manager, HOD, Dean). PDF export works for all dashboards. All navigation links work. The system is functionally complete for Sprints 1–6 with no stub pages remaining.
**FRs Covered:** FR-11.4 (HOD PDF Export), FR-13.1 (Group Reports), FR-13.2 (Iteration Reports)
**Dependency:** All previous sprints (1–6) must be complete — reports aggregate data from groups, submissions, and evaluations.
**Owners:** Ibrahim (all report backend), All team (integration polishing, broken links, UI consistency)

---

> [!NOTE]
> Sprint 7 is both a feature sprint (reports) and a polish sprint. Dedicate the last 2–3 days entirely to integration testing — log in as each of the 6 roles and click through every page. Fix anything that is broken, blank, or missing.

---

## Why Sprint 7 Exists

Reports are how the FYP programme is assessed and improved. Without complete report data:
- Manager cannot see which groups are underperforming
- HOD cannot submit a departmental progress report to the Dean
- Iteration performance data is invisible to all oversight roles

**Polish is equally important:** A system with broken navigation links or blank pages will fail in any user acceptance test or live demo.

---

## Sprint 7 Tasks by Team Member

### Ibrahim — Report Backend

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S7-BE-01 | Implement `GET /api/manager/reports/groups` | `backend/app/blueprints/manager/reports.py` | ☐ |
| S7-BE-02 | Implement `GET /api/manager/reports/iterations` | `backend/app/blueprints/manager/reports.py` | ☐ |
| S7-BE-03 | Add all Sprint 7 routes to Postman collection | `backend/postman/PBL-System.postman_collection.json` | ☐ |
| S7-BE-04 | Verify HOD/Dean report routes (added in Sprint 5) return correct data | `backend/app/blueprints/hod/`, `dean/` | ☐ |

---

### Sara — PDF Export and Report Pages

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S7-UI-01 | Create `GroupReportsPage.jsx` (manager view — all groups table with eval scores) | `frontend/src/pages/manager/reports/GroupReportsPage.jsx` | ☐ |
| S7-UI-02 | Create `IterationReportsPage.jsx` (manager view — per iteration submission + score stats) | `frontend/src/pages/manager/reports/IterationReportsPage.jsx` | ☐ |
| S7-UI-03 | Add "Print / Export PDF" button to HOD and Dean pages | `pages/hod/`, `pages/dean/` | ☐ |
| S7-UI-04 | Implement browser print CSS: `@media print { .no-print { display: none } }` | `frontend/src/index.css` | ☐ |

---

### All Team — Integration Polishing Checklist

Each person is responsible for fixing their own pages. Complete the following:

| Task ID | Task | Owner | Status |
|---------|------|-------|--------|
| S7-INT-01 | Log in as Manager → click every Sidebar link → fix any 404 or blank page | Ismail | ☐ |
| S7-INT-02 | Log in as Student → click every page → fix any 404 or broken state | Ramsha | ☐ |
| S7-INT-03 | Log in as Evaluator → click every page → fix any 404 or broken state | Sara | ☐ |
| S7-INT-04 | Log in as HOD → verify all data is dept-scoped | Ibrahim | ☐ |
| S7-INT-05 | Log in as Dean → verify university-wide data | Ibrahim | ☐ |
| S7-INT-06 | Verify all tables show empty state when no data, not just blank | Ramsha + Sara | ☐ |
| S7-INT-07 | Verify all forms show error messages on failed submit, not console.error | Ramsha + Sara | ☐ |
| S7-INT-08 | Verify all loading states work — no flicker of empty state before data loads | All | ☐ |
| S7-INT-09 | Add breadcrumbs or page headings to all pages that are missing them | Sara | ☐ |
| S7-INT-10 | Remove all `console.log` debugging statements | All | ☐ |
| S7-INT-11 | Verify Sidebar collapse/expand works and saves preference in localStorage | Ramsha | ☐ |
| S7-INT-12 | Update Postman collection — every endpoint must have an example request | Ibrahim | ☐ |
| S7-INT-13 | Copy all documents to `docs/` directory in the repo | Ibrahim | ☐ |

---

## Step-by-Step Instructions Per Task

---

### S7-BE-01: Group Report — Manager

```python
# backend/app/blueprints/manager/reports.py
from flask import request
from bson import ObjectId
from flask_jwt_extended import get_jwt

from app.blueprints.manager import manager_reports_bp as bp
from app.extensions import mongo
from app.utils.decorators import role_required
from app.utils.responses import success_response
from app.models.user import Role


@bp.route("/groups", methods=["GET"])
@role_required(Role.MANAGER, Role.HOD, Role.HODIC, Role.DEAN)
def group_report():
    """
    Group performance report.
    Manager sees all groups. HOD/HODIC see dept-scoped groups. Dean sees all.
    """
    claims = get_jwt()
    role   = claims.get("role")
    dept   = claims.get("dept")

    # Scoping based on role
    query = {}
    if role in (Role.HOD, Role.HODIC):
        query["dept"] = dept        # HOD/HODIC scoped to own dept
    # Manager and Dean see all — no dept filter

    groups = list(mongo.db.groups.find(query))

    total_iterations = mongo.db.iterations.count_documents({})

    report = []
    for g in groups:
        gid = g["_id"]

        # Member names
        member_docs = list(mongo.db.users.find(
            {"_id": {"$in": g.get("member_ids", [])}},
            {"name": 1, "roll": 1}
        ))
        members = [{"name": m["name"], "roll": m.get("roll", "")} for m in member_docs]

        # Submissions count
        submission_count = mongo.db.submissions.count_documents({"group_id": gid})

        # Evaluations count and average score
        evaluations  = list(mongo.db.evaluations.find({"group_id": gid}))
        eval_count   = len(evaluations)
        avg_score    = None
        if eval_count > 0:
            scores     = [e.get("total_weighted_score", 0) for e in evaluations]
            avg_score  = round(sum(scores) / len(scores), 2)

        report.append({
            "id":             str(gid),
            "name":           g.get("name", ""),
            "dept":           g.get("dept", ""),
            "section":        g.get("section", ""),
            "status":         g.get("status", ""),
            "member_count":   len(g.get("member_ids", [])),
            "members":        members,
            "submissions":    submission_count,
            "total_iterations": total_iterations,
            "evaluations":    eval_count,
            "avg_score":      avg_score,
        })

    return success_response("Group report.", data={"groups": report, "total": len(report)})
```

---

### S7-BE-02: Iteration Report — Manager

```python
# Continuation of reports.py

@bp.route("/iterations", methods=["GET"])
@role_required(Role.MANAGER, Role.HOD, Role.HODIC, Role.DEAN)
def iteration_report():
    """
    Iteration performance report: per-iteration submission stats and avg scores.
    """
    claims   = get_jwt()
    role     = claims.get("role")
    dept     = claims.get("dept")
    course   = request.args.get("course")

    # Build group filter for scoping
    group_filter = {}
    if role in (Role.HOD, Role.HODIC):
        group_filter["dept"] = dept
    if course:
        group_filter["course"] = course

    # Get all in-scope group IDs
    group_ids = [g["_id"] for g in mongo.db.groups.find(group_filter, {"_id": 1})]

    iterations = list(mongo.db.iterations.find({} if not course else {"course": course}))

    report = []
    for it in iterations:
        iid = it["_id"]

        # Submissions for this iteration from in-scope groups
        submissions = list(mongo.db.submissions.find(
            {"iteration_id": iid, "group_id": {"$in": group_ids}}
        ))
        total_subs  = len(submissions)
        late_subs   = len([s for s in submissions if s.get("is_late", False)])
        on_time     = total_subs - late_subs

        # Evaluations for this iteration
        evaluations = list(mongo.db.evaluations.find(
            {"iteration_id": iid, "group_id": {"$in": group_ids}}
        ))
        eval_count = len(evaluations)
        avg_score  = None
        if eval_count > 0:
            scores = [e.get("total_weighted_score", 0) for e in evaluations]
            avg_score = round(sum(scores) / len(scores), 2)

        report.append({
            "id":          str(iid),
            "title":       it.get("title", ""),
            "course":      it.get("course", ""),
            "deadline":    str(it.get("deadline", "")),
            "submissions": total_subs,
            "on_time":     on_time,
            "late":        late_subs,
            "evaluations": eval_count,
            "avg_score":   avg_score,
        })

    return success_response("Iteration report.", data={"iterations": report})
```

---

### S7-UI-04: Print CSS for PDF Export

```css
/* Add to frontend/src/index.css */

/* PDF Export — hide navigation, buttons, and sidebars when printing */
@media print {
  .no-print,
  .sidebar,
  nav,
  button,
  .action-bar {
    display: none !important;
  }

  body {
    background: white;
    color: black;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 11px;
  }

  th, td {
    border: 1px solid #ccc;
    padding: 6px;
  }

  h1, h2, h3 {
    color: black;
  }

  .page-break {
    page-break-before: always;
  }
}
```

**How to trigger browser print:**
```jsx
// In any report page component — no PDF library needed
<button onClick={() => window.print()} className="no-print" style={{
  background: '#1e3a5f', color: '#fff', border: 'none',
  padding: '9px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
  🖨️ Print / Export PDF
</button>
```

---

### S7-INT-10: Remove All console.log — Quick Check

Run these in your terminals before the sprint ends:

```bash
# Backend — find any print() debugging (should only exist in email_service.py)
grep -rn "print(" backend/app/ --include="*.py" | grep -v "email_service.py"

# Frontend — find any console.log()
grep -rn "console.log" frontend/src/ --include="*.jsx" --include="*.js"
```

Any output from the commands above must be removed before Sprint 7 ends.

---

## Sprint 7 Acceptance Criteria

### Backend Reports
- [ ] `GET /api/manager/reports/groups` returns per-group: members, submission count, evaluation count, avg score
- [ ] `GET /api/manager/reports/iterations` returns per-iteration: submission count, late/on-time split, avg score
- [ ] HOD calling `GET /api/hod/reports/groups` sees only their department's groups
- [ ] Dean calling `GET /api/dean/reports/groups` sees all groups

### Frontend
- [ ] Manager Group Reports page shows a table with all columns
- [ ] Manager Iteration Reports page shows a table with deadline, late count, avg score
- [ ] "Print / Export PDF" button on HOD dashboard opens the browser print dialog
- [ ] Sidebar hides and print-friendly layout is applied in print mode

### Integration
- [ ] Every page in the system loads without a blank screen for the correct role
- [ ] No `console.log` in frontend code
- [ ] No debug `print()` in backend code (except email_service.py mock)
- [ ] All forms show human-readable error messages (not raw JSON error objects)
- [ ] All empty states are shown correctly (no blank white pages)
- [ ] All loading skeletons show while data is fetching

---

## Common Beginner Mistakes to Avoid

| Mistake | How to Avoid |
|---------|-------------|
| Report is slow because no index on `group_id` | MongoDB index on `evaluations.group_id` and `submissions.group_id` — set in Sprint 0 seed |
| HOD can pass `?course=X` to see other dept courses | Iteration report scoping: use `group_filter["dept"] = dept` for HOD — course is secondary |
| `window.print()` includes the sidebar | Add `className="no-print"` to Sidebar and all action buttons in the layout |
| Report shows `null` avg_score as "null" string | Always show `avg_score ?? '—'` in the table cell |
| Missing Sprint 7 routes in AppRouter | Every new page needs a `<Route>` with the correct `allowedRoles` in `AppRouter.jsx` |

---

*End of Sprint 7 Document*
*Next: Sprint 8 — Security Hardening and Testing*
