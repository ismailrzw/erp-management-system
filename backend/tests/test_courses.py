"""Course CRUD API contract tests."""
from app.extensions import mongo
from app.models import group as group_model

COURSES_URL = "/api/manager/courses/"
DEPARTMENTS_URL = "/api/manager/departments/"


def create_department(client, manager_headers, code="SE", name="Software Engineering"):
    response = client.post(
        DEPARTMENTS_URL,
        json={"name": name, "code": code},
        headers=manager_headers,
    )
    assert response.status_code == 201, response.get_json()
    return response.get_json()["data"]


def create_course(
    client, manager_headers, name="Final Year Project - Fall 2025", dept="SE",
    min_group=2, max_group=5, deadline="2026-08-15",
):
    response = client.post(
        COURSES_URL,
        json={"name": name, "dept": dept, "min_group": min_group, "max_group": max_group, "deadline": deadline},
        headers=manager_headers,
    )
    assert response.status_code == 201, response.get_json()
    return response.get_json()["data"]


def test_create_course_returns_created_record(client, manager_headers):
    create_department(client, manager_headers)
    course = create_course(client, manager_headers)
    assert course["name"] == "Final Year Project - Fall 2025"
    assert course["dept"] == "SE"
    assert course["min_group"] == 2
    assert course["max_group"] == 5
    assert course["deadline"] == "2026-08-15"
    assert "id" in course


def test_create_course_rejects_unknown_department(client, manager_headers):
    response = client.post(
        COURSES_URL,
        json={"name": "Ghost Course", "dept": "ZZ", "min_group": 2, "max_group": 5, "deadline": "2026-08-15"},
        headers=manager_headers,
    )
    assert response.status_code == 409, response.get_json()
    assert "No active department" in response.get_json()["message"]


def test_create_course_rejects_duplicate_name(client, manager_headers):
    create_department(client, manager_headers)
    create_course(client, manager_headers, name="Duplicate FYP")
    response = client.post(
        COURSES_URL,
        json={"name": "Duplicate FYP", "dept": "SE", "min_group": 2, "max_group": 5, "deadline": "2026-08-15"},
        headers=manager_headers,
    )
    assert response.status_code == 409, response.get_json()
    assert "already exists" in response.get_json()["message"]


def test_create_course_rejects_max_group_below_min_group(client, manager_headers):
    create_department(client, manager_headers)
    response = client.post(
        COURSES_URL,
        json={"name": "Bad Sizing", "dept": "SE", "min_group": 5, "max_group": 2, "deadline": "2026-08-15"},
        headers=manager_headers,
    )
    assert response.status_code == 422, response.get_json()


def test_create_course_rejects_min_group_below_one(client, manager_headers):
    create_department(client, manager_headers)
    response = client.post(
        COURSES_URL,
        json={"name": "Bad Min", "dept": "SE", "min_group": 0, "max_group": 3, "deadline": "2026-08-15"},
        headers=manager_headers,
    )
    assert response.status_code == 422, response.get_json()


def test_create_course_rejects_invalid_deadline_format(client, manager_headers):
    create_department(client, manager_headers)
    response = client.post(
        COURSES_URL,
        json={"name": "Bad Deadline", "dept": "SE", "min_group": 2, "max_group": 5, "deadline": "15-08-2026"},
        headers=manager_headers,
    )
    assert response.status_code == 422, response.get_json()


def test_list_courses_returns_created_items(client, manager_headers):
    create_department(client, manager_headers)
    create_course(client, manager_headers, name="Listed Course")
    response = client.get(COURSES_URL, headers=manager_headers)
    assert response.status_code == 200, response.get_json()
    data = response.get_json()["data"]
    assert "items" in data
    assert data["total"] >= 1
    assert any(item["name"] == "Listed Course" for item in data["items"])


def test_list_courses_filters_by_dept(client, manager_headers):
    create_department(client, manager_headers, code="SE", name="Software Engineering")
    create_department(client, manager_headers, code="CS", name="Computer Science")
    create_course(client, manager_headers, name="SE Course", dept="SE")
    create_course(client, manager_headers, name="CS Course", dept="CS")

    response = client.get(f"{COURSES_URL}?dept=CS", headers=manager_headers)
    assert response.status_code == 200, response.get_json()
    items = response.get_json()["data"]["items"]
    assert all(item["dept"] == "CS" for item in items)
    assert any(item["name"] == "CS Course" for item in items)


def test_get_course_by_id(client, manager_headers):
    create_department(client, manager_headers)
    course = create_course(client, manager_headers, name="Fetchable Course")
    response = client.get(f"{COURSES_URL}{course['id']}", headers=manager_headers)
    assert response.status_code == 200, response.get_json()
    assert response.get_json()["data"]["name"] == "Fetchable Course"


def test_get_missing_course_returns_404(client, manager_headers):
    response = client.get(f"{COURSES_URL}64b64c8f0e2b2c3d4e5f6789", headers=manager_headers)
    assert response.status_code == 404, response.get_json()


