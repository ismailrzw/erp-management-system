"""End-to-end FYP workflow and direct API authorization regression coverage."""

from datetime import datetime, timedelta, timezone
from io import BytesIO

import pytest
from bson import ObjectId
from test_student_groups import create_group, send_invite

from app.extensions import mongo
from app.services.milestone_service import deadline_utc


@pytest.fixture
def dossier(client, manager_headers, real_student_headers, second_student_headers, student_user, second_student_user):
    group = create_group(client, real_student_headers)
    invitation = send_invite(client, real_student_headers, group["id"], second_student_user["roll"])
    invite_id = invitation.get("id") or invitation.get("invitation_id")
    if not invite_id:
        invite_id = client.get("/api/student/invitations/pending", headers=second_student_headers).get_json()["data"]["items"][0]["id"]
    accepted = client.post(f"/api/student/invitations/{invite_id}/accept", headers=second_student_headers)
    assert accepted.status_code == 200, accepted.get_json()
    teacher = client.post("/api/manager/teachers/", json={"name": "Assigned Supervisor", "email": "supervisor@bnu.edu.pk", "dept": "SE", "domains": ["Software Engineering"]}, headers=manager_headers)
    assert teacher.status_code == 201, teacher.get_json()
    teacher = teacher.get_json()["data"]
    login = client.post("/api/auth/login", json={"email": teacher["email"], "password": teacher["initial_password"]})
    th = {"Authorization": f"Bearer {login.get_json()['data']['token']}"}
    sprint = client.post("/api/manager/sprints", json={"name": "Requirement Engineering", "description": "Investigate users and requirements."}, headers=manager_headers)
    assert sprint.status_code == 201, sprint.get_json()
    task = client.post("/api/manager/iterations", json={"title": "Target Market", "course": "All Courses", "deadline": "2099-12-31T23:59:00+05:00", "sprint_id": sprint.get_json()["data"]["id"], "late_penalty_percent": 10}, headers=manager_headers)
    assert task.status_code == 201, task.get_json()
    tid = task.get_json()["data"]["_id"]
    criteria = [{"id": i, "question": name, "weight": weight, "levels": {str(n): f"Score {n}" for n in range(6)}} for i, name, weight in ((1, "Primary Users", 40), (2, "Secondary Users", 60))]
    assert client.post(f"/api/manager/iterations/{tid}/rubrics", json={"rubrics": criteria}, headers=manager_headers).status_code == 200
    return {"group": group, "task_id": tid, "teacher": teacher, "teacher_headers": th, "leader_headers": real_student_headers,
            "peer_headers": second_student_headers, "leader": student_user, "peer": second_student_user, "manager_headers": manager_headers}


def approve(client, dossier):
    request = client.post("/api/student/supervisor-requests/", json={"evaluator_id": dossier["teacher"]["id"], "request_message": "Please review our proposal."}, headers=dossier["leader_headers"])
    assert request.status_code == 201, request.get_json()
    rid = request.get_json()["data"]["id"]
    accepted = client.post(f"/api/teacher/supervisor-requests/{rid}/accept", headers=dossier["teacher_headers"])
    assert accepted.status_code == 200, accepted.get_json()
    approved = client.post(f"/api/manager/groups/{dossier['group']['id']}/approve", headers=dossier["manager_headers"])
    assert approved.status_code == 200, approved.get_json()
    return rid


def submit(client, dossier, expected=None):
    data = {"file": (BytesIO(b"%PDF-1.4 valid test upload"), "users.pdf")}
    if expected:
        data["expected_submission"] = expected
    return client.post(f"/api/student/iterations/{dossier['task_id']}/submit", data=data,
                       content_type="multipart/form-data", headers=dossier["peer_headers"])


