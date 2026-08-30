# Sprint 2 — Group Formation and Evaluator Assignment
## PBL Management System · Beaconhouse National University
**Sprint Goal:** Students can create groups, browse other groups, send join requests, and leaders can accept or reject them. The Manager can view all groups, approve them, and assign evaluators.
**FRs Covered:** FR-3.1, FR-3.2, FR-3.3, FR-3.4, FR-3.5, FR-3.6, FR-3.7, FR-3.8, FR-3.9, FR-3.10
**Dependency:** Sprint 1 fully complete — students, departments, and courses exist in the database; evaluators (teachers) exist.
**Owners:** Ismail (all group + assignment backend), Ramsha (student group pages), Sara (student dashboard + join request UI), Ibrahim (group_service + tests)

---

> [!IMPORTANT]
> Sprint 2 contains the most complex business logic in the entire system — the one-student-one-group constraint and the optimistic locking race condition guard. Read the implementation notes in full before writing any code.

---

## Why Sprint 2 Exists

Groups are the central entity of the entire system. Every feature in Sprints 3–7 depends on groups existing:
- Iterations (Sprint 3) → must know which groups are in which course
- Evaluations (Sprint 4) → evaluators must be assigned to groups
- HOD Dashboard (Sprint 5) → reads group data per department
- Surveys (Sprint 6) → scoped to a course that contains groups

**Without Sprint 2 complete:**
- Students have no way to form teams
- No groups to approve → Sprint 3 and 4 cannot be tested
- No assignments → evaluators are useless

---

## Sprint 2 Tasks by Team Member

### Ismail (Backend Lead) — Group and Assignment APIs

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S2-BE-01 | Implement `POST /api/student/groups` (create + 1-student-1-group check) | `backend/app/blueprints/student/groups.py` | ☐ |
| S2-BE-02 | Implement `GET /api/student/groups` (browse same course+section) | `backend/app/blueprints/student/groups.py` | ☐ |
| S2-BE-03 | Implement `GET /api/student/groups/my` | `backend/app/blueprints/student/groups.py` | ☐ |
| S2-BE-04 | Implement `POST /api/student/groups/<id>/join-request` | `backend/app/blueprints/student/groups.py` | ☐ |
| S2-BE-05 | Implement `DELETE /api/student/groups/<id>/join-request` (cancel) | `backend/app/blueprints/student/groups.py` | ☐ |
| S2-BE-06 | Implement `GET /api/student/groups/my/join-requests` (leader view) | `backend/app/blueprints/student/join_requests.py` | ☐ |
| S2-BE-07 | Implement `PATCH .../join-requests/<id>/accept` with optimistic locking | `backend/app/blueprints/student/join_requests.py` | ☐ |
| S2-BE-08 | Implement `PATCH .../join-requests/<id>/reject` | `backend/app/blueprints/student/join_requests.py` | ☐ |
| S2-BE-09 | Implement `DELETE /api/student/groups/my/leave` with leadership transfer | `backend/app/blueprints/student/groups.py` | ☐ |
| S2-BE-10 | Implement `GET /api/manager/groups` (filtered by status, dept, section, course) | `backend/app/blueprints/manager/groups.py` | ☐ |
| S2-BE-11 | Implement `PATCH /api/manager/groups/<id>/approve` | `backend/app/blueprints/manager/groups.py` | ☐ |
| S2-BE-12 | Implement `DELETE /api/manager/groups/<id>` (hard delete) | `backend/app/blueprints/manager/groups.py` | ☐ |
| S2-BE-13 | Implement `POST /api/manager/assignments` (assign evaluator to groups) | `backend/app/blueprints/manager/assignments.py` | ☐ |
| S2-BE-14 | Implement `GET /api/manager/assignments` | `backend/app/blueprints/manager/assignments.py` | ☐ |
| S2-BE-15 | Implement `DELETE /api/manager/assignments/<id>` | `backend/app/blueprints/manager/assignments.py` | ☐ |
| S2-BE-16 | Implement `GET /api/student/dashboard` | `backend/app/blueprints/student/dashboard.py` | ☐ |
| S2-BE-17 | Extract group business logic to `group_service.py` | `backend/app/services/group_service.py` | ☐ |
| S2-BE-18 | Add all Sprint 2 routes to Postman collection | `backend/postman/PBL-System.postman_collection.json` | ☐ |

---

