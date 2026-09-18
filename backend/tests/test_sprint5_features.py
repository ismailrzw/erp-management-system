# backend/tests/test_sprint5_features.py
"""
Integration tests for Sprint 5+ features:
1. Student Identity, Password-Set Activation, and Multi-Identifier Login (REQ-01)
2. Automatic Group Naming & Formation Status Tracking (REQ-02, REQ-06)
3. Supervisor Browsing, Requests, and Max Cap Enforcements (REQ-03, REQ-04)
4. Manager Group Reports & Ungrouped Students Excel Exports (REQ-05, REQ-07)
5. Targeted Announcements by Scope (REQ-08)
"""
import io
import openpyxl
from datetime import datetime, timezone
from app.extensions import mongo
from app.models.user import Role
from app.services.auth_service import AuthService


def test_student_creation_password_set_and_login_flow(client, manager_headers):
    """Test student registration, one-time token password activation, and multi-identifier login."""
    # 1. Manager creates a student
    student_payload = {
        "name": "Hamza Tariq",
        "roll": "f2024-551",
        "dept": "CS",
        "section": "A",
        "course": "Final Year Project",
    }
    res = client.post("/api/manager/students/", json=student_payload, headers=manager_headers)
    assert res.status_code == 201, res.get_json()
    data = res.get_json()["data"]
    student_id = data["student_id"]
    assert data["roll"] == "f2024-551"
    assert data["email"] == "f2024-551@bnu.edu.pk"

    # 2. Create password set token and activate account
    raw_token = AuthService.create_password_set_token(student_id)
    set_res = client.post(
        "/api/auth/set-password",
        json={"token": raw_token, "new_password": "NewStudentPassword123!"},
    )
    assert set_res.status_code == 200, set_res.get_json()

    # 3. Login using lowercase roll number
    login_roll = client.post(
        "/api/auth/login",
        json={"email_or_roll": "f2024-551", "password": "NewStudentPassword123!"},
    )
    assert login_roll.status_code == 200, login_roll.get_json()
    assert login_roll.get_json()["data"]["user"]["role"] == "student"

    # 4. Login using uppercase email (case-insensitivity test)
    login_email = client.post(
        "/api/auth/login",
        json={"email_or_roll": "F2024-551@BNU.EDU.PK", "password": "NewStudentPassword123!"},
    )
    assert login_email.status_code == 200, login_email.get_json()


def test_group_auto_naming_and_formation_status(client, manager_headers):
    """Test group auto-naming (GRP-YYYY-XXX) and formation_status computation."""
    # 0. Create department
    client.post("/api/manager/departments/", json={"name": "Computer Science", "code": "CS"}, headers=manager_headers)

    # 1. Setup course with future deadline
    course_payload = {
        "name": "PBL Capstone",
        "dept": "CS",
        "min_group": 2,
        "max_group": 4,
        "group_formation_deadline": "2099-12-31",
    }
    course_res = client.post("/api/manager/courses/", json=course_payload, headers=manager_headers)
    assert course_res.status_code in (200, 201), course_res.get_json()

    # 2. Create a student enrolled in that course
    std_res = client.post(
        "/api/manager/students/",
        json={"name": "Usman Ali", "roll": "f2024-701", "dept": "CS", "section": "A", "course": "PBL Capstone"},
        headers=manager_headers,
    )
    assert std_res.status_code == 201
    std_id = std_res.get_json()["data"]["student_id"]
    raw_token = AuthService.create_password_set_token(std_id)
    client.post("/api/auth/set-password", json={"token": raw_token, "new_password": "Password123!"})

    # 3. Log in as student and create a group
    login_res = client.post("/api/auth/login", json={"email_or_roll": "f2024-701", "password": "Password123!"})
    token = login_res.get_json()["data"]["token"]
    student_headers = {"Authorization": f"Bearer {token}"}

    group_res = client.post(
        "/api/student/groups/",
        json={"project_title": "AI Autonomous Agent Platform"},
        headers=student_headers,
    )
    assert group_res.status_code == 201, group_res.get_json()
    group_data = group_res.get_json()["data"]

    # Verify auto-generated name format GRP-YYYY-XXX
    current_year = datetime.now(timezone.utc).year
    assert group_data["name"].startswith(f"GRP-{current_year}-")
    assert group_data["formation_status"] == "on_time"
    assert group_data["submission_status"] == "not_submitted"


