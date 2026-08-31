import pytest

STUDENTS_URL = "/api/manager/students/"


def student_payload(roll="2024-CS-001"):
    return {"name": "Ada Lovelace", "roll": roll, "dept": "CS", "section": "A", "session": "2024", "course": "PBL", "teacher": "Dr. Turing", "recovery_email": "ada@example.com"}


def create_student(client, manager_headers, roll="2024-CS-001"):
    response = client.post(STUDENTS_URL, json=student_payload(roll), headers=manager_headers)
    assert response.status_code == 201, response.get_json()
    return response.get_json()["data"]


def test_create_student_returns_generated_credentials(client, manager_headers):
    data = create_student(client, manager_headers)
    assert data["student_id"]
    assert data["email"] == "2024-CS-001@bnu.edu.pk"
    assert data["password"].startswith("BNU@2024-CS-")


def test_create_student_rejects_duplicate_roll(client, manager_headers):
    create_student(client, manager_headers)
    response = client.post(STUDENTS_URL, json=student_payload(), headers=manager_headers)
    assert response.status_code == 409, response.get_json()
    assert "already exists" in response.get_json()["message"]


def test_list_students_returns_paginated_structure(client, manager_headers):
    create_student(client, manager_headers)
    response = client.get(STUDENTS_URL, headers=manager_headers)
    assert response.status_code == 200, response.get_json()
    data = response.get_json()["data"]
    assert {"items", "total", "page", "limit", "pages"} <= data.keys()
    assert data["total"] == 1
    assert data["items"][0]["roll"] == "2024-CS-001"
    assert "password_hash" not in data["items"][0]


def test_get_student_by_id(client, manager_headers):
    student = create_student(client, manager_headers)
    response = client.get(f"{STUDENTS_URL}{student['student_id']}", headers=manager_headers)
    assert response.status_code == 200, response.get_json()
    assert response.get_json()["data"]["id"] == student["student_id"]


def test_get_missing_student_returns_404(client, manager_headers):
    response = client.get(f"{STUDENTS_URL}64b64c8f0e2b2c3d4e5f6789", headers=manager_headers)
    assert response.status_code == 404, response.get_json()


def test_update_student(client, manager_headers):
    student = create_student(client, manager_headers)
    response = client.put(f"{STUDENTS_URL}{student['student_id']}", json={"name": "Grace Hopper", "section": "B"}, headers=manager_headers)
    assert response.status_code == 200, response.get_json()
    assert response.get_json()["data"]["updated"] is True
    fetched = client.get(f"{STUDENTS_URL}{student['student_id']}", headers=manager_headers).get_json()["data"]
    assert fetched["name"] == "Grace Hopper"
    assert fetched["section"] == "B"


def test_soft_delete_then_restore_student(client, manager_headers):
    student = create_student(client, manager_headers)
    student_url = f"{STUDENTS_URL}{student['student_id']}"
    deleted = client.delete(student_url, headers=manager_headers)
    assert deleted.status_code == 200, deleted.get_json()
    assert deleted.get_json()["data"]["deleted"] is True
    deleted_list = client.get(f"{STUDENTS_URL}?deleted=true", headers=manager_headers).get_json()["data"]
    assert deleted_list["items"][0]["deleted"] is True
    restored = client.post(f"{student_url}/restore", headers=manager_headers)
    assert restored.status_code == 200, restored.get_json()
    assert restored.get_json()["data"]["restored"] is True
    assert client.get(student_url, headers=manager_headers).get_json()["data"]["deleted"] is False


@pytest.mark.parametrize("method,path,json", [
    ("GET", STUDENTS_URL, None), ("POST", STUDENTS_URL, student_payload("2024-CS-100")),
    ("GET", f"{STUDENTS_URL}64b64c8f0e2b2c3d4e5f6789", None),
    ("PUT", f"{STUDENTS_URL}64b64c8f0e2b2c3d4e5f6789", {"name": "Blocked"}),
    ("DELETE", f"{STUDENTS_URL}64b64c8f0e2b2c3d4e5f6789", None),
    ("POST", f"{STUDENTS_URL}64b64c8f0e2b2c3d4e5f6789/restore", None),
])
def test_student_endpoints_require_manager_role(client, student_headers, method, path, json):
    unauthenticated = client.open(path, method=method, json=json)
    assert unauthenticated.status_code == 401, unauthenticated.get_json()
    forbidden = client.open(path, method=method, json=json, headers=student_headers)
    assert forbidden.status_code == 403, forbidden.get_json()
