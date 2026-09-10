"""Teacher/Evaluator CRUD API contract tests."""

TEACHERS_URL = "/api/manager/teachers/"


def create_teacher(
    client,
    manager_headers,
    email="test.evaluator@bnu.edu.pk",
    name="Test Evaluator",
    dept="SE",
    type_="Internal Faculty",
):
    response = client.post(
        TEACHERS_URL,
        json={"name": name, "email": email, "dept": dept, "type": type_},
        headers=manager_headers,
    )
    assert response.status_code == 201, response.get_json()
    return response.get_json()["data"]


def test_create_teacher_returns_created_record(client, manager_headers):
    teacher = create_teacher(client, manager_headers)
    assert teacher["name"] == "Test Evaluator"
    assert teacher["email"] == "test.evaluator@bnu.edu.pk"
    assert teacher["dept"] == "SE"
    assert teacher["type"] == "Internal Faculty"
    assert teacher["role"] == "evaluator"
    assert "id" in teacher
    assert "initial_password" in teacher
    assert "password_hash" not in teacher


def test_create_teacher_rejects_invalid_type(client, manager_headers):
    response = client.post(
        TEACHERS_URL,
        json={
            "name": "Bad Type",
            "email": "bad.type@bnu.edu.pk",
            "dept": "SE",
            "type": "Freelancer",
        },
        headers=manager_headers,
    )
    assert response.status_code == 422, response.get_json()


def test_create_teacher_rejects_duplicate_email(client, manager_headers):
    create_teacher(client, manager_headers, email="dup.evaluator@bnu.edu.pk")
    response = client.post(
        TEACHERS_URL,
        json={
            "name": "Duplicate Evaluator",
            "email": "dup.evaluator@bnu.edu.pk",
            "dept": "CS",
            "type": "External Industry",
        },
        headers=manager_headers,
    )
    assert response.status_code == 409, response.get_json()
    assert "already exists" in response.get_json()["message"]


def test_list_teachers_returns_created_items(client, manager_headers):
    create_teacher(client, manager_headers, email="list.evaluator@bnu.edu.pk", dept="EE")
    response = client.get(TEACHERS_URL, headers=manager_headers)
    assert response.status_code == 200, response.get_json()
    data = response.get_json()["data"]
    assert "items" in data
    assert data["total"] >= 1
    assert any(item["email"] == "list.evaluator@bnu.edu.pk" for item in data["items"])


def test_list_teachers_filters_by_dept(client, manager_headers):
    create_teacher(client, manager_headers, email="dept.filter@bnu.edu.pk", dept="ME")
    response = client.get(f"{TEACHERS_URL}?dept=ME", headers=manager_headers)
    assert response.status_code == 200, response.get_json()
    items = response.get_json()["data"]["items"]
    assert all(item["dept"] == "ME" for item in items)
    assert any(item["email"] == "dept.filter@bnu.edu.pk" for item in items)


def test_get_teacher_by_id(client, manager_headers):
    teacher = create_teacher(client, manager_headers, email="getbyid.evaluator@bnu.edu.pk")
    response = client.get(f"{TEACHERS_URL}{teacher['id']}", headers=manager_headers)
    assert response.status_code == 200, response.get_json()
    assert response.get_json()["data"]["email"] == "getbyid.evaluator@bnu.edu.pk"
    assert "password_hash" not in response.get_json()["data"]


def test_get_missing_teacher_returns_404(client, manager_headers):
    response = client.get(f"{TEACHERS_URL}64b64c8f0e2b2c3d4e5f6789", headers=manager_headers)
    assert response.status_code == 404, response.get_json()


def test_get_teacher_with_malformed_id_returns_404(client, manager_headers):
    """A malformed ObjectId should return 404, not a 500."""
    response = client.get(f"{TEACHERS_URL}not-a-valid-object-id", headers=manager_headers)
    assert response.status_code == 404, response.get_json()


def test_update_teacher(client, manager_headers):
    teacher = create_teacher(client, manager_headers, email="update.evaluator@bnu.edu.pk", dept="SE")
    response = client.put(
        f"{TEACHERS_URL}{teacher['id']}",
        json={"dept": "CS"},
        headers=manager_headers,
    )
    assert response.status_code == 200, response.get_json()
    assert response.get_json()["data"]["dept"] == "CS"
    assert response.get_json()["data"]["name"] == "Test Evaluator"

    fetched = client.get(f"{TEACHERS_URL}{teacher['id']}", headers=manager_headers).get_json()["data"]
    assert fetched["dept"] == "CS"


def test_update_teacher_rejects_email_change(client, manager_headers):
    teacher = create_teacher(client, manager_headers, email="noemailchange@bnu.edu.pk")
    response = client.put(
        f"{TEACHERS_URL}{teacher['id']}",
        json={"email": "new.email@bnu.edu.pk"},
        headers=manager_headers,
    )
    assert response.status_code == 422, response.get_json()


def test_soft_delete_then_restore_teacher(client, manager_headers):
    teacher = create_teacher(client, manager_headers, email="softdelete.evaluator@bnu.edu.pk")
    teacher_url = f"{TEACHERS_URL}{teacher['id']}"

    deleted = client.delete(teacher_url, headers=manager_headers)
    assert deleted.status_code == 200, deleted.get_json()
    assert deleted.get_json()["data"]["deleted"] is True

    deleted_list = client.get(f"{TEACHERS_URL}?deleted=true", headers=manager_headers).get_json()["data"]
    assert any(item["id"] == teacher["id"] for item in deleted_list["items"])

    restored = client.post(f"{teacher_url}/restore", headers=manager_headers)
    assert restored.status_code == 200, restored.get_json()
    assert restored.get_json()["data"]["restored"] is True

    active_list = client.get(TEACHERS_URL, headers=manager_headers).get_json()["data"]
    assert any(item["id"] == teacher["id"] for item in active_list["items"])


def test_permanent_delete_requires_soft_delete_first(client, manager_headers):
    teacher = create_teacher(client, manager_headers, email="permanentdelete.evaluator@bnu.edu.pk")
    teacher_url = f"{TEACHERS_URL}{teacher['id']}"

    response = client.delete(f"{teacher_url}/permanent", headers=manager_headers)
    assert response.status_code == 404, response.get_json()

    client.delete(teacher_url, headers=manager_headers)
    response = client.delete(f"{teacher_url}/permanent", headers=manager_headers)
    assert response.status_code == 200, response.get_json()

    fetch = client.get(teacher_url, headers=manager_headers)
    assert fetch.status_code == 404


def test_teacher_endpoints_require_manager_role(client):
    """Every teacher endpoint should reject requests without a valid manager token."""
    endpoints = [
        ("GET", TEACHERS_URL, None),
        ("POST", TEACHERS_URL, {"name": "Test", "email": "noauth@bnu.edu.pk", "dept": "SE", "type": "Internal Faculty"}),
        ("GET", f"{TEACHERS_URL}64b64c8f0e2b2c3d4e5f6789", None),
        ("PUT", f"{TEACHERS_URL}64b64c8f0e2b2c3d4e5f6789", {"dept": "SE"}),
        ("DELETE", f"{TEACHERS_URL}64b64c8f0e2b2c3d4e5f6789", None),
        ("POST", f"{TEACHERS_URL}64b64c8f0e2b2c3d4e5f6789/restore", None),
        ("DELETE", f"{TEACHERS_URL}64b64c8f0e2b2c3d4e5f6789/permanent", None),
    ]
    for method, url, payload in endpoints:
        response = client.open(url, method=method, json=payload)
        assert response.status_code in (401, 403), f"{method} {url} returned {response.status_code}"