"""Regression tests for identity, enrollment, retained relations and read-only sprint GET."""

from datetime import datetime, timezone
from io import BytesIO

import pytest
from bson import ObjectId

from app.extensions import mongo
from app.services.student_profile_service import update_profile
from app.services.student_service import update_student


@pytest.fixture
def student(app, academic_setup):
    with app.app_context():
        doc = {"name": "Recorded Name", "roll": "f2026-551", "session": "2026",
               "role": "student", "dept": "CS", "course": "PBL", "section": "A", "deleted": False}
        doc["_id"] = mongo.db.users.insert_one(doc).inserted_id
        return doc


@pytest.mark.parametrize("field,value", [("name", "Changed"), ("roll", "f2026-552"), ("session", "2027")])
def test_manager_mixed_identity_payload_rejected(client, manager_headers, student, field, value):
    response = client.put(f"/api/manager/students/{student['_id']}",
                          json={field: value, "section": "B"}, headers=manager_headers)
    assert response.status_code == 422, response.get_json()
    saved = mongo.db.users.find_one({"_id": student["_id"]})
    assert saved[field] == student[field]
    assert saved["section"] == "A"


@pytest.mark.parametrize("field", ["name", "roll", "session"])
def test_direct_student_service_cannot_bypass_identity(app, student, field):
    with app.app_context(), pytest.raises(ValueError):
        update_student(str(student["_id"]), {field: "Changed", "section": "B"})
    assert mongo.db.users.find_one({"_id": student["_id"]})["section"] == "A"


def test_direct_profile_service_cannot_bypass_identity(app, student):
    with app.app_context(), pytest.raises(ValueError):
        update_profile(str(student["_id"]), {"name": "Changed", "recovery_email": "test@example.com"})
    assert mongo.db.users.find_one({"_id": student["_id"]})["name"] == student["name"]


@pytest.mark.parametrize("field", ["name", "roll", "session", "dept"])
@pytest.mark.parametrize("value", [None, "   "])
def test_create_requires_nonblank_identity_and_department(client, manager_headers, academic_setup, field, value):
    payload = {"name": "New Student", "roll": "f2026-600", "session": "2026", "dept": "CS"}
    if value is None:
        payload.pop(field)
    else:
        payload[field] = value
    response = client.post("/api/manager/students/", json=payload, headers=manager_headers)
    assert response.status_code == 422, response.get_json()
    assert mongo.db.users.count_documents({"role": "student"}) == 0


def test_department_course_pair_validated_without_partial_update(client, manager_headers, student):
    response = client.put(f"/api/manager/students/{student['_id']}",
                          json={"dept": "SE", "course": "PBL"}, headers=manager_headers)
    assert response.status_code == 400, response.get_json()
    saved = mongo.db.users.find_one({"_id": student["_id"]})
    assert (saved["dept"], saved["course"]) == ("CS", "PBL")


def test_manager_can_correct_ungrouped_academic_pair(client, manager_headers, student):
    response = client.put(f"/api/manager/students/{student['_id']}",
                          json={"dept": "SE", "course": "Final Year Project"}, headers=manager_headers)
    assert response.status_code == 200, response.get_json()
    saved = mongo.db.users.find_one({"_id": student["_id"]})
    assert (saved["dept"], saved["course"], saved["name"], saved["session"]) == ("SE", "Final Year Project", "Recorded Name", "2026")


def test_student_list_reports_legacy_membership_lock(client, manager_headers, student):
    mongo.db.groups.insert_one({"status": "pending", "member_ids": [str(student["_id"])]})
    response = client.get("/api/manager/students/", headers=manager_headers)
    assert response.status_code == 200, response.get_json()
    assert response.get_json()["data"]["items"][0]["academic_locked"] is True


