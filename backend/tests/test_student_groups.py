# backend/tests/test_student_groups.py
"""
Integration tests for student group formation and invitation workflow.

Covers
------
Groups:
  - GET  /api/student/groups/my
  - POST /api/student/groups/
  - PUT  /api/student/groups/<id>
  - POST /api/student/groups/<id>/leave
  - POST /api/student/groups/<id>/invite
  - POST /api/student/groups/<id>/remove/<member_id>
  - GET  /api/student/students/search/

Invitations:
  - GET  /api/student/invitations/pending
  - POST /api/student/invitations/<id>/accept
  - POST /api/student/invitations/<id>/decline
"""

GROUPS_URL     = "/api/student/groups/"
MY_GROUP_URL   = "/api/student/groups/my"
INVITES_URL    = "/api/student/invitations/"
SEARCH_URL     = "/api/student/students/search/"

GROUP_PAYLOAD = {"name": "Team Alpha", "project_title": "Smart Attendance System"}


# ── Helpers ────────────────────────────────────────────────────────────────────

def create_group(client, headers, payload=None):
    p = payload or GROUP_PAYLOAD
    r = client.post(GROUPS_URL, json=p, headers=headers)
    assert r.status_code == 201, r.get_json()
    return r.get_json()["data"]


def send_invite(client, leader_headers, group_id, roll):
    r = client.post(f"{GROUPS_URL}{group_id}/invite", json={"roll": roll}, headers=leader_headers)
    assert r.status_code == 201, r.get_json()
    return r.get_json()["data"]


# ══════════════════════════════════════════════════════════════════════════════
# Group creation
# ══════════════════════════════════════════════════════════════════════════════

def test_create_group_success(client, real_student_headers):
    """Student creates group → 201 with group data."""
    group = create_group(client, real_student_headers)
    assert group["name"] == "Team Alpha"
    assert group["project_title"] == "Smart Attendance System"
    assert group["status"] == "pending"
    assert group["member_count"] == 1
    assert "min_group" in group
    assert "max_group" in group


def test_create_group_rejects_if_already_in_group(client, real_student_headers):
    """Student cannot create a second group while already a member."""
    create_group(client, real_student_headers)
    r = client.post(GROUPS_URL, json=GROUP_PAYLOAD, headers=real_student_headers)
    assert r.status_code == 409, r.get_json()
    assert "already" in r.get_json()["message"].lower()


def test_create_group_rejects_short_name(client, real_student_headers):
    """Name shorter than 3 chars → 422 validation error."""
    r = client.post(GROUPS_URL, json={"name": "AB", "project_title": "Valid Title"}, headers=real_student_headers)
    assert r.status_code == 422, r.get_json()


def test_create_group_rejects_invalid_name_chars(client, real_student_headers):
    """Group name with special characters → 422."""
    r = client.post(GROUPS_URL, json={"name": "Team @#$!", "project_title": "Valid Title"}, headers=real_student_headers)
    assert r.status_code == 422, r.get_json()


def test_create_group_requires_auth(client):
    """Unauthenticated → 401."""
    r = client.post(GROUPS_URL, json=GROUP_PAYLOAD)
    assert r.status_code == 401


def test_create_group_rejects_manager_token(client, manager_headers):
    """Manager JWT → 403."""
    r = client.post(GROUPS_URL, json=GROUP_PAYLOAD, headers=manager_headers)
    assert r.status_code == 403


# ══════════════════════════════════════════════════════════════════════════════
# Get my group
# ══════════════════════════════════════════════════════════════════════════════

def test_get_my_group_when_not_in_group(client, real_student_headers):
    """Student with no group → 200 with data=null."""
    r = client.get(MY_GROUP_URL, headers=real_student_headers)
    assert r.status_code == 200, r.get_json()
    assert r.get_json()["data"] is None


def test_get_my_group_after_creation(client, real_student_headers, student_user):
    """After creating a group, GET my group returns it with member details."""
    create_group(client, real_student_headers)
    r = client.get(MY_GROUP_URL, headers=real_student_headers)
    assert r.status_code == 200, r.get_json()
    data = r.get_json()["data"]
    assert data["name"] == "Team Alpha"
    assert len(data["members"]) == 1
    assert data["members"][0]["roll"] == student_user["roll"]
    assert data["members"][0]["is_leader"] is True