def test_pending_members_view_tasks_but_cannot_submit_or_skip_review(client, dossier):
    for headers in (dossier["leader_headers"], dossier["peer_headers"]):
        response = client.get("/api/student/iterations", headers=headers)
        assert response.status_code == 200, response.get_json()
        assert response.get_json()["data"][0]["_id"] == dossier["task_id"]
    assert submit(client, dossier).status_code == 403
    approval = client.post(f"/api/manager/groups/{dossier['group']['id']}/approve", headers=dossier["manager_headers"])
    assert approval.status_code in (400, 409)
    workspace = client.get(f"/api/manager/groups/{dossier['group']['id']}/workspace", headers=dossier["manager_headers"])
    assert workspace.status_code == 200, workspace.get_json()
    assert workspace.get_json()["data"]["proposal"]["attachment"]["original_filename"] == "proposal.pdf"


def test_review_contains_full_dossier_and_shared_submission(client, dossier):
    approve(client, dossier)
    assert mongo.db.supervisor_requests.find_one({})["members"][1]["roll"] == dossier["peer"]["roll"]
    response = submit(client, dossier)
    assert response.status_code == 201, response.get_json()
    for headers in (dossier["leader_headers"], dossier["peer_headers"]):
        view = client.get(f"/api/student/iterations/{dossier['task_id']}", headers=headers).get_json()["data"]
        assert view["has_submitted"] is True
        assert view["submission"]["submitted_by"] == dossier["peer"]["student_id"]
    assert mongo.db.submissions.count_documents({}) == 1


def test_pre_deadline_unsubmit_and_stale_replace_conflict(client, dossier):
    approve(client, dossier)
    first = submit(client, dossier).get_json()["data"]
    assert submit(client, dossier).status_code == 409
    replaced = submit(client, dossier, first["id"])
    assert replaced.status_code == 201, replaced.get_json()
    result = client.post(f"/api/student/iterations/{dossier['task_id']}/unsubmit", json={"expected_submission": first["id"]}, headers=dossier["leader_headers"])
    assert result.status_code == 200, result.get_json()
    assert mongo.db.submissions.count_documents({}) == 0
    assert mongo.db.submission_history.count_documents({}) == 2


def test_late_submission_locked_and_penalty_applied_once(client, dossier):
    approve(client, dossier)
    mongo.db.iterations.update_one({"_id": ObjectId(dossier["task_id"])}, {"$set": {"deadline": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()}})
    uploaded = submit(client, dossier)
    assert uploaded.status_code == 201, uploaded.get_json()
    submission = uploaded.get_json()["data"]
    assert submission["is_late"] is True
    assert submit(client, dossier, submission["id"]).status_code == 409
    assert client.post(f"/api/student/iterations/{dossier['task_id']}/unsubmit", json={"expected_submission": submission["id"]}, headers=dossier["peer_headers"]).status_code == 409
    route = f"/api/workflow/groups/{dossier['group']['id']}/milestones/{dossier['task_id']}/grade"
    result = client.post(route, json={"scores": {"1": 4, "2": 4}, "feedback": "Good evidence."}, headers=dossier["teacher_headers"])
    assert result.status_code == 201, result.get_json()
    grade = result.get_json()["data"]
    assert (grade["raw_score"], grade["deduction"], grade["final_score"]) == (80, 8, 72)
    assert client.post(route, json={"scores": {"1": 5, "2": 5}}, headers=dossier["teacher_headers"]).status_code == 409
    for headers in (dossier["leader_headers"], dossier["peer_headers"]):
        view = client.get(f"/api/student/iterations/{dossier['task_id']}", headers=headers).get_json()["data"]
        assert view["grade"]["final_score"] == 72
    changed = client.put(f"/api/manager/iterations/{dossier['task_id']}", json={"late_penalty_percent": 20}, headers=dossier["manager_headers"])
    assert changed.status_code == 409


