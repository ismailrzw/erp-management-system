"""Department CRUD API contract tests."""

DEPARTMENTS_URL = "/api/manager/departments/"


def create_department(client, manager_headers, code="SE", name="Software Engineering"):
    response = client.post(
        DEPARTMENTS_URL,
        json={"name": name, "code": code},
        headers=manager_headers,
    )
    assert response.status_code == 201, response.get_json()
    return response.get_json()["data"]


def test_create_department_returns_created_record(client, manager_headers):
    department = create_department(client, manager_headers)
    assert department["name"] == "Software Engineering"
    assert department["code"] == "SE"
    assert "id" in department


def test_create_department_rejects_duplicate_code(client, manager_headers):
    create_department(client, manager_headers, code="CS", name="Computer Science")
    response = client.post(
        DEPARTMENTS_URL,
        json={"name": "Computer Science Duplicate", "code": "CS"},
        headers=manager_headers,
    )
    assert response.status_code == 409, response.get_json()
    assert "already exists" in response.get_json()["message"]


def test_list_departments_returns_created_items(client, manager_headers):
    create_department(client, manager_headers, code="EE", name="Electrical Engineering")
    response = client.get(DEPARTMENTS_URL, headers=manager_headers)
    assert response.status_code == 200, response.get_json()
    data = response.get_json()["data"]
    assert "items" in data
    assert data["total"] >= 1
    assert any(item["code"] == "EE" for item in data["items"])


def test_get_department_by_id(client, manager_headers):
    department = create_department(client, manager_headers, code="ME", name="Mechanical Engineering")
    response = client.get(f"{DEPARTMENTS_URL}{department['id']}", headers=manager_headers)
    assert response.status_code == 200, response.get_json()
    assert response.get_json()["data"]["code"] == "ME"


def test_get_missing_department_returns_404(client, manager_headers):
    response = client.get(f"{DEPARTMENTS_URL}64b64c8f0e2b2c3d4e5f6789", headers=manager_headers)
    assert response.status_code == 404, response.get_json()


def test_update_department(client, manager_headers):
    department = create_department(client, manager_headers, code="BBA", name="Business Admin")
    response = client.put(
        f"{DEPARTMENTS_URL}{department['id']}",
        json={"name": "Business Administration"},
        headers=manager_headers,
    )
    assert response.status_code == 200, response.get_json()
    assert response.get_json()["data"]["name"] == "Business Administration"

    fetched = client.get(f"{DEPARTMENTS_URL}{department['id']}", headers=manager_headers).get_json()["data"]
    assert fetched["name"] == "Business Administration"


def test_update_department_rejects_duplicate_code(client, manager_headers):
    create_department(client, manager_headers, code="CIV", name="Civil Engineering")
    other = create_department(client, manager_headers, code="ARC", name="Architecture")
    response = client.put(
        f"{DEPARTMENTS_URL}{other['id']}",
        json={"code": "CIV"},
        headers=manager_headers,
    )
    assert response.status_code == 409, response.get_json()


def test_soft_delete_then_restore_department(client, manager_headers):
    department = create_department(client, manager_headers, code="ENG", name="English")
    department_url = f"{DEPARTMENTS_URL}{department['id']}"

    deleted = client.delete(department_url, headers=manager_headers)
    assert deleted.status_code == 200, deleted.get_json()
    assert deleted.get_json()["data"]["deleted"] is True

    deleted_list = client.get(f"{DEPARTMENTS_URL}?deleted=true", headers=manager_headers).get_json()["data"]
    assert any(item["id"] == department["id"] for item in deleted_list["items"])

    restored = client.post(f"{department_url}/restore", headers=manager_headers)
    assert restored.status_code == 200, restored.get_json()
    assert restored.get_json()["data"]["restored"] is True

    active_list = client.get(DEPARTMENTS_URL, headers=manager_headers).get_json()["data"]
    assert any(item["id"] == department["id"] for item in active_list["items"])


def test_permanent_delete_requires_soft_delete_first(client, manager_headers):
    department = create_department(client, manager_headers, code="LAW", name="Law")
    department_url = f"{DEPARTMENTS_URL}{department['id']}"

    response = client.delete(f"{department_url}/permanent", headers=manager_headers)
    assert response.status_code == 400, response.get_json()

    client.delete(department_url, headers=manager_headers)
    response = client.delete(f"{department_url}/permanent", headers=manager_headers)
    assert response.status_code == 200, response.get_json()

    fetch = client.get(department_url, headers=manager_headers)
    assert fetch.status_code == 404


def test_department_endpoints_require_manager_role(client):
    """Every department endpoint should reject requests without a valid manager token."""
    endpoints = [
        ("GET", DEPARTMENTS_URL, None),
        ("POST", DEPARTMENTS_URL, {"name": "Test", "code": "TS"}),
        ("GET", f"{DEPARTMENTS_URL}64b64c8f0e2b2c3d4e5f6789", None),
        ("PUT", f"{DEPARTMENTS_URL}64b64c8f0e2b2c3d4e5f6789", {"name": "Test"}),
        ("DELETE", f"{DEPARTMENTS_URL}64b64c8f0e2b2c3d4e5f6789", None),
        ("POST", f"{DEPARTMENTS_URL}64b64c8f0e2b2c3d4e5f6789/restore", None),
    ]
    for method, url, payload in endpoints:
        response = client.open(url, method=method, json=payload)
        assert response.status_code in (401, 403), f"{method} {url} returned {response.status_code}"