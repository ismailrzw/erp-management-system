# backend/tests/test_submissions.py
import io
import os
import sys
import bcrypt
import pytest
from bson import ObjectId

from app import create_app
from app.extensions import mongo

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    app.config["MONGO_URI"] = "mongodb://localhost:27017/pbl_test"

    with app.test_client() as client:
        with app.app_context():
            for collection in mongo.db.list_collection_names():
                mongo.db[collection].drop()

            password = "11223344"
            hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

            # 1. Create Student User in approved group
            student_id = mongo.db.users.insert_one({
                "name": "Muhammad Ismail",
                "email": "student1@bnu.edu.pk",
                "password_hash": hashed,
                "role": "student",
                "course": "Final Year Project - Fall 2025",
                "section": "A",
                "dept": "SE",
                "deleted": False
            }).inserted_id

            # 2. Create Student User NOT in a group
            mongo.db.users.insert_one({
                "name": "No Group Student",
                "email": "student2@bnu.edu.pk",
                "password_hash": hashed,
                "role": "student",
                "course": "Final Year Project - Fall 2025",
                "section": "A",
                "dept": "SE",
                "deleted": False
            })

            # 3. Create Approved Group
            group_id = mongo.db.groups.insert_one({
                "name": "Alpha Team",
                "course": "Final Year Project - Fall 2025",
                "section": "A",
                "dept": "SE",
                "leader_id": student_id,
                "member_ids": [student_id],
                "status": "approved"
            }).inserted_id

            # 4. Create Iterations (one upcoming, one past deadline)
            mongo.db.iterations.insert_one({
                "title": "Proposal",
                "details": "Proposal submission",
                "course": "Final Year Project - Fall 2025",
                "deadline": "2099-12-31",
                "rubrics": []
            })

            mongo.db.iterations.insert_one({
                "title": "Past Iteration",
                "details": "Past submission",
                "course": "Final Year Project - Fall 2025",
                "deadline": "2020-01-01",
                "rubrics": []
            })

        yield client

def get_token(client, email):
    resp = client.post("/api/auth/login", json={"email": email, "password": "11223344"})
    return resp.get_json()["data"]["token"]

def test_student_submit_on_time(client):
    token = get_token(client, "student1@bnu.edu.pk")
    iterations_resp = client.get("/api/student/iterations", headers={"Authorization": f"Bearer {token}"})
    assert iterations_resp.status_code == 200
    iterations = iterations_resp.get_json()["data"]
    open_iteration = next(i for i in iterations if i["title"] == "Proposal")

    pdf_data = (io.BytesIO(b"%PDF-1.4 test file content"), "proposal.pdf")
    resp = client.post(
        f"/api/student/iterations/{open_iteration['_id']}/submit",
        data={"file": pdf_data, "note": "Initial submission"},
        content_type="multipart/form-data",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 201
    assert resp.get_json()["data"]["is_late"] is False

def test_student_submit_late_detection(client):
    token = get_token(client, "student1@bnu.edu.pk")
    iterations_resp = client.get("/api/student/iterations", headers={"Authorization": f"Bearer {token}"})
    iterations = iterations_resp.get_json()["data"]
    past_iteration = next(i for i in iterations if i["title"] == "Past Iteration")

    pdf_data = (io.BytesIO(b"%PDF-1.4 late test"), "late_proposal.pdf")
    resp = client.post(
        f"/api/student/iterations/{past_iteration['_id']}/submit",
        data={"file": pdf_data},
        content_type="multipart/form-data",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 201
    assert resp.get_json()["data"]["is_late"] is True

def test_student_without_approved_group_forbidden(client):
    token = get_token(client, "student2@bnu.edu.pk")
    iterations_resp = client.get("/api/student/iterations", headers={"Authorization": f"Bearer {token}"})
    iterations = iterations_resp.get_json()["data"]
    open_iteration = iterations[0]

    pdf_data = (io.BytesIO(b"%PDF-1.4 test"), "test.pdf")
    resp = client.post(
        f"/api/student/iterations/{open_iteration['_id']}/submit",
        data={"file": pdf_data},
        content_type="multipart/form-data",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 403
    assert "approved group" in resp.get_json()["message"]

def test_invalid_file_extension_rejected(client):
    token = get_token(client, "student1@bnu.edu.pk")
    iterations_resp = client.get("/api/student/iterations", headers={"Authorization": f"Bearer {token}"})
    open_iteration = iterations_resp.get_json()["data"][0]

    exe_data = (io.BytesIO(b"MZ executable data"), "script.exe")
    resp = client.post(
        f"/api/student/iterations/{open_iteration['_id']}/submit",
        data={"file": exe_data},
        content_type="multipart/form-data",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 400
    assert "not allowed" in resp.get_json()["message"]