# ══════════════════════════════════════════════════════════════════════════════
# Update group
# ══════════════════════════════════════════════════════════════════════════════

def test_update_group_by_leader(client, real_student_headers):
    """Leader updates name and project title → 200."""
    group = create_group(client, real_student_headers)
    r = client.put(
        f"{GROUPS_URL}{group['id']}",
        json={"name": "Team Beta", "project_title": "New Project Title Here"},
        headers=real_student_headers,
    )
    assert r.status_code == 200, r.get_json()
    assert r.get_json()["data"]["name"] == "Team Beta"


def test_update_group_rejected_for_non_leader(client, real_student_headers, second_student_headers, second_student_user):
    """Non-leader member cannot update group → 403."""
    group = create_group(client, real_student_headers)
    send_invite(client, real_student_headers, group["id"], second_student_user["roll"])
    # Accept invitation
    inv_r = client.get(f"{INVITES_URL}pending", headers=second_student_headers)
    inv_id = inv_r.get_json()["data"]["items"][0]["id"]
    client.post(f"{INVITES_URL}{inv_id}/accept", headers=second_student_headers)
    # Try to update as non-leader
    r = client.put(
        f"{GROUPS_URL}{group['id']}",
        json={"name": "Hijacked"},
        headers=second_student_headers,
    )
    assert r.status_code == 403, r.get_json()


def test_update_group_empty_body_returns_400(client, real_student_headers):
    """PUT with no fields → 400."""
    group = create_group(client, real_student_headers)
    r = client.put(f"{GROUPS_URL}{group['id']}", json={}, headers=real_student_headers)
    assert r.status_code == 400, r.get_json()


# ══════════════════════════════════════════════════════════════════════════════
# Invitation workflow
# ══════════════════════════════════════════════════════════════════════════════

def test_invite_member_by_roll(client, real_student_headers, second_student_user, second_student_headers):
    """Leader invites a peer → invitation appears in invitee's pending list."""
    group = create_group(client, real_student_headers)
    send_invite(client, real_student_headers, group["id"], second_student_user["roll"])

    r = client.get(f"{INVITES_URL}pending", headers=second_student_headers)
    assert r.status_code == 200, r.get_json()
    items = r.get_json()["data"]["items"]
    assert len(items) == 1
    assert items[0]["group_name"] == "Team Alpha"


def test_invite_nonexistent_roll_returns_error(client, real_student_headers):
    """Inviting a roll that does not exist → 4xx with clear message."""
    group = create_group(client, real_student_headers)
    r = client.post(
        f"{GROUPS_URL}{group['id']}/invite",
        json={"roll": "GHOST-999"},
        headers=real_student_headers,
    )
    assert r.status_code in (400, 404, 422), r.get_json()


def test_invite_duplicate_pending_rejected(client, real_student_headers, second_student_user, second_student_headers):
    """Sending a second pending invite to the same student → 409."""
    group = create_group(client, real_student_headers)
    send_invite(client, real_student_headers, group["id"], second_student_user["roll"])
    r = client.post(
        f"{GROUPS_URL}{group['id']}/invite",
        json={"roll": second_student_user["roll"]},
        headers=real_student_headers,
    )
    assert r.status_code == 409, r.get_json()


def test_non_leader_cannot_invite(client, real_student_headers, second_student_headers, second_student_user):
    """Non-leader member trying to invite → 403."""
    group = create_group(client, real_student_headers)
    send_invite(client, real_student_headers, group["id"], second_student_user["roll"])
    inv_id = client.get(f"{INVITES_URL}pending", headers=second_student_headers).get_json()["data"]["items"][0]["id"]
    client.post(f"{INVITES_URL}{inv_id}/accept", headers=second_student_headers)

    # Second student tries to invite someone
    r = client.post(
        f"{GROUPS_URL}{group['id']}/invite",
        json={"roll": "SE-F23-003"},
        headers=second_student_headers,
    )
    assert r.status_code == 403, r.get_json()