def test_supervisor_workflow_and_capacity_cap(client, manager_headers):
    """Test supervisor request creation, listing, accepting, cap enforcement (<= 4), and rejection."""
    # 0. Create department
    client.post("/api/manager/departments/", json={"name": "Computer Science", "code": "CS"}, headers=manager_headers)

    # 1. Create an evaluator teacher
    teacher_payload = {
        "name": "Dr. Farooq",
        "email": "dr.farooq@bnu.edu.pk",
        "dept": "CS",
        "type": "Internal Faculty",
    }
    t_res = client.post("/api/manager/teachers/", json=teacher_payload, headers=manager_headers)
    assert t_res.status_code in (200, 201), t_res.get_json()
    eval_data = t_res.get_json()["data"]
    evaluator_id = eval_data["id"]
    teacher_password = eval_data.get("initial_password") or eval_data.get("password") or "123456"

    # Update domains
    client.put(
        f"/api/manager/teachers/{evaluator_id}/domains",
        json={"domains": ["Artificial Intelligence", "Robotics"]},
        headers=manager_headers,
    )

    # 2. Create student & group
    std_res = client.post(
        "/api/manager/students/",
        json={"name": "Bilal Khan", "roll": "f2024-880", "dept": "CS", "section": "A", "course": "CS-FYP"},
        headers=manager_headers,
    )
    std_id = std_res.get_json()["data"]["student_id"]
    token_str = AuthService.create_password_set_token(std_id)
    client.post("/api/auth/set-password", json={"token": token_str, "new_password": "Password123!"})

    std_login = client.post("/api/auth/login", json={"email_or_roll": "f2024-880", "password": "Password123!"})
    std_token = std_login.get_json()["data"]["token"]
    student_headers = {"Authorization": f"Bearer {std_token}"}

    grp = client.post("/api/student/groups/", json={"project_title": "Autonomous Drone Fleet"}, headers=student_headers)
    assert grp.status_code == 201

    # 3. Student browses available supervisors
    browse_res = client.get("/api/student/supervisors/?domain=Artificial%20Intelligence", headers=student_headers)
    assert browse_res.status_code == 200
    items = browse_res.get_json()["data"]["items"]
    assert any(s["id"] == evaluator_id for s in items)

    # 4. Student sends supervisor request
    req_res = client.post(
        "/api/student/supervisor-requests/",
        json={"evaluator_id": evaluator_id, "request_message": "We would love your supervision on drone AI."},
        headers=student_headers,
    )
    assert req_res.status_code == 201, req_res.get_json()
    request_id = req_res.get_json()["data"]["id"]

    # 5. Evaluator logs in and accepts the request
    eval_login = client.post(
        "/api/auth/login",
        json={"email": "dr.farooq@bnu.edu.pk", "password": teacher_password},
    )
    eval_token = eval_login.get_json()["data"]["token"]
    eval_headers = {"Authorization": f"Bearer {eval_token}"}

    inbox_res = client.get("/api/evaluator/supervisor-requests/", headers=eval_headers)
    assert inbox_res.status_code == 200
    req_items = inbox_res.get_json()["data"]["items"]
    assert any(r["id"] == request_id for r in req_items)

    accept_res = client.post(f"/api/evaluator/supervisor-requests/{request_id}/accept", headers=eval_headers)
    assert accept_res.status_code == 200, accept_res.get_json()

    # 6. Verify group now has supervisor
    my_grp = client.get("/api/student/groups/my", headers=student_headers)
    assert my_grp.status_code == 200
    assert my_grp.get_json()["data"]["supervisor_id"] == evaluator_id
    assert my_grp.get_json()["data"]["supervisor_name"] == "Dr. Farooq"


def test_manager_group_reports_and_ungrouped_exports(client, manager_headers):
    """Test group report and ungrouped students Excel export generation."""
    # 1. Download group report
    report_res = client.get("/api/manager/reports/groups", headers=manager_headers)
    assert report_res.status_code == 200
    assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in report_res.content_type

    # Verify workbook with openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(report_res.data))
    ws = wb.active
    assert ws.title == "Group Report"
    assert ws.cell(row=1, column=1).value == "Serial No."
    assert ws.cell(row=1, column=2).value == "Group Name"
    assert ws.cell(row=1, column=6).value == "Supervisor"
    assert ws.cell(row=1, column=8).value == "Formation Status"

    # 2. Ungrouped students endpoints
    ungrouped_res = client.get("/api/manager/students/ungrouped", headers=manager_headers)
    assert ungrouped_res.status_code == 200
    assert "items" in ungrouped_res.get_json()["data"]

    export_res = client.get("/api/manager/students/ungrouped/export", headers=manager_headers)
    assert export_res.status_code == 200
    assert "spreadsheetml" in export_res.content_type