def test_private_comment_recipient_scope_and_retry_idempotency(client, dossier):
    approve(client, dossier)
    route = f"/api/student/iterations/{dossier['task_id']}/comments"
    body = {"content": "Private question for Supervisor", "recipient_id": dossier["teacher"]["id"], "client_key": "same-retry"}
    for _ in range(2):
        assert client.post(route, json=body, headers=dossier["peer_headers"]).status_code == 201
    assert len(client.get(route, headers=dossier["leader_headers"]).get_json()["data"]) == 0
    review_route = f"/api/workflow/groups/{dossier['group']['id']}/milestones/{dossier['task_id']}/comments"
    assert len(client.get(review_route, headers=dossier["manager_headers"]).get_json()["data"]) == 0
    comments = client.get(review_route, headers=dossier["teacher_headers"]).get_json()["data"]
    assert len(comments) == 1
    reply = client.post(review_route, json={"content": "Private response", "reply_to": comments[0]["_id"], "client_key": "reply"}, headers=dossier["teacher_headers"])
    assert reply.status_code == 200, reply.get_json()
    assert len(client.get(route, headers=dossier["peer_headers"]).get_json()["data"]) == 2


def test_proposal_revision_cancels_stale_request_and_identifier_cannot_change(client, dossier):
    requested = client.post("/api/student/supervisor-requests/", json={"evaluator_id": dossier["teacher"]["id"]}, headers=dossier["leader_headers"])
    rid = requested.get_json()["data"]["id"]
    response = client.put(f"/api/student/groups/{dossier['group']['id']}", json={"project_title": "Revised Project Title", "scope": "Updated scope"}, headers=dossier["leader_headers"])
    assert response.status_code == 200, response.get_json()
    assert response.get_json()["data"]["name"] == dossier["group"]["name"]
    assert client.post(f"/api/teacher/supervisor-requests/{rid}/accept", headers=dossier["teacher_headers"]).status_code == 400
    assert client.put(f"/api/student/groups/{dossier['group']['id']}", json={"name": "custom-name"}, headers=dossier["leader_headers"]).status_code == 422


def test_non_target_task_and_instruction_file_inaccessible(client, dossier):
    mongo.db.courses.insert_one({"name": "Other Course", "dept": "SE", "deleted": False})
    upload = client.post("/api/manager/attachments/", data={"title": "Private course instructions", "file": (BytesIO(b"instructions"), "instructions.pdf")}, content_type="multipart/form-data", headers=dossier["manager_headers"])
    aid = upload.get_json()["data"]["id"]
    sprint = mongo.db.sprints.find_one({})
    task = client.post("/api/manager/iterations", json={"title": "Other Task", "course": "Other Course", "deadline": "2099-12-31", "sprint_id": str(sprint["_id"]), "document_attachment_id": aid}, headers=dossier["manager_headers"])
    assert task.status_code == 201, task.get_json()
    tid = task.get_json()["data"]["_id"]
    assert client.get(f"/api/student/iterations/{tid}", headers=dossier["leader_headers"]).status_code == 404
    assert client.get(f"/api/manager/attachments/{aid}/download", headers=dossier["leader_headers"]).status_code == 404


def test_deadline_conversion_and_invalid_deadline():
    assert deadline_utc("2026-10-08T10:00") == datetime(2026, 10, 8, 5, 0, tzinfo=timezone.utc)
    assert deadline_utc("2026-10-08") == datetime(2026, 10, 8, 18, 59, 59, tzinfo=timezone.utc)
    with pytest.raises(ValueError):
        deadline_utc("not a deadline")