def test_accept_invitation_joins_group(client, real_student_headers, second_student_user, second_student_headers):
    """Accepting an invitation adds the invitee to the group's members."""
    group = create_group(client, real_student_headers)
    send_invite(client, real_student_headers, group["id"], second_student_user["roll"])

    inv_id = client.get(f"{INVITES_URL}pending", headers=second_student_headers).get_json()["data"]["items"][0]["id"]
    r = client.post(f"{INVITES_URL}{inv_id}/accept", headers=second_student_headers)
    assert r.status_code == 200, r.get_json()
    assert r.get_json()["data"]["accepted"] is True

    # Verify group now has 2 members
    group_r = client.get(MY_GROUP_URL, headers=second_student_headers)
    assert group_r.get_json()["data"]["member_count"] == 2


def test_accept_auto_declines_other_pending_invites(client, real_student_headers, second_student_user, second_student_headers, manager_headers, client_extra=None):
    """After accepting one invitation, all other pending invites are auto-declined."""
    group = create_group(client, real_student_headers)
    send_invite(client, real_student_headers, group["id"], second_student_user["roll"])

    # Create a third student and have them invite second_student too
    r3 = client.post("/api/manager/students/", json={
        "name": "Third Student", "roll": "SE-F23-003", "dept": "SE",
        "section": "A", "session": "Fall 2023", "course": "Final Year Project", "teacher": "Dr. X",
    }, headers=manager_headers)
    third = r3.get_json()["data"]
    third_login = client.post("/api/auth/login", json={"email": third["email"], "password": third["password"]})
    third_headers = {"Authorization": f"Bearer {third_login.get_json()['data']['token']}"}

    group2 = client.post(GROUPS_URL, json={"name": "Team Two", "project_title": "Another Project Title"}, headers=third_headers).get_json()["data"]
    send_invite(client, third_headers, group2["id"], second_student_user["roll"])

    # second_student now has 2 pending invites
    pending = client.get(f"{INVITES_URL}pending", headers=second_student_headers).get_json()["data"]["items"]
    assert len(pending) == 2

    # Accept the first one
    client.post(f"{INVITES_URL}{pending[0]['id']}/accept", headers=second_student_headers)

    # Other invite should now be auto-declined
    pending_after = client.get(f"{INVITES_URL}pending", headers=second_student_headers).get_json()["data"]["items"]
    assert len(pending_after) == 0


def test_decline_invitation(client, real_student_headers, second_student_user, second_student_headers):
    """Declining an invitation → student is not added to the group."""
    group = create_group(client, real_student_headers)
    send_invite(client, real_student_headers, group["id"], second_student_user["roll"])

    inv_id = client.get(f"{INVITES_URL}pending", headers=second_student_headers).get_json()["data"]["items"][0]["id"]
    r = client.post(f"{INVITES_URL}{inv_id}/decline", headers=second_student_headers)
    assert r.status_code == 200, r.get_json()
    assert r.get_json()["data"]["accepted"] is False

    # Verify second student still has no group
    assert client.get(MY_GROUP_URL, headers=second_student_headers).get_json()["data"] is None


def test_accept_already_responded_invite_returns_409(client, real_student_headers, second_student_user, second_student_headers):
    """Accepting an already-accepted invitation → 409."""
    group = create_group(client, real_student_headers)
    send_invite(client, real_student_headers, group["id"], second_student_user["roll"])

    inv_id = client.get(f"{INVITES_URL}pending", headers=second_student_headers).get_json()["data"]["items"][0]["id"]
    client.post(f"{INVITES_URL}{inv_id}/accept", headers=second_student_headers)
    # Try to accept again
    r = client.post(f"{INVITES_URL}{inv_id}/accept", headers=second_student_headers)
    assert r.status_code == 409, r.get_json()


# ══════════════════════════════════════════════════════════════════════════════
# Remove member
# ══════════════════════════════════════════════════════════════════════════════

