# Sprint 5 — HOD and Dean Dashboards
## PBL Management System · Beaconhouse National University
**Sprint Goal:** HOD and HOD I&C have a read-only department-scoped dashboard showing group summaries and evaluation progress. The Dean has a university-wide read-only dashboard showing all departments. All data scoping is enforced server-side.
**FRs Covered:** FR-11.1, FR-11.2, FR-11.3, FR-11.4, FR-12.1, FR-12.2, FR-12.3
**Dependency:** Sprint 2 fully complete (groups data); Sprint 4 complete (evaluation data for charts).
**Owners:** Ibrahim (all HOD + Dean backend), Sara (HOD + Dean frontend pages), Ramsha (shared chart components), Ismail (server-side dept scoping verification)

---

> [!IMPORTANT]
> Department scoping is a security requirement, not just a display filter. The HOD's department code comes from their JWT `dept` claim — never from a query parameter or request body. A HOD must not be able to see another department's data by manipulating the URL. Ismail must audit every HOD endpoint before the sprint ends.

---

## Why Sprint 5 Exists

Institutional oversight is a core governance requirement at BNU. HODs and the Dean need real-time visibility without being able to modify anything. Giving them read-only access in this sprint:
- Enables supervisory review before the final semester evaluation
- Allows the Dean to identify departments with many ungrouped students and intervene
- Enables HODs to verify all groups are approved and evaluated before submission

---

## Sprint 5 Tasks by Team Member

### Ibrahim (Backend) — HOD and Dean API

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S5-BE-01 | Implement `GET /api/hod/dashboard` (dept from JWT only, never from params) | `backend/app/blueprints/hod/routes.py` | ☐ |
| S5-BE-02 | Implement `GET /api/hod/groups` (dept-scoped, filterable by status + section) | `backend/app/blueprints/hod/routes.py` | ☐ |
| S5-BE-03 | Implement `GET /api/hod/reports/groups` (dept-scoped group report) | `backend/app/blueprints/hod/routes.py` | ☐ |
| S5-BE-04 | Implement `GET /api/hod/reports/iterations` (dept-scoped iteration report) | `backend/app/blueprints/hod/routes.py` | ☐ |
| S5-BE-05 | Implement `GET /api/dean/dashboard` (all depts breakdown) | `backend/app/blueprints/dean/routes.py` | ☐ |
| S5-BE-06 | Implement `GET /api/dean/students-without-group` (filterable by dept) | `backend/app/blueprints/dean/routes.py` | ☐ |
| S5-BE-07 | Implement `GET /api/dean/groups` (university-wide, filterable by dept) | `backend/app/blueprints/dean/routes.py` | ☐ |
| S5-BE-08 | Implement `GET /api/dean/reports/groups` | `backend/app/blueprints/dean/routes.py` | ☐ |
| S5-BE-09 | Implement `GET /api/dean/reports/iterations` | `backend/app/blueprints/dean/routes.py` | ☐ |
| S5-BE-10 | Write `tests/test_dept_scoping.py` (HOD cannot see other dept data) | `backend/tests/test_dept_scoping.py` | ☐ |
| S5-BE-11 | Add all Sprint 5 routes to Postman collection | `backend/postman/PBL-System.postman_collection.json` | ☐ |

---

### Sara (Frontend Pages) — HOD and Dean Pages

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S5-UI-01 | Create `HodDashboard.jsx` (stat cards + groups-by-status bar chart) | `frontend/src/pages/hod/HodDashboard.jsx` | ☐ |
| S5-UI-02 | Create `HodGroupsPage.jsx` (read-only filterable group table) | `frontend/src/pages/hod/HodGroupsPage.jsx` | ☐ |
| S5-UI-03 | Create `HodReportsPage.jsx` (group + iteration report tables, print/export) | `frontend/src/pages/hod/HodReportsPage.jsx` | ☐ |
| S5-UI-04 | Create `DeanDashboard.jsx` (by-department breakdown table + university totals) | `frontend/src/pages/dean/DeanDashboard.jsx` | ☐ |
| S5-UI-05 | Create `DeanStudentsWithoutGroupPage.jsx` (filterable list by dept) | `frontend/src/pages/dean/DeanStudentsWithoutGroupPage.jsx` | ☐ |
| S5-UI-06 | Create `DeanGroupsPage.jsx` (university-wide group table filtered by dept) | `frontend/src/pages/dean/DeanGroupsPage.jsx` | ☐ |
| S5-UI-07 | Add Sprint 5 HOD and Dean routes to `AppRouter.jsx` | `frontend/src/routes/AppRouter.jsx` | ☐ |