def test_notification_history_is_scoped_and_read_persistent(client, dossier):
    group_id = dossier["group"]["id"]
    documents = []
    for scope, targets, title in (("broadcast", [], "Everyone"), ("department", ["SE"], "Our Department"), ("department", ["CS"], "Other Department"), ("group", [group_id], "Our Group"), ("group", [str(ObjectId())], "Other Group")):
        documents.append({"title": title, "content": "Notice", "scope": scope, "target_ids": targets, "created_at": datetime.now(timezone.utc)})
    inserted = mongo.db.announcements.insert_many(documents)
    for headers in (dossier["leader_headers"], dossier["peer_headers"]):
        feed = client.get("/api/notifications", headers=headers).get_json()["data"]
        assert {item["title"] for item in feed["items"]} == {"Everyone", "Our Department", "Our Group"}
        assert feed["unread_count"] == 3
    read_url = f"/api/notifications/{inserted.inserted_ids[0]}/read"
    assert client.post(read_url, headers=dossier["leader_headers"]).status_code == 200
    assert client.post(read_url, headers=dossier["leader_headers"]).status_code == 200
    assert client.get("/api/notifications", headers=dossier["leader_headers"]).get_json()["data"]["unread_count"] == 2
    assert client.get("/api/notifications", headers=dossier["peer_headers"]).get_json()["data"]["unread_count"] == 3
    assert client.post(f"/api/notifications/{inserted.inserted_ids[2]}/read", headers=dossier["leader_headers"]).status_code == 404
    teacher_feed = client.get("/api/notifications", headers=dossier["teacher_headers"]).get_json()["data"]
    assert {item["title"] for item in teacher_feed["items"]} == {"Everyone", "Our Department"}
    assert len(client.get("/api/notifications", headers=dossier["manager_headers"]).get_json()["data"]["items"]) == 5


def test_stale_group_marker_cannot_expose_another_group(client, dossier):
    foreign = mongo.db.groups.insert_one({"name": "legacy-foreign", "member_ids": [], "status": "pending"}).inserted_id
    mongo.db.users.update_one({"_id": ObjectId(dossier["leader"]["student_id"])}, {"$set": {"group_id": foreign}})
    response = client.get("/api/student/groups/my", headers=dossier["leader_headers"])
    assert response.status_code == 200
    assert response.get_json()["data"]["id"] == dossier["group"]["id"]


def test_legacy_submission_policy_requires_explicit_confirmation(client, dossier):
    approve(client, dossier)
    submission = submit(client, dossier).get_json()["data"]
    mongo.db.submissions.update_one({"_id": ObjectId(submission["id"])}, {"$unset": {"deadline_snapshot": "", "late_penalty_percent": ""}})
    endpoint = f"/api/workflow/groups/{dossier['group']['id']}/milestones/{dossier['task_id']}"
    assert client.post(endpoint + "/grade", json={"scores": {"1": 4, "2": 4}}, headers=dossier["teacher_headers"]).status_code == 409
    body = {"deadline": "2020-01-01T00:00:00+05:00", "late_penalty_percent": 10}
    assert client.post(endpoint + "/submission-policy", json=body, headers=dossier["teacher_headers"]).status_code == 403
    result = client.post(endpoint + "/submission-policy", json=body, headers=dossier["manager_headers"])
    assert result.status_code == 200, result.get_json()
    grade = client.post(endpoint + "/grade", json={"scores": {"1": 4, "2": 4}}, headers=dossier["teacher_headers"])
    assert grade.status_code == 201, grade.get_json()
    assert grade.get_json()["data"]["final_score"] == 72
    assert client.post(endpoint + "/submission-policy", json=body, headers=dossier["manager_headers"]).status_code == 409


def test_simultaneous_acceptances_cannot_exceed_total_capacity(app, client, dossier):
    from concurrent.futures import ThreadPoolExecutor
    from copy import deepcopy
    teacher_id = ObjectId(dossier["teacher"]["id"])
    original = mongo.db.groups.find_one({"_id": ObjectId(dossier["group"]["id"])})
    for index in range(3):
        mongo.db.groups.insert_one({"name": f"existing-{index}", "supervisor_id": teacher_id, "status": "approved", "course": "Another Course"})
    requests = []
    for index in range(2):
        group = deepcopy(original); group.pop("_id"); group["name"] = f"candidate-{index}"
        group["_id"] = mongo.db.groups.insert_one(group).inserted_id
        requests.append(str(mongo.db.supervisor_requests.insert_one({"group_id": group["_id"], "evaluator_id": teacher_id, "status": "pending", "proposal_version": group["proposal_version"]}).inserted_id))
    def accept(request_id):
        with app.test_client() as concurrent_client:
            return concurrent_client.post(f"/api/teacher/supervisor-requests/{request_id}/accept", headers=dossier["teacher_headers"]).status_code
    with ThreadPoolExecutor(max_workers=2) as executor:
        statuses = list(executor.map(accept, requests))
    assert statuses.count(200) == 1
    assert all(status in (200, 400, 409) for status in statuses)
    assert mongo.db.groups.count_documents({"supervisor_id": teacher_id, "status": {"$nin": ["deleted", "rejected"]}}) == 4
    unresolved = mongo.db.supervisor_requests.find_one({"status": "pending"})
    assert client.post(f"/api/teacher/supervisor-requests/{unresolved['_id']}/accept", headers=dossier["teacher_headers"]).status_code in (400, 409)


