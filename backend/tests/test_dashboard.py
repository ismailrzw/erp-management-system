from test_students import create_student

DASHBOARD_URL = "/api/manager/dashboard/"
EXPECTED_KEYS = {"total_students", "total_evaluators", "total_groups", "pending_groups", "total_groups_evaluated", "groups_remaining_evaluation", "students_without_group", "announcements", "attachments"}


def test_dashboard_returns_complete_stats_shape(client, manager_headers):
    response = client.get(DASHBOARD_URL, headers=manager_headers)
    assert response.status_code == 200, response.get_json()
    data = response.get_json()["data"]
    assert EXPECTED_KEYS <= data.keys()
    assert data["announcements"] == []
    assert data["attachments"] == []


def test_dashboard_student_counts_are_accurate(client, manager_headers):
    create_student(client, manager_headers, "2024-CS-301")
    create_student(client, manager_headers, "2024-CS-302")
    response = client.get(DASHBOARD_URL, headers=manager_headers)
    assert response.status_code == 200, response.get_json()
    data = response.get_json()["data"]
    assert data["total_students"] == 2
    assert data["students_without_group"] == 2
    assert data["total_evaluators"] == 0