def test_recovery_email_can_be_cleared_without_other_mutations(app, student):
    mongo.db.users.update_one({"_id": student["_id"]}, {"$set": {"recovery_email": "old@example.com"}})
    with app.app_context():
        result = update_profile(str(student["_id"]), {"recovery_email": None})
    assert result["recovery_email"] is None
    assert result["name"] == student["name"]


def test_parent_reference_edits_cannot_orphan_enrolled_student(client, manager_headers, student):
    department = mongo.db.departments.find_one({"code": "CS"})
    response = client.put(f"/api/manager/departments/{department['_id']}",
                          json={"code": "NEW"}, headers=manager_headers)
    assert response.status_code == 409, response.get_json()
    course = mongo.db.courses.find_one({"name": "PBL"})
    response = client.put(f"/api/manager/courses/{course['_id']}",
                          json={"name": "Renamed"}, headers=manager_headers)
    assert response.status_code == 409, response.get_json()
    assert mongo.db.departments.find_one({"_id": department["_id"]})["code"] == "CS"
    assert mongo.db.courses.find_one({"_id": course["_id"]})["name"] == "PBL"


@pytest.mark.parametrize("reference", ["object", "string", "leader", "user_marker"])
def test_grouped_student_cannot_move_or_be_deleted(client, manager_headers, student, reference):
    sid = student["_id"]
    group = {"status": "pending", "member_ids": [str(sid) if reference == "string" else sid]}
    if reference == "leader":
        group = {"status": "deleted", "leader_id": sid, "member_ids": []}
    if reference == "user_marker":
        mongo.db.users.update_one({"_id": sid}, {"$set": {"group_id": ObjectId()}})
    else:
        mongo.db.groups.insert_one(group)
    response = client.put(f"/api/manager/students/{sid}",
                          json={"dept": "SE", "course": "Final Year Project"}, headers=manager_headers)
    assert response.status_code == 409, response.get_json()
    response = client.delete(f"/api/manager/students/{sid}", headers=manager_headers)
    assert response.status_code == 409, response.get_json()
    assert mongo.db.users.find_one({"_id": sid})["deleted"] is False
    if reference != "user_marker":
        assert mongo.db.groups.find_one({})["member_ids"] == group["member_ids"]


@pytest.mark.parametrize("entity,child_collection,child_field", [
    ("departments", "courses", "dept"), ("departments", "users", "dept"),
    ("courses", "groups", "course"), ("courses", "users", "course"),
    ("courses", "iterations", "course"), ("teachers", "groups", "supervisor_id"),
    ("evaluators", "assignments", "evaluator_id"), ("evaluators", "evaluations", "evaluator_id"),
])
@pytest.mark.parametrize("permanent", [False, True])
def test_retained_children_block_both_delete_paths(client, manager_headers, entity, child_collection, child_field, permanent):
    collection = "users" if entity in ("teachers", "evaluators") else entity
    doc = {"name": "Parent", "code": "TEST", "dept": "TEST", "deleted": permanent,
           "role": "teacher" if entity == "teachers" else "evaluator", "email": "parent@example.com"}
    oid = mongo.db[collection].insert_one(doc).inserted_id
    value = "TEST" if child_field == "dept" else "Parent" if child_field == "course" else str(oid)
    mongo.db[child_collection].insert_one({child_field: value, "deleted": True, "status": "deleted"})
    suffix = "/permanent" if permanent else ""
    response = client.delete(f"/api/manager/{entity}/{oid}{suffix}", headers=manager_headers)
    assert response.status_code == 409, response.get_json()
    assert "Cannot delete" in response.get_json()["message"]
    assert mongo.db[collection].find_one({"_id": oid})["deleted"] is permanent