def test_proposal_and_instruction_downloads_follow_role_and_course_scope(client, dossier):
    request = client.post("/api/student/supervisor-requests/", json={"evaluator_id": dossier["teacher"]["id"]}, headers=dossier["leader_headers"])
    assert request.status_code == 201, request.get_json()
    proposal = mongo.db.groups.find_one({"_id": ObjectId(dossier["group"]["id"])})["proposal_attachment_id"]
    assert client.get(f"/api/manager/attachments/{proposal}/download", headers=dossier["teacher_headers"]).status_code == 200
    upload = client.post("/api/manager/attachments/", data={"title": "Private milestone instructions", "purpose": "milestone", "file": (BytesIO(b"%PDF-1.4 instructions"), "instructions.pdf")}, content_type="multipart/form-data", headers=dossier["manager_headers"])
    assert upload.status_code == 201, upload.get_json()
    attachment_id = upload.get_json()["data"]["id"]
    assert client.get(f"/api/manager/attachments/{attachment_id}", headers=dossier["leader_headers"]).status_code == 404
    changed = client.put(f"/api/manager/iterations/{dossier['task_id']}", json={"course": "PBL", "document_attachment_id": attachment_id}, headers=dossier["manager_headers"])
    assert changed.status_code == 200, changed.get_json()
    assert client.get(f"/api/manager/attachments/{attachment_id}/download", headers=dossier["leader_headers"]).status_code == 404
    listed = client.get("/api/manager/attachments/", headers=dossier["leader_headers"]).get_json()
    assert not any(item["id"] == attachment_id for item in listed)
    assert client.put(f"/api/manager/iterations/{dossier['task_id']}", json={"course": "Final Year Project"}, headers=dossier["manager_headers"]).status_code == 200
    assert client.get(f"/api/manager/attachments/{attachment_id}/download", headers=dossier["peer_headers"]).status_code == 200


def test_internal_evaluator_activation_verifies_institutional_address(client, manager_headers, academic_setup):
    from app.services.auth_service import AuthService
    body = {"name": "Internal Expert", "email": "expert@bnu.edu.pk", "dept": "SE", "evaluator_type": "internal", "domains": ["Software Engineering"]}
    for email in ("expert@bnu.edu.pk.attacker.test", "expert@notbnu.edu.pk", "expert@gmail.com"):
        response = client.post("/api/manager/evaluators/", json={**body, "email": email}, headers=manager_headers)
        assert response.status_code in (400, 409, 422), response.get_json()
    response = client.post("/api/manager/evaluators/", json=body, headers=manager_headers)
    assert response.status_code == 201, response.get_json()
    record = response.get_json()["data"]
    assert record["activation_required"] and not record["email_verified"]
    assert "initial_password" not in record
    password = "VerifiedFaculty123!"
    token = AuthService.create_password_set_token(record["id"])
    assert client.post("/api/auth/set-password", json={"token": token, "new_password": password}).status_code == 200
    login = client.post("/api/auth/login", json={"email": body["email"], "password": password})
    assert login.status_code == 200, login.get_json()
    assert mongo.db.users.find_one({"_id": ObjectId(record["id"])})["email_verified"] is True