---

### Ramsha (Frontend Lead) — Chart Components

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S5-FE-01 | Install `recharts`: `npm install recharts` | `frontend/package.json` | ☐ |
| S5-FE-02 | Create `GroupStatusBarChart.jsx` (stacked bar: pending vs approved per section) | `frontend/src/components/charts/GroupStatusBarChart.jsx` | ☐ |
| S5-FE-03 | Create `DeptBreakdownTable.jsx` (university-wide dept comparison table) | `frontend/src/components/charts/DeptBreakdownTable.jsx` | ☐ |

---

### Ismail — Security Audit

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S5-SEC-01 | Manually test: log in as HOD → try URL `/api/hod/groups?dept=CS` when HOD's dept is `SE` → verify response still shows only `SE` data | Manual test | ☐ |
| S5-SEC-02 | Manually test: log in as Dean → try URL `/api/hod/dashboard` → verify 403 (wrong role) | Manual test | ☐ |
| S5-SEC-03 | Verify dean can access `/api/dean/*` but not `/api/hod/*` | Manual test | ☐ |

---

## Step-by-Step Instructions Per Task

---

### S5-BE-01 and S5-BE-02: HOD Dashboard — Server-Side Dept Scoping

```python
# backend/app/blueprints/hod/routes.py
from flask import request
from bson import ObjectId
from flask_jwt_extended import get_jwt

from app.blueprints.hod import hod_bp as bp
from app.extensions import mongo
from app.utils.decorators import role_required
from app.utils.responses import success_response, error_response
from app.models.user import Role


@bp.route("/dashboard", methods=["GET"])
@role_required(Role.HOD, Role.HODIC)
def hod_dashboard():
    # SECURITY: dept ALWAYS comes from JWT claims — never from request params
    claims = get_jwt()
    dept   = claims.get("dept")

    if not dept:
        return error_response(
            "Your account does not have a department assigned. Contact the Manager.", 400)

    # NOTE: We intentionally ignore any ?dept= query param the user might pass
    # This is the server-side enforcement of dept scoping

    total_groups    = mongo.db.groups.count_documents({"dept": dept})
    approved_groups = mongo.db.groups.count_documents({"dept": dept, "status": "approved"})
    pending_groups  = mongo.db.groups.count_documents({"dept": dept, "status": "pending"})
    total_students  = mongo.db.users.count_documents({"role": Role.STUDENT, "dept": dept, "deleted": False})

    # Students in this dept who are not in any group
    students_in_groups    = list(mongo.db.groups.distinct("member_ids", {"dept": dept}))
    students_without_group = mongo.db.users.count_documents({
        "role":    Role.STUDENT,
        "dept":    dept,
        "deleted": False,
        "_id":     {"$nin": students_in_groups}
    })

    # Groups by status breakdown (for chart)
    groups_by_status = {
        "pending":  pending_groups,
        "approved": approved_groups,
    }

    return success_response("HOD dashboard data.", data={
        "dept":                   dept,
        "total_groups":           total_groups,
        "approved_groups":        approved_groups,
        "pending_groups":         pending_groups,
        "total_students":         total_students,
        "students_without_group": students_without_group,
        "groups_by_status":       groups_by_status,
    })


@bp.route("/groups", methods=["GET"])
@role_required(Role.HOD, Role.HODIC)
def hod_groups():
    """
    Returns groups for the HOD's department only.
    Optional filters from query params: status, section, search
    dept is ALWAYS from JWT — never from query param.
    """
    claims  = get_jwt()
    dept    = claims.get("dept")
    status  = request.args.get("status")
    section = request.args.get("section")
    search  = request.args.get("search", "").strip()
    page    = max(1, int(request.args.get("page", 1)))
    limit   = min(100, int(request.args.get("limit", 20)))

    query = {"dept": dept}  # Always scoped to HOD's dept
    if status:
        query["status"] = status
    if section:
        query["section"] = section.upper()
    if search:
        import re
        query["name"] = re.compile(search, re.IGNORECASE)

    total = mongo.db.groups.count_documents(query)
    groups = list(mongo.db.groups.find(query).skip((page - 1) * limit).limit(limit))

    # Enrich with member count
    for g in groups:
        g["id"]           = str(g.pop("_id"))
        g["leader_id"]    = str(g.get("leader_id", ""))
        g["member_count"] = len(g.get("member_ids", []))
        g["member_ids"]   = [str(m) for m in g.get("member_ids", [])]

    return success_response("Groups retrieved.", data={
        "dept": dept, "items": groups,
        "total": total, "page": page, "limit": limit
    })
```