### Ramsha (Frontend Lead) — Student Group Pages

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S2-FE-01 | Create `BrowseGroupsPage.jsx` (table of groups in same course+section) | `frontend/src/pages/student/groups/BrowseGroupsPage.jsx` | ☐ |
| S2-FE-02 | Create `CreateGroupModal.jsx` | `frontend/src/pages/student/groups/CreateGroupModal.jsx` | ☐ |
| S2-FE-03 | Create `MyGroupPage.jsx` (members list + leader badge + actions) | `frontend/src/pages/student/groups/MyGroupPage.jsx` | ☐ |
| S2-FE-04 | Create `ManagerGroupsPage.jsx` (all groups table with approve + delete + assign) | `frontend/src/pages/manager/groups/ManagerGroupsPage.jsx` | ☐ |
| S2-FE-05 | Create `GroupDetailModal.jsx` (members + evaluator assignment dropdown) | `frontend/src/pages/manager/groups/GroupDetailModal.jsx` | ☐ |
| S2-FE-06 | Add Sprint 2 routes to `AppRouter.jsx` | `frontend/src/routes/AppRouter.jsx` | ☐ |

---

### Sara (Frontend Pages) — Student Dashboard and Join Request UI

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S2-UI-01 | Create `StudentDashboard.jsx` (group status card + pending iterations + pending surveys) | `frontend/src/pages/student/StudentDashboard.jsx` | ☐ |
| S2-UI-02 | Create `JoinRequestsInbox.jsx` (leader's pending requests with accept/reject buttons) | `frontend/src/pages/student/groups/JoinRequestsInbox.jsx` | ☐ |
| S2-UI-03 | Add "Send Join Request" button + cancel to `BrowseGroupsPage.jsx` | `frontend/src/pages/student/groups/BrowseGroupsPage.jsx` | ☐ |
| S2-UI-04 | Add "Leave Group" button with confirm dialog to `MyGroupPage.jsx` | `frontend/src/pages/student/groups/MyGroupPage.jsx` | ☐ |

---

### Ibrahim (Backend + Testing) — Group Service and Tests

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S2-QA-01 | Create `group_service.py` with all group logic | `backend/app/services/group_service.py` | ☐ |
| S2-QA-02 | Write `tests/test_groups.py` (creation, join, accept, race condition, leave, approve) | `backend/tests/test_groups.py` | ☐ |
| S2-QA-03 | Write `tests/test_assignments.py` | `backend/tests/test_assignments.py` | ☐ |
| S2-QA-04 | Verify CI passes | `.github/workflows/ci.yml` | ☐ |

---

## Step-by-Step Instructions Per Task

---

### S2-BE-01: Create Group (with One-Student-One-Group Check)

```python
# backend/app/blueprints/student/groups.py (excerpt)
from flask import request
from bson import ObjectId
from datetime import datetime, timezone
from flask_jwt_extended import get_jwt_identity, get_jwt

from app.blueprints.student import student_groups_bp as bp
from app.extensions import mongo
from app.utils.decorators import role_required
from app.utils.responses import success_response, error_response
from app.utils.audit import log_audit
from app.services.group_service import student_already_in_group
from app.models.user import Role
from app.models.group import Status as GS, Field as GF


@bp.route("/", methods=["POST"])
@role_required(Role.STUDENT)
def create_group():
    claims     = get_jwt()
    student_id = get_jwt_identity()
    course     = claims.get("course")
    section    = claims.get("section")
    dept       = claims.get("dept")

    if not course or not section:
        return error_response("Your account is missing course or section. Contact the Manager.", 400)

    if student_already_in_group(mongo.db, student_id, course):
        return error_response("You are already a member of a group in this course.", 409)

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return error_response("Group name is required.", 400)

    doc = {
        GF.NAME:       name,
        GF.COURSE:     course,
        GF.SECTION:    section,
        GF.DEPT:       dept,
        GF.LEADER_ID:  ObjectId(student_id),
        GF.MEMBER_IDS: [ObjectId(student_id)],
        GF.STATUS:     GS.PENDING,
        GF.EVALUATED:  False,
        GF.VERSION:    1,
        GF.CREATED_AT: datetime.now(timezone.utc),
        GF.UPDATED_AT: datetime.now(timezone.utc),
    }
    result = mongo.db.groups.insert_one(doc)
    log_audit(mongo.db, student_id, Role.STUDENT, "groups", "create", result.inserted_id,
              new_value={"name": name, "course": course, "section": section})

    return success_response("Group created.", data={"id": str(result.inserted_id), "name": name}), 201
```

---

### S2-BE-07: Accept Join Request — Optimistic Locking

This is the most important piece of code in Sprint 2. Read every comment carefully.

```python
# backend/app/blueprints/student/join_requests.py (excerpt)

@join_requests_bp.route("/<request_id>/accept", methods=["PATCH"])
@role_required(Role.STUDENT)
def accept_join_request(request_id):
    leader_id = get_jwt_identity()
    claims    = get_jwt()
    course    = claims.get("course")

    # Fetch the join request
    jr = mongo.db.join_requests.find_one({"_id": ObjectId(request_id), "status": "pending"})
    if not jr:
        return error_response("Join request not found or already processed.", 404)

    # Verify the caller is the leader of the group
    group = mongo.db.groups.find_one({"_id": jr["group_id"]})
    if not group:
        return error_response("Group not found.", 404)
    if str(group[GF.LEADER_ID]) != leader_id:
        return error_response("Only the group leader can accept join requests.", 403)

    # Read the max_group from the course
    course_doc = mongo.db.courses.find_one({"name": group[GF.COURSE]})
    max_group  = course_doc["max_group"] if course_doc else 5

    # OPTIMISTIC LOCKING: Read current version
    current_version = group[GF.VERSION]

    # Check capacity BEFORE attempting the update
    if len(group[GF.MEMBER_IDS]) >= max_group:
        return error_response(f"Group is full (max {max_group} members). Cannot accept.", 400)

    student_id = jr["studentId"]

    # ATOMIC UPDATE: Only succeed if version hasn't changed since we read it
    # This prevents two simultaneous accepts from adding the same student twice
    result = mongo.db.groups.update_one(
        {
            "_id": jr["group_id"],
            GF.VERSION: current_version,                          # ← key: version must still match
            "$expr": {"$lt": [{"$size": f"${GF.MEMBER_IDS}"}, max_group]}  # still has space
        },
        {
            "$push": {GF.MEMBER_IDS: student_id},
            "$inc":  {GF.VERSION: 1},                            # increment version so next attempt fails
            "$set":  {GF.UPDATED_AT: datetime.now(timezone.utc)}
        }
    )

    if result.matched_count == 0:
        # Version changed → another accept happened simultaneously → retry
        return error_response(
            "The group was updated by another action simultaneously. "
            "Please refresh and try again.", 409
        )

    # Accept this request
    mongo.db.join_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": "accepted", "updatedAt": datetime.now(timezone.utc)}}
    )

    # Cancel ALL other pending requests from this student in this course
    # (student can only be in one group per course)
    all_group_ids_in_course = [g["_id"] for g in mongo.db.groups.find({"course": course})]
    mongo.db.join_requests.update_many(
        {
            "studentId": student_id,
            "status":    "pending",
            "groupId":   {"$in": all_group_ids_in_course},
            "_id":       {"$ne": ObjectId(request_id)}           # don't touch the one we just accepted
        },
        {"$set": {"status": "cancelled", "updatedAt": datetime.now(timezone.utc)}}
    )

    log_audit(mongo.db, leader_id, Role.STUDENT, "join_requests", "accept", ObjectId(request_id))
    return success_response("Join request accepted. Student has been added to your group.")
```

---

### S2-BE-09: Leave Group (Leadership Transfer)

```python
# backend/app/services/group_service.py
from bson import ObjectId
from datetime import datetime, timezone


def student_already_in_group(db, student_id: str, course: str) -> bool:
    """Returns True if student is already a member of any group in this course."""
    return db.groups.find_one({
        "member_ids": ObjectId(student_id),
        "course": course,
    }) is not None


def handle_member_leave(db, group: dict, leaving_student_id: str) -> str:
    """
    Removes the student from the group. Handles:
    - Leadership transfer if leader leaves (next member becomes leader)
    - Group deletion if last member leaves

    Returns: "left" | "group_deleted"
    """
    sid         = ObjectId(leaving_student_id)
    new_members = [m for m in group["member_ids"] if m != sid]

    if len(new_members) == 0:
        # Last member — delete the group and all associated join requests
        db.groups.delete_one({"_id": group["_id"]})
        db.join_requests.delete_many({"groupId": group["_id"]})
        return "group_deleted"

    new_leader = group["leader_id"]
    if group["leader_id"] == sid:
        # Transfer leadership to the first remaining member
        new_leader = new_members[0]

    db.groups.update_one(
        {"_id": group["_id"]},
        {"$set": {
            "leader_id":  new_leader,
            "member_ids": new_members,
            "updatedAt":  datetime.now(timezone.utc)
        },
         "$inc": {"version": 1}}
    )
    return "left"
```

---

### S2-FE-03: MyGroupPage.jsx

```jsx
// frontend/src/pages/student/groups/MyGroupPage.jsx
import { useState } from 'react';
import useApi from '../../../hooks/useApi';
import api from '../../../services/api';
import Badge from '../../../components/common/Badge';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import LoadingSkeleton from '../../../components/common/LoadingSkeleton';
import EmptyState from '../../../components/common/EmptyState';
import JoinRequestsInbox from './JoinRequestsInbox';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function MyGroupPage() {
  const { user }                         = useAuth();
  const navigate                         = useNavigate();
  const { data, loading, refetch }       = useApi('/student/groups/my');
  const [showLeave, setShowLeave]        = useState(false);
  const [leaveLoading, setLeaveLoading]  = useState(false);
  const [error, setError]                = useState('');

  async function handleLeave() {
    setLeaveLoading(true);
    try {
      await api.delete('/student/groups/my/leave');
      navigate('/student/groups');
    } catch (err) {
      setError(err.message || 'Failed to leave group.');
    } finally {
      setLeaveLoading(false);
      setShowLeave(false);
    }
  }

  if (loading) return <LoadingSkeleton rows={4} />;
  if (!data) return (
    <EmptyState message="You are not in any group yet.">
      <a href="/student/groups" style={{ color: '#2563eb', textDecoration: 'underline' }}>
        Browse and join a group
      </a>
    </EmptyState>
  );

  const group   = data;
  const isLeader = user?.id === group.leader_id;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#1e3a5f' }}>
          {group.name}
        </h1>
        <Badge status={group.status} />
      </div>

      {error && (
        <div style={{ color: '#dc2626', background: '#fef2f2', padding: '8px 12px',
          borderRadius: '4px', marginBottom: '12px', fontSize: '13px' }}>{error}</div>
      )}

      <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', margin: '0 0 10px' }}>
        Members ({group.members?.length})
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
        {group.members?.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px',
            background: '#f9fafb', padding: '10px 14px', borderRadius: '6px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%',
              background: '#dbeafe', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: 700, color: '#2563eb', fontSize: '13px' }}>
              {m.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: m.id === group.leader_id ? 600 : 400, fontSize: '13.5px' }}>
                {m.name} {m.id === group.leader_id && '👑'}
              </div>
              <div style={{ color: '#6b7280', fontSize: '12px' }}>{m.roll}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Join requests inbox — only for leader */}
      {isLeader && <JoinRequestsInbox groupId={group.id} onUpdate={refetch} />}

      {/* Leave group */}
      <button onClick={() => setShowLeave(true)} style={{
        marginTop: '20px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
        padding: '9px 16px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}>
        Leave Group
      </button>

      {showLeave && (
        <ConfirmDialog
          title="Leave Group"
          message={isLeader && group.members?.length > 1
            ? "You are the leader. Leaving will transfer leadership to the next member. Are you sure?"
            : "Are you sure you want to leave this group?"}
          onConfirm={handleLeave}
          onCancel={() => setShowLeave(false)}
          loading={leaveLoading}
          confirmLabel="Yes, Leave Group"
          confirmColor="#dc2626"
        />
      )}
    </div>
  );
}
```

---

## Sprint 2 Test Cases

```python
# backend/tests/test_groups.py

def test_create_group_success(client, student_token, student_user):
    resp = client.post("/api/student/groups",
        json={"name": "AI Chatbot Team"},
        headers={"Authorization": f"Bearer {student_token}"})
    assert resp.status_code == 201
    assert resp.get_json()["data"]["name"] == "AI Chatbot Team"

def test_create_group_duplicate_membership(client, student_token, existing_group):
    """Student who is already in a group cannot create another."""
    resp = client.post("/api/student/groups",
        json={"name": "Another Group"},
        headers={"Authorization": f"Bearer {student_token}"})
    assert resp.status_code == 409

def test_join_request_sent_successfully(client, other_student_token, existing_group):
    resp = client.post(f"/api/student/groups/{existing_group['id']}/join-request",
        json={"message": "I want to join"},
        headers={"Authorization": f"Bearer {other_student_token}"})
    assert resp.status_code == 201

def test_accept_join_request_adds_member(client, leader_token, pending_join_request, group_id):
    resp = client.patch(
        f"/api/student/groups/my/join-requests/{pending_join_request['id']}/accept",
        headers={"Authorization": f"Bearer {leader_token}"})
    assert resp.status_code == 200
    # Verify member was added
    group_resp = client.get("/api/student/groups/my",
        headers={"Authorization": f"Bearer {leader_token}"})
    member_ids = [m["id"] for m in group_resp.get_json()["data"]["members"]]
    assert pending_join_request["student_id"] in member_ids

def test_non_leader_cannot_accept(client, non_leader_student_token, pending_join_request):
    resp = client.patch(
        f"/api/student/groups/my/join-requests/{pending_join_request['id']}/accept",
        headers={"Authorization": f"Bearer {non_leader_student_token}"})
    assert resp.status_code == 403

def test_manager_can_approve_group(client, manager_token, pending_group_id):
    resp = client.patch(f"/api/manager/groups/{pending_group_id}/approve",
        headers={"Authorization": f"Bearer {manager_token}"})
    assert resp.status_code == 200

def test_manager_approve_underfull_group_fails(client, manager_token, underfull_group_id):
    """Group with fewer members than min_group cannot be approved."""
    resp = client.patch(f"/api/manager/groups/{underfull_group_id}/approve",
        headers={"Authorization": f"Bearer {manager_token}"})
    assert resp.status_code == 400
```

---

## Sprint 2 Acceptance Criteria

### Backend
- [ ] `POST /api/student/groups` creates group with leader as first member, status = pending
- [ ] Creating a group when already in one returns `409 Conflict`
- [ ] `GET /api/student/groups` returns only groups in the same course and section as the student (scoped from JWT)
- [ ] `GET /api/student/groups/my` returns `null` if not in a group
- [ ] `POST /api/student/groups/<id>/join-request` creates a pending request
- [ ] Sending a duplicate pending join request to the same group returns `409`
- [ ] `PATCH accept` adds student to group, increments version, cancels other pending requests
- [ ] Concurrent accept (version mismatch) returns `409` and no double-add occurs
- [ ] `DELETE /api/student/groups/my/leave` with leader → transfers leadership and removes leader
- [ ] Last member leaving → group is deleted
- [ ] `PATCH /api/manager/groups/<id>/approve` only works if `member_count >= course.min_group`
- [ ] `DELETE /api/manager/groups/<id>` deletes group and its join requests
- [ ] `POST /api/manager/assignments` assigns evaluator to a group
- [ ] Duplicate assignment returns `409`

### Frontend
- [ ] Student sees Browse Groups page filtered to their course and section
- [ ] Student can create a group from Browse Groups page
- [ ] Student can send a join request and sees "Request Sent" state
- [ ] Leader sees pending requests in My Group page
- [ ] Leader can accept/reject requests with confirm dialogs
- [ ] Accepting a request shows the new member immediately (refetch)
- [ ] Manager Groups page shows all groups with status badges and filter controls
- [ ] Manager can approve a group (button only enabled if group has enough members)
- [ ] Manager can open a group and assign an evaluator from a dropdown

---

## Common Beginner Mistakes to Avoid

| Mistake | How to Avoid |
|---------|-------------|
| Not using optimistic locking for join request accept | Always include `GF.VERSION: current_version` in the `update_one` filter |
| `member_ids` stored as strings instead of ObjectId | Use `ObjectId(student_id)` when pushing to `member_ids` |
| Group browsing shows groups from other sections | Always filter by both `course` AND `section` from JWT claims |
| Student can browse their own group | Add `"_id": {"$ne": own_group_id}` to browse query — or show own group differently |
| Leadership not transferred on leave | Use `group_service.handle_member_leave()` — never inline the logic |
| Approve button visible when group is too small | Read `min_group` from the course document; disable the button in the frontend |
| Not cancelling other pending requests after accept | The accept handler must do `update_many` on other pending requests for this student |

---

*End of Sprint 2 Document*
*Next: Sprint 3 — Iterations, Rubrics, and Submissions*