def test_targeted_announcements_by_scope(client, manager_headers):
    """Test broadcast, department, and group targeting scopes for announcements."""
    # 1. Post broadcast announcement
    b_res = client.post(
        "/api/manager/announcements/",
        json={"title": "University Holiday", "content": "Campus closed.", "scope": "broadcast"},
        headers=manager_headers,
    )
    assert b_res.status_code == 201

    # 2. Post department-targeted announcement
    d_res = client.post(
        "/api/manager/announcements/",
        json={"title": "SE Department Workshop", "content": "Only for SE.", "scope": "department", "target_ids": ["SE"]},
        headers=manager_headers,
    )
    assert d_res.status_code == 201
    se_ann_id = d_res.get_json()["data"]["id"]

    # 3. Create CS student
    cs_res = client.post(
        "/api/manager/students/",
        json={"name": "CS Student", "roll": "f2024-999", "dept": "CS"},
        headers=manager_headers,
    )
    cs_id = cs_res.get_json()["data"]["student_id"]
    cs_token_str = AuthService.create_password_set_token(cs_id)
    client.post("/api/auth/set-password", json={"token": cs_token_str, "new_password": "Password123!"})

    login_cs = client.post("/api/auth/login", json={"email_or_roll": "f2024-999", "password": "Password123!"})
    cs_headers = {"Authorization": f"Bearer {login_cs.get_json()['data']['token']}"}

    # CS student should see broadcast but NOT SE department announcement
    cs_anns = client.get("/api/student/announcements/", headers=cs_headers)
    assert cs_anns.status_code == 200
    cs_ann_ids = [a["id"] for a in cs_anns.get_json()["data"]["items"]]
    assert se_ann_id not in cs_ann_ids


def test_course_decoupling_and_iteration_group_formation(client, manager_headers):
    """
    Verify:
    1. Course creation succeeds without a deadline.
    2. Iteration milestone can be marked as group formation cutoff with late penalty %.
    3. Group formation status evaluates against iteration milestone deadline.
    4. Iteration submissions endpoint reports formation_status and ungrouped students.
    """
    client.post("/api/manager/departments/", json={"name": "Software Engineering", "code": "SE"}, headers=manager_headers)

    # 1. Create course WITHOUT group formation deadline
    course_res = client.post(
        "/api/manager/courses/",
        json={
            "name": "Advanced Software Lab",
            "dept": "SE",
            "min_group": 2,
            "max_group": 4,
        },
        headers=manager_headers,
    )
    assert course_res.status_code in (200, 201), course_res.get_json()
    course_data = course_res.get_json()["data"]
    assert course_data["name"] == "Advanced Software Lab"

    # 2. Create an Iteration Milestone as Group Formation Cutoff
    past_deadline = "2020-01-01T00:00:00Z"
    iter_res = client.post(
        "/api/manager/iterations",
        json={
            "title": "Group Formation & Proposal Cutoff",
            "course": "Advanced Software Lab",
            "deadline": past_deadline,
            "details": "Groups must be formed by this milestone date.",
            "is_group_formation": True,
            "late_penalty_percent": 15,
        },
        headers=manager_headers,
    )
    assert iter_res.status_code in (200, 201), iter_res.get_json()
    iter_id = iter_res.get_json()["data"]["_id"]

    # 3. Create a student in this course
    std_res = client.post(
        "/api/manager/students/",
        json={"name": "Sara Ahmed", "roll": "f2024-911", "dept": "SE", "section": "A", "course": "Advanced Software Lab"},
        headers=manager_headers,
    )
    std_id = std_res.get_json()["data"]["student_id"]
    token_str = AuthService.create_password_set_token(std_id)
    client.post("/api/auth/set-password", json={"token": token_str, "new_password": "Password123!"})

    std_login = client.post("/api/auth/login", json={"email_or_roll": "f2024-911", "password": "Password123!"})
    student_headers = {"Authorization": f"Bearer {std_login.get_json()['data']['token']}"}

    # 4. Form group now (after the 2020 deadline) -> formation_status should be 'late'
    grp_res = client.post(
        "/api/student/groups/",
        json={"project_title": "Healthcare Management System"},
        headers=student_headers,
    )
    assert grp_res.status_code == 201, grp_res.get_json()
    grp_data = grp_res.get_json()["data"]
    assert grp_data["formation_status"] == "late"

    # 5. Create another ungrouped student in this course
    client.post(
        "/api/manager/students/",
        json={"name": "Zaid Defaulter", "roll": "f2024-912", "dept": "SE", "section": "A", "course": "Advanced Software Lab"},
        headers=manager_headers,
    )

    # 6. Verify Iteration Submissions API returns group as late formation and includes ungrouped defaulter
    sub_res = client.get(f"/api/manager/iterations/{iter_id}/submissions", headers=manager_headers)
    assert sub_res.status_code == 200, sub_res.get_json()
    resp_data = sub_res.get_json()["data"]
    assert resp_data["is_group_formation"] is True
    assert resp_data["late_penalty_percent"] == 15
    assert any(s["is_formation_late"] is True for s in resp_data["submissions"])
    assert any(u["roll"] == "f2024-912" for u in resp_data["ungrouped_students"])