---

### S5-BE-05: Dean Dashboard — All Departments

```python
# backend/app/blueprints/dean/routes.py
from flask_jwt_extended import get_jwt

from app.blueprints.dean import dean_bp as bp
from app.extensions import mongo
from app.utils.decorators import role_required
from app.utils.responses import success_response
from app.models.user import Role


@dean_bp.route("/dashboard", methods=["GET"])
@role_required(Role.DEAN)
def dean_dashboard():
    """University-wide breakdown — no dept filter applied."""
    # Get all department codes from the departments collection
    departments = list(mongo.db.departments.find({"deleted": False}, {"code": 1, "name": 1}))

    by_department = []
    uni_total_students          = 0
    uni_total_groups            = 0
    uni_students_without_group  = 0

    for dept_doc in departments:
        code = dept_doc["code"]
        name = dept_doc.get("name", code)

        total_groups    = mongo.db.groups.count_documents({"dept": code})
        approved_groups = mongo.db.groups.count_documents({"dept": code, "status": "approved"})
        total_students  = mongo.db.users.count_documents({
            "role": Role.STUDENT, "dept": code, "deleted": False})
        students_in_dept_groups = list(
            mongo.db.groups.distinct("member_ids", {"dept": code}))
        without_group = mongo.db.users.count_documents({
            "role": Role.STUDENT, "dept": code, "deleted": False,
            "_id": {"$nin": students_in_dept_groups}
        })

        by_department.append({
            "dept":                   code,
            "dept_name":              name,
            "total_groups":           total_groups,
            "approved_groups":        approved_groups,
            "total_students":         total_students,
            "students_without_group": without_group,
        })

        uni_total_students         += total_students
        uni_total_groups           += total_groups
        uni_students_without_group += without_group

    return success_response("Dean dashboard data.", data={
        "by_department":  by_department,
        "university_totals": {
            "total_students":         uni_total_students,
            "total_groups":           uni_total_groups,
            "students_without_group": uni_students_without_group,
        }
    })
```

---

### S5-FE-02: GroupStatusBarChart.jsx (using Recharts)

```jsx
// frontend/src/components/charts/GroupStatusBarChart.jsx
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

/**
 * Props:
 *   data: [{ name: "Section A", pending: 3, approved: 12 }, ...]
 */
export default function GroupStatusBarChart({ data }) {
  if (!data || data.length === 0) {
    return <div style={{ color: '#9ca3af', textAlign: 'center', padding: '30px 0', fontSize: '13px' }}>
      No group data available.
    </div>;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
        <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '6px' }} />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Bar dataKey="pending"  name="Pending"  fill="#f59e0b" radius={[3,3,0,0]} />
        <Bar dataKey="approved" name="Approved" fill="#22c55e" radius={[3,3,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

---

### S5-UI-04: DeanDashboard.jsx

```jsx
// frontend/src/pages/dean/DeanDashboard.jsx
import useApi from '../../hooks/useApi';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';