def test_update_course(client, manager_headers):
    create_department(client, manager_headers)
    course = create_course(client, manager_headers, name="Old Name")
    response = client.put(
        f"{COURSES_URL}{course['id']}",
        json={"name": "New Name", "max_group": 6},
        headers=manager_headers,
    )
    assert response.status_code == 200, response.get_json()
    assert response.get_json()["data"]["name"] == "New Name"
    assert response.get_json()["data"]["max_group"] == 6

    fetched = client.get(f"{COURSES_URL}{course['id']}", headers=manager_headers).get_json()["data"]
    assert fetched["name"] == "New Name"
    assert fetched["min_group"] == 2


def test_update_course_rejects_max_group_below_existing_min_group(client, manager_headers):
    create_department(client, manager_headers)
    course = create_course(client, manager_headers, min_group=3, max_group=5)
    response = client.put(
        f"{COURSES_URL}{course['id']}",
        json={"max_group": 2},
        headers=manager_headers,
    )
    assert response.status_code == 409, response.get_json()


def test_update_course_rejects_unknown_department(client, manager_headers):
    create_department(client, manager_headers)
    course = create_course(client, manager_headers)
    response = client.put(
        f"{COURSES_URL}{course['id']}",
        json={"dept": "ZZ"},
        headers=manager_headers,
    )
    assert response.status_code == 409, response.get_json()


def test_soft_delete_then_restore_course(client, manager_headers):
    create_department(client, manager_headers)
    course = create_course(client, manager_headers, name="Deletable Course")
    course_url = f"{COURSES_URL}{course['id']}"

    deleted = client.delete(course_url, headers=manager_headers)
    assert deleted.status_code == 200, deleted.get_json()
    assert deleted.get_json()["data"]["deleted"] is True

    deleted_list = client.get(f"{COURSES_URL}?deleted=true", headers=manager_headers).get_json()["data"]
    assert any(item["id"] == course["id"] for item in deleted_list["items"])

    restored = client.post(f"{course_url}/restore", headers=manager_headers)
    assert restored.status_code == 200, restored.get_json()
    assert restored.get_json()["data"]["restored"] is True

    active_list = client.get(COURSES_URL, headers=manager_headers).get_json()["data"]
    assert any(item["id"] == course["id"] for item in active_list["items"])


def test_cannot_delete_course_with_active_groups(client, manager_headers, app):
    create_department(client, manager_headers)
    course = create_course(client, manager_headers, name="Course With Groups")

    with app.app_context():
        mongo.db[group_model.COLLECTION].insert_one({
            group_model.Field.NAME: "Group A",
            group_model.Field.COURSE: "Course With Groups",
            group_model.Field.STATUS: group_model.Status.PENDING,
        })

    response = client.delete(f"{COURSES_URL}{course['id']}", headers=manager_headers)
    assert response.status_code == 409, response.get_json()
    assert "active groups" in response.get_json()["message"]


def test_can_delete_course_once_groups_are_removed(client, manager_headers, app):
    create_department(client, manager_headers)
    course = create_course(client, manager_headers, name="Course Without Groups")

    with app.app_context():
        mongo.db[group_model.COLLECTION].insert_one({
            group_model.Field.NAME: "Group B",
            group_model.Field.COURSE: "Course Without Groups",
            group_model.Field.STATUS: group_model.Status.DELETED,
        })

    response = client.delete(f"{COURSES_URL}{course['id']}", headers=manager_headers)
    assert response.status_code == 200, response.get_json()


def test_permanent_delete_requires_soft_delete_first(client, manager_headers):
    create_department(client, manager_headers)
    course = create_course(client, manager_headers, name="Permanent Delete Course")
    course_url = f"{COURSES_URL}{course['id']}"

    response = client.delete(f"{course_url}/permanent", headers=manager_headers)
    assert response.status_code == 400, response.get_json()

    client.delete(course_url, headers=manager_headers)
    response = client.delete(f"{course_url}/permanent", headers=manager_headers)
    assert response.status_code == 200, response.get_json()

    fetch = client.get(course_url, headers=manager_headers)
    assert fetch.status_code == 404


def test_course_endpoints_require_manager_role(client):
    """Every course endpoint should reject requests without a valid manager token."""
    endpoints = [
        ("GET", COURSES_URL, None),
        ("POST", COURSES_URL, {"name": "Test", "dept": "SE", "min_group": 1, "max_group": 2, "deadline": "2026-08-15"}),
        ("GET", f"{COURSES_URL}64b64c8f0e2b2c3d4e5f6789", None),
        ("PUT", f"{COURSES_URL}64b64c8f0e2b2c3d4e5f6789", {"name": "Test"}),
        ("DELETE", f"{COURSES_URL}64b64c8f0e2b2c3d4e5f6789", None),
        ("POST", f"{COURSES_URL}64b64c8f0e2b2c3d4e5f6789/restore", None),
    ]
    for method, url, payload in endpoints:
        response = client.open(url, method=method, json=payload)
        assert response.status_code in (401, 403), f"{method} {url} returned {response.status_code}"