def test_legacy_group_association_repair_requires_verified_member_enrollment(client, dossier):
    group_id = ObjectId(dossier["group"]["id"])
    mongo.db.groups.update_one({"_id": group_id}, {"$set": {"dept": "", "course": ""}})
    route = f"/api/manager/groups/{group_id}/academic-link"
    own_course = mongo.db.courses.find_one({"name": "Final Year Project"})
    other_course = mongo.db.courses.find_one({"name": "PBL"})
    body = {"course_id": str(own_course["_id"]), "expected_version": mongo.db.groups.find_one({"_id": group_id})["version"]}
    assert client.post(route, json=body, headers=dossier["leader_headers"]).status_code == 403
    assert client.post(route, json={**body, "course_id": str(other_course["_id"])}, headers=dossier["manager_headers"]).status_code == 409
    result = client.post(route, json=body, headers=dossier["manager_headers"])
    assert result.status_code == 200, result.get_json()
    assert result.get_json()["data"]["group"]["dept"] == "SE"
    assert mongo.db.group_relation_changes.count_documents({}) == 1
    assert client.get("/api/student/iterations", headers=dossier["peer_headers"]).status_code == 200


def test_assigned_supervisor_can_review_a_revision_at_total_capacity(client, dossier):
    approve(client, dossier)
    group_id = ObjectId(dossier["group"]["id"])
    teacher_id = ObjectId(dossier["teacher"]["id"])
    mongo.db.groups.insert_many([{"name": f"other-{index}", "status": "approved", "supervisor_id": teacher_id, "course": "PBL"} for index in range(3)])
    # A Manager rejection allows the leader to revise the same supervised project.
    rejected = client.post(f"/api/manager/groups/{group_id}/reject", json={"reason": "Clarify the project scope."}, headers=dossier["manager_headers"])
    assert rejected.status_code == 200, rejected.get_json()
    revised = client.put(f"/api/student/groups/{group_id}", json={"project_title": "Revised Target Market"}, headers=dossier["leader_headers"])
    assert revised.status_code == 200, revised.get_json()
    available = client.get("/api/student/supervisors/?available_only=true", headers=dossier["leader_headers"])
    assert available.status_code == 200, available.get_json()
    assert available.get_json()["data"]["items"][0]["reviewing_existing_group"] is True
    request = client.post("/api/student/supervisor-requests/", json={"evaluator_id": str(teacher_id)}, headers=dossier["leader_headers"])
    assert request.status_code == 201, request.get_json()
    accepted = client.post(f"/api/teacher/supervisor-requests/{request.get_json()['data']['id']}/accept", headers=dossier["teacher_headers"])
    assert accepted.status_code == 200, accepted.get_json()
    assert mongo.db.groups.count_documents({"supervisor_id": teacher_id}) == 4


def test_multipart_title_edit_without_replacing_proposal(client, dossier):
    group_id = dossier["group"]["id"]
    before = mongo.db.groups.find_one({"_id": ObjectId(group_id)})
    result = client.put(f"/api/student/groups/{group_id}", data={"project_title": "Revised Project Title", "scope": "Updated project scope", "expected_version": str(before["version"])}, content_type="multipart/form-data", headers=dossier["leader_headers"])
    assert result.status_code == 200, result.get_json()
    after = mongo.db.groups.find_one({"_id": ObjectId(group_id)})
    assert after["proposal_attachment_id"] == before["proposal_attachment_id"]
    assert after["name"] == before["name"]
    assert after["project_title"] == "Revised Project Title"
    stale = client.put(f"/api/student/groups/{group_id}", data={"project_title": "Stale Project Title", "expected_version": str(before["version"])}, content_type="multipart/form-data", headers=dossier["leader_headers"])
    assert stale.status_code == 409, stale.get_json()
    invalid = client.put(f"/api/student/groups/{group_id}", data={"proposal": (BytesIO(b"PK invalid proposal type"), "proposal.zip")}, content_type="multipart/form-data", headers=dossier["leader_headers"])
    assert invalid.status_code == 400, invalid.get_json()
    assert mongo.db.groups.find_one({"_id": ObjectId(group_id)})["proposal_attachment_id"] == before["proposal_attachment_id"]