@pytest.mark.parametrize("entity", ["departments", "courses", "teachers", "evaluators"])
def test_childless_entity_keeps_soft_delete_and_restore(client, manager_headers, entity):
    collection = "users" if entity in ("teachers", "evaluators") else entity
    doc = {"name": "Unused", "code": "UNUSED", "dept": "UNUSED", "deleted": False,
           "role": "teacher" if entity == "teachers" else "evaluator", "email": "unused@example.com"}
    if entity != "departments":
        mongo.db.departments.insert_one({"code": "UNUSED", "name": "Parent Department", "deleted": False})
    oid = mongo.db[collection].insert_one(doc).inserted_id
    assert client.delete(f"/api/manager/{entity}/{oid}", headers=manager_headers).status_code == 200
    assert client.post(f"/api/manager/{entity}/{oid}/restore", headers=manager_headers).status_code == 200
    assert mongo.db[collection].find_one({"_id": oid})["deleted"] is False


def test_bulk_blank_session_is_rejected_per_row(client, manager_headers, academic_setup):
    contents = b"Name,Roll,Department,Section,Session,Course,Recovery Email\nTest Student,f2026-601,CS,A,   ,PBL,test@example.com\n"
    response = client.post("/api/manager/students/bulk", data={"file": (BytesIO(contents), "students.csv")},
                           content_type="multipart/form-data", headers=manager_headers)
    assert response.status_code == 200, response.get_json()
    assert response.get_json()["data"]["imported"] == 0
    assert response.get_json()["data"]["errors"]


def test_bulk_uppercase_roll_cannot_duplicate_existing_identity(client, manager_headers, student):
    contents = b"Name,Roll,Department,Section,Session,Course,Recovery Email\nChanged Name,F2026-551,cs,A,2026,PBL,test@example.com\n"
    response = client.post("/api/manager/students/bulk", data={"file": (BytesIO(contents), "students.csv")},
                           content_type="multipart/form-data", headers=manager_headers)
    assert response.status_code == 200, response.get_json()
    assert response.get_json()["data"]["imported"] == 0
    assert response.get_json()["data"]["skipped"] == 1
    assert mongo.db.users.count_documents({"role": "student"}) == 1
    assert mongo.db.users.find_one({"_id": student["_id"]})["name"] == student["name"]


def test_nested_iteration_reference_serialization(client, manager_headers):
    template_id = ObjectId()
    mongo.db.iterations.insert_one({"title": "Task", "course": "All Courses", "deadline": "2026-10-10",
                                    "rubric_template_id": template_id, "metadata": {"date": datetime.now(timezone.utc)}})
    response = client.get("/api/manager/iterations", headers=manager_headers)
    assert response.status_code == 200, response.get_json()
    assert response.get_json()["data"][0]["rubric_template_id"] == str(template_id)
    assert isinstance(response.get_json()["data"][0]["metadata"]["date"], str)


def test_empty_sprint_get_never_writes(client, manager_headers):
    for suffix in ("", "?course=Missing Course", ""):
        response = client.get(f"/api/manager/sprints{suffix}", headers=manager_headers)
        assert response.status_code == 200, response.get_json()
        assert response.get_json()["data"] == []
        assert mongo.db.sprints.count_documents({}) == 0


def test_sprint_with_milestone_cannot_be_deleted(client, manager_headers):
    oid = mongo.db.sprints.insert_one({"name": "Sprint", "deleted": False}).inserted_id
    mongo.db.iterations.insert_one({"sprint_name": "Sprint", "title": "Milestone"})
    response = client.delete(f"/api/manager/sprints/{oid}", headers=manager_headers)
    assert response.status_code == 409, response.get_json()
    assert mongo.db.sprints.find_one({"_id": oid})["deleted"] is False


def test_last_empty_sprint_stays_deleted(client, manager_headers):
    oid = mongo.db.sprints.insert_one({"name": "Sprint", "deleted": False}).inserted_id
    assert client.delete(f"/api/manager/sprints/{oid}", headers=manager_headers).status_code == 200
    assert client.get("/api/manager/sprints", headers=manager_headers).get_json()["data"] == []
    assert mongo.db.sprints.count_documents({"deleted": {"$ne": True}}) == 0
