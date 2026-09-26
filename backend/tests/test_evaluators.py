"""Exhibition Evaluator CRUD API contract tests."""

EVALUATORS_URL = "/api/manager/evaluators/"


def create_evaluator(
    client,
    manager_headers,
    email="test.evaluator@techvista.com",
    name="Test Evaluator",
    dept="CS",
    evaluator_type="external",
    domains=None,
):
    payload = {
        "name": name,
        "email": email,
        "dept": dept,
        "evaluator_type": evaluator_type,
    }
    if domains:
        payload["domains"] = domains
    response = client.post(
        EVALUATORS_URL,
        json=payload,
        headers=manager_headers,
    )
    assert response.status_code == 201, response.get_json()
    return response.get_json()["data"]


def test_create_evaluator_returns_created_record(client, manager_headers):
    evaluator = create_evaluator(client, manager_headers, evaluator_type="external")
    assert evaluator["name"] == "Test Evaluator"
    assert evaluator["email"] == "test.evaluator@techvista.com"
    assert evaluator["dept"] == "CS"
    assert evaluator["evaluator_type"] == "external"
    assert evaluator["role"] == "evaluator"
    assert "id" in evaluator
    assert "initial_password" in evaluator


def test_create_evaluator_rejects_invalid_type(client, manager_headers):
    response = client.post(
        EVALUATORS_URL,
        json={
            "name": "Bad Type",
            "email": "bad.eval@techvista.com",
            "dept": "CS",
            "evaluator_type": "freelancer",
        },
        headers=manager_headers,
    )
    assert response.status_code == 422, response.get_json()


def test_create_evaluator_rejects_duplicate_email(client, manager_headers):
    create_evaluator(client, manager_headers, email="dup.eval@techvista.com")
    response = client.post(
        EVALUATORS_URL,
        json={
            "name": "Duplicate Evaluator",
            "email": "dup.eval@techvista.com",
            "dept": "CS",
            "evaluator_type": "internal",
        },
        headers=manager_headers,
    )
    assert response.status_code == 409, response.get_json()
    assert "already exists" in response.get_json()["message"]


def test_list_evaluators_filters_by_type(client, manager_headers):
    create_evaluator(client, manager_headers, email="ext.eval@techvista.com", evaluator_type="external")
    create_evaluator(client, manager_headers, email="int.eval@bnu.edu.pk", evaluator_type="internal")

    res_ext = client.get(f"{EVALUATORS_URL}?evaluator_type=external", headers=manager_headers)
    assert res_ext.status_code == 200
    items_ext = res_ext.get_json()["data"]["items"]
    assert any(i["email"] == "ext.eval@techvista.com" for i in items_ext)
    assert not any(i["email"] == "int.eval@bnu.edu.pk" for i in items_ext)


def test_soft_delete_and_restore_evaluator(client, manager_headers):
    evaluator = create_evaluator(client, manager_headers, email="softdel.eval@techvista.com")
    eval_id = evaluator["id"]

    del_res = client.delete(f"{EVALUATORS_URL}{eval_id}", headers=manager_headers)
    assert del_res.status_code == 200

    trash_res = client.get(f"{EVALUATORS_URL}?deleted=true", headers=manager_headers)
    assert any(i["id"] == eval_id for i in trash_res.get_json()["data"]["items"])

    restore_res = client.post(f"{EVALUATORS_URL}{eval_id}/restore", headers=manager_headers)
    assert restore_res.status_code == 200

    active_res = client.get(EVALUATORS_URL, headers=manager_headers)
    assert any(i["id"] == eval_id for i in active_res.get_json()["data"]["items"])