def test_remove_member_by_leader(client, real_student_headers, second_student_user, second_student_headers):
    """Leader removes a member → member's group_id is cleared."""
    group = create_group(client, real_student_headers)
    send_invite(client, real_student_headers, group["id"], second_student_user["roll"])
    inv_id = client.get(f"{INVITES_URL}pending", headers=second_student_headers).get_json()["data"]["items"][0]["id"]
    client.post(f"{INVITES_URL}{inv_id}/accept", headers=second_student_headers)

    r = client.post(
        f"{GROUPS_URL}{group['id']}/remove/{second_student_user['student_id']}",
        headers=real_student_headers,
    )
    assert r.status_code == 200, r.get_json()
    assert r.get_json()["data"]["removed"] is True

    # Verify second student no longer has a group
    assert client.get(MY_GROUP_URL, headers=second_student_headers).get_json()["data"] is None


def test_remove_member_rejected_for_non_leader(client, real_student_headers, second_student_headers, second_student_user, student_user):
    """Non-leader cannot remove members → 403."""
    group = create_group(client, real_student_headers)
    send_invite(client, real_student_headers, group["id"], second_student_user["roll"])
    inv_id = client.get(f"{INVITES_URL}pending", headers=second_student_headers).get_json()["data"]["items"][0]["id"]
    client.post(f"{INVITES_URL}{inv_id}/accept", headers=second_student_headers)

    # Non-leader tries to remove the leader
    r = client.post(
        f"{GROUPS_URL}{group['id']}/remove/{student_user['student_id']}",
        headers=second_student_headers,
    )
    assert r.status_code == 403, r.get_json()


# ══════════════════════════════════════════════════════════════════════════════
# Leave group
# ══════════════════════════════════════════════════════════════════════════════

def test_leave_group_non_leader(client, real_student_headers, second_student_headers, second_student_user):
    """Non-leader member can leave the group."""
    group = create_group(client, real_student_headers)
    send_invite(client, real_student_headers, group["id"], second_student_user["roll"])
    inv_id = client.get(f"{INVITES_URL}pending", headers=second_student_headers).get_json()["data"]["items"][0]["id"]
    client.post(f"{INVITES_URL}{inv_id}/accept", headers=second_student_headers)

    r = client.post(f"{GROUPS_URL}{group['id']}/leave", headers=second_student_headers)
    assert r.status_code == 200, r.get_json()
    assert r.get_json()["data"]["left"] is True

    # Verify they are no longer in the group
    assert client.get(MY_GROUP_URL, headers=second_student_headers).get_json()["data"] is None


def test_leave_group_as_leader_returns_400(client, real_student_headers):
    """Group leader cannot leave → 400."""
    group = create_group(client, real_student_headers)
    r = client.post(f"{GROUPS_URL}{group['id']}/leave", headers=real_student_headers)
    assert r.status_code == 400, r.get_json()
    assert "leader" in r.get_json()["message"].lower()


# ══════════════════════════════════════════════════════════════════════════════
# Peer search
# ══════════════════════════════════════════════════════════════════════════════

def test_search_students_by_roll(client, real_student_headers, second_student_user):
    """Searching by roll fragment returns students in same dept/section."""
    r = client.get(f"{SEARCH_URL}?roll=SE-F23", headers=real_student_headers)
    assert r.status_code == 200, r.get_json()
    rolls = [s["roll"] for s in r.get_json()["data"]["items"]]
    assert second_student_user["roll"] in rolls


def test_search_returns_has_group_flag(client, real_student_headers, second_student_headers, second_student_user):
    """has_group flag is True for students already in a group."""
    # second student creates a group
    client.post(GROUPS_URL, json=GROUP_PAYLOAD, headers=second_student_headers)

    r = client.get(f"{SEARCH_URL}?roll=SE-F23", headers=real_student_headers)
    items = {s["roll"]: s for s in r.get_json()["data"]["items"]}
    assert items[second_student_user["roll"]]["has_group"] is True


def test_search_requires_roll_param(client, real_student_headers):
    """Missing roll query param → 400."""
    r = client.get(SEARCH_URL, headers=real_student_headers)
    assert r.status_code == 400, r.get_json()


# ══════════════════════════════════════════════════════════════════════════════
# Join Requests workflow
# ══════════════════════════════════════════════════════════════════════════════

def test_send_join_request_success(client, real_student_headers, second_student_headers):
    """Unaffiliated student can send a join request to an existing group."""
    group = create_group(client, real_student_headers)

    r = client.post(
        f"{GROUPS_URL}{group['id']}/join-request",
        json={"message": "Hi, I would love to join your team!"},
        headers=second_student_headers,
    )
    assert r.status_code == 201, r.get_json()
    data = r.get_json()["data"]
    assert data["group_id"] == group["id"]
    assert data["status"] == "pending"


def test_send_join_request_rejects_duplicate_pending(client, real_student_headers, second_student_headers):
    """Cannot send two pending join requests to the same group."""
    group = create_group(client, real_student_headers)

    client.post(
        f"{GROUPS_URL}{group['id']}/join-request",
        json={"message": "First request"},
        headers=second_student_headers,
    )

    r = client.post(
        f"{GROUPS_URL}{group['id']}/join-request",
        json={"message": "Duplicate request"},
        headers=second_student_headers,
    )
    assert r.status_code == 400, r.get_json()
    assert "already have a pending join request" in r.get_json()["message"].lower()


def test_cancel_join_request(client, real_student_headers, second_student_headers):
    """Student can cancel their own pending join request."""
    group = create_group(client, real_student_headers)

    r1 = client.post(
        f"{GROUPS_URL}{group['id']}/join-request",
        headers=second_student_headers,
    )
    req_id = r1.get_json()["data"]["id"]

    r2 = client.delete(f"{GROUPS_URL}join-requests/{req_id}", headers=second_student_headers)
    assert r2.status_code == 200, r2.get_json()


def test_list_my_sent_join_requests(client, real_student_headers, second_student_headers):
    """Student can retrieve all join requests they have sent."""
    group = create_group(client, real_student_headers)

    client.post(
        f"{GROUPS_URL}{group['id']}/join-request",
        json={"message": "Please accept me!"},
        headers=second_student_headers,
    )

    r = client.get(f"{GROUPS_URL}my/sent-requests", headers=second_student_headers)
    assert r.status_code == 200, r.get_json()
    items = r.get_json()["data"]["items"]
    assert len(items) >= 1
    assert items[0]["group_name"] == "Team Alpha"
    assert items[0]["status"] == "pending"


def test_leader_accept_join_request(client, real_student_headers, second_student_headers, second_student_user):
    """Group leader accepts join request → student is added to group and other requests are cancelled."""
    group = create_group(client, real_student_headers)

    r1 = client.post(
        f"{GROUPS_URL}{group['id']}/join-request",
        headers=second_student_headers,
    )
    req_id = r1.get_json()["data"]["id"]

    # Leader accepts
    r2 = client.post(f"{GROUPS_URL}join-requests/{req_id}/accept", headers=real_student_headers)
    assert r2.status_code == 200, r2.get_json()

    # Verify second student is now in group
    my_group = client.get(MY_GROUP_URL, headers=second_student_headers).get_json()["data"]
    assert my_group is not None
    assert my_group["id"] == group["id"]
    assert my_group["member_count"] == 2


def test_leader_reject_join_request(client, real_student_headers, second_student_headers):
    """Group leader declines join request → request marked rejected."""
    group = create_group(client, real_student_headers)

    r1 = client.post(
        f"{GROUPS_URL}{group['id']}/join-request",
        headers=second_student_headers,
    )
    req_id = r1.get_json()["data"]["id"]

    r2 = client.post(f"{GROUPS_URL}join-requests/{req_id}/reject", headers=real_student_headers)
    assert r2.status_code == 200, r2.get_json()

    # Verify request status in sent requests
    r3 = client.get(f"{GROUPS_URL}my/sent-requests", headers=second_student_headers)
    items = r3.get_json()["data"]["items"]
    assert items[0]["status"] == "rejected"