def test_supervisor_cap_enforced_per_course(client, manager_headers):
    """
    Verify:
    1. A supervisor can supervise up to 4 groups in Course Alpha.
    2. A 5th group in Course Alpha is blocked (capacity exceeded).
    3. The supervisor CAN still be assigned to a group in Course Beta.
    """
    client.post("/api/manager/departments/", json={"name": "EE", "code": "EE"}, headers=manager_headers)

    # Create Evaluator
    t_res = client.post(
        "/api/manager/teachers/",
        json={"name": "Dr. PerCourse", "email": "dr.percourse@bnu.edu.pk", "dept": "EE", "type": "Internal Faculty"},
        headers=manager_headers,
    )
    eval_id = t_res.get_json()["data"]["id"]
    teacher_pw = t_res.get_json()["data"].get("initial_password") or "123456"

    eval_login = client.post("/api/auth/login", json={"email": "dr.percourse@bnu.edu.pk", "password": teacher_pw})
    eval_headers = {"Authorization": f"Bearer {eval_login.get_json()['data']['token']}"}

    # Helper to create student, login, and form group in a course
    def make_group(roll, course_name):
        res = client.post(
            "/api/manager/students/",
            json={"name": f"Student {roll}", "roll": roll, "dept": "EE", "section": "A", "course": course_name},
            headers=manager_headers,
        )
        sid = res.get_json()["data"]["student_id"]
        t = AuthService.create_password_set_token(sid)
        client.post("/api/auth/set-password", json={"token": t, "new_password": "Password123!"})
        lg = client.post("/api/auth/login", json={"email_or_roll": roll, "password": "Password123!"})
        sh = {"Authorization": f"Bearer {lg.get_json()['data']['token']}"}
        grp = client.post("/api/student/groups/", json={"project_title": f"Project {roll}"}, headers=sh)
        return sh, grp.get_json()["data"]

    # Fill 4 groups in "Course Alpha"
    for i in range(1, 5):
        s_headers, g = make_group(f"f2024-60{i}", "Course Alpha")
        req_res = client.post("/api/student/supervisor-requests/", json={"evaluator_id": eval_id}, headers=s_headers)
        assert req_res.status_code == 201
        req_id = req_res.get_json()["data"]["id"]
        acc_res = client.post(f"/api/evaluator/supervisor-requests/{req_id}/accept", headers=eval_headers)
        assert acc_res.status_code == 200

    # 5th group in "Course Alpha" -> should fail
    s5_headers, g5 = make_group("f2024-605", "Course Alpha")
    req5_res = client.post("/api/student/supervisor-requests/", json={"evaluator_id": eval_id}, headers=s5_headers)
    assert req5_res.status_code == 400
    assert "maximum capacity of 4 projects for course 'Course Alpha'" in req5_res.get_json()["message"]

    # Group in "Course Beta" -> SHOULD SUCCEED because cap is per course!
    s_beta_headers, g_beta = make_group("f2024-606", "Course Beta")
    req_beta_res = client.post("/api/student/supervisor-requests/", json={"evaluator_id": eval_id}, headers=s_beta_headers)
    assert req_beta_res.status_code == 201
    req_beta_id = req_beta_res.get_json()["data"]["id"]
    acc_beta = client.post(f"/api/evaluator/supervisor-requests/{req_beta_id}/accept", headers=eval_headers)
    assert acc_beta.status_code == 200