export default function DeanDashboard() {
  const { data, loading } = useApi('/dean/dashboard');

  if (loading) return <LoadingSkeleton rows={6} />;
  if (!data) return null;

  const { by_department, university_totals } = data;

  return (
    <div>
      <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1e3a5f', marginBottom: '20px' }}>
        University Overview
      </h1>

      {/* University Totals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Total Students', value: university_totals.total_students, color: '#2563eb' },
          { label: 'Total Groups',   value: university_totals.total_groups,   color: '#16a34a' },
          { label: 'Without Group',  value: university_totals.students_without_group, color: '#dc2626' },
        ].map(card => (
          <div key={card.label} style={{ background: '#fff', border: '1px solid #e5e7eb',
            borderRadius: '8px', padding: '18px', borderTop: `3px solid ${card.color}` }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Department Breakdown Table */}
      <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
        Department Breakdown
      </h2>
      <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '8px',
        border: '1px solid #e5e7eb' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {['Department','Total Students','Total Groups','Approved','Without Group'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left',
                  fontWeight: 600, color: '#374151' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {by_department.map((d, i) => (
              <tr key={d.dept} style={{ borderBottom: '1px solid #f3f4f6',
                background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                  {d.dept_name} <span style={{ color: '#6b7280', fontWeight: 400 }}>({d.dept})</span>
                </td>
                <td style={{ padding: '10px 14px' }}>{d.total_students}</td>
                <td style={{ padding: '10px 14px' }}>{d.total_groups}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>{d.approved_groups}</span>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {d.students_without_group > 0
                    ? <span style={{ color: '#dc2626', fontWeight: 600 }}>{d.students_without_group}</span>
                    : <span style={{ color: '#6b7280' }}>0</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## Sprint 5 Test Cases

```python
# backend/tests/test_dept_scoping.py
"""
These tests verify that HOD data scoping is server-side enforced.
A HOD of dept 'SE' must NEVER see data from dept 'CS'.
"""

def test_hod_dashboard_shows_only_own_dept(client, hod_se_token, cs_group, se_group):
    """HOD of SE sees SE groups only, not CS groups."""
    resp = client.get("/api/hod/dashboard",
        headers={"Authorization": f"Bearer {hod_se_token}"})
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert data["dept"] == "SE"
    # SE has 1 group (se_group); CS has 1 group (cs_group)
    assert data["total_groups"] == 1   # Only the SE group

def test_hod_groups_ignores_dept_query_param(client, hod_se_token, cs_group):
    """HOD of SE passing ?dept=CS in query must still get SE data only."""
    resp = client.get("/api/hod/groups?dept=CS",
        headers={"Authorization": f"Bearer {hod_se_token}"})
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert data["dept"] == "SE"
    # CS group must not appear
    group_depts = [g["dept"] for g in data["items"]]
    assert "CS" not in group_depts

def test_dean_can_see_all_depts(client, dean_token, se_group, cs_group):
    """Dean sees groups from all departments."""
    resp = client.get("/api/dean/dashboard",
        headers={"Authorization": f"Bearer {dean_token}"})
    assert resp.status_code == 200
    dept_codes = [d["dept"] for d in resp.get_json()["data"]["by_department"]]
    assert "SE" in dept_codes
    assert "CS" in dept_codes

def test_hod_cannot_access_dean_endpoint(client, hod_se_token):
    resp = client.get("/api/dean/dashboard",
        headers={"Authorization": f"Bearer {hod_se_token}"})
    assert resp.status_code == 403

def test_dean_cannot_access_manager_endpoint(client, dean_token):
    resp = client.get("/api/manager/students",
        headers={"Authorization": f"Bearer {dean_token}"})
    assert resp.status_code == 403
```

---

## Sprint 5 Acceptance Criteria

### Backend
- [ ] `GET /api/hod/dashboard` always returns data for the HOD's own `dept` claim — even if `?dept=OTHER` is passed in the URL
- [ ] HOD calling any endpoint cannot see data from another department
- [ ] Dean can see all departments in `/api/dean/dashboard`
- [ ] Dean cannot access `/api/hod/*` (403)
- [ ] HOD cannot access `/api/dean/*` (403)
- [ ] `GET /api/dean/students-without-group` works with optional `?dept=SE` filter
- [ ] All dept-scoping tests pass: `pytest tests/test_dept_scoping.py -v`

### Frontend
- [ ] HOD dashboard shows real stat cards with correct department data
- [ ] HOD dashboard shows a bar chart of groups by status
- [ ] HOD Groups page is read-only — no edit, approve, or delete buttons
- [ ] Dean dashboard shows university totals and per-department breakdown table
- [ ] Students without group page is filterable by department
- [ ] PDF export: clicking "Print / Export PDF" opens browser print dialog scoped to visible content

---

## Common Beginner Mistakes to Avoid

| Mistake | How to Avoid |
|---------|-------------|
| Reading `dept` from `request.args` instead of JWT claims | `claims = get_jwt(); dept = claims.get("dept")` — never `request.args.get("dept")` |
| Forgetting `@role_required(Role.HOD, Role.HODIC)` on all HOD routes | Both roles use the same endpoints — pass both to `role_required` |
| HOD I&C not seeing the same dashboard as HOD | Make sure `hodic` is included in every `@role_required` for HOD routes |
| Dean sees null for depts with no groups | Always return all departments — use 0 counts, not missing keys |
| Recharts not rendering — blank chart | Wrap in `<ResponsiveContainer>` — without it, recharts renders with 0 height |
| Chart shows stale data after navigation | Use `useApi` hook which re-fetches on mount; navigate away and back |
| `students_in_groups` returning empty — scoping breaks | `distinct("member_ids")` returns ObjectIds; `$nin` comparison works with ObjectId list |

---

*End of Sprint 5 Document*
*Next: Sprint 6 — Surveys and Full Announcements*
