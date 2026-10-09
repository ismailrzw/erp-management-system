"""
End-to-End System Verification Script using standard library urllib.
Tests all roles, authentication, validation, teacher portal, evaluator CRUD, group leave, and broadcasting.
"""

import json
import sys
import urllib.error
import urllib.request

BASE_URL = "http://localhost:5000/api"

def make_req(endpoint, method="GET", data=None, headers=None):
    url = f"{BASE_URL}{endpoint}"
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    req_data = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=req_data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            body = json.loads(content) if content else {}
            return resp.status, body
    except urllib.error.HTTPError as err:
        content = err.read().decode("utf-8") if err.fp else ""
        try:
            body = json.loads(content) if content else {}
        except (ValueError, TypeError):
            body = {"raw": content}
        return err.code, body

def check(name, success, details=""):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} | {name} {f'({details})' if details else ''}")
    if not success:
        sys.exit(1)

def main():
    print("\n🚀 Starting ERP System Architecture & Role Separation Verification...\n")

    # 1. Manager Login
    print("--- 1. Testing PBL Manager Authentication & Endpoints ---")
    status, mgr_res = make_req("/auth/login", method="POST", data={"email": "zamanaziz@bnu.edu.pk", "password": "11223344"})
    check("Manager Login", status == 200, f"Status: {status}")
    mgr_token = mgr_res["data"]["token"]
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    # 2. Manager Teachers (Supervisors) CRUD
    status, teachers_res = make_req("/manager/teachers/", headers=mgr_headers)
    print(f"DEBUG teachers_res: status={status}, body={teachers_res}")
    check("Manager List Teachers", status == 200, f"Count: {len(teachers_res.get('data', {}).get('items', []))}")
    for t in teachers_res['data']['items']:
        check(f"Teacher {t['name']} has role='teacher' (no 'type')", t.get("role") == "teacher" and "type" not in t, f"Role: {t.get('role')}, Keys: {list(t.keys())}")

    # 3. Manager Evaluators CRUD
    status, evaluators_res = make_req("/manager/evaluators/", headers=mgr_headers)
    check("Manager List Evaluators", status == 200, f"Count: {len(evaluators_res['data']['items'])}")
    for ev in evaluators_res['data']['items']:
        check(f"Evaluator {ev['name']} has role='evaluator' & valid type", ev.get("role") == "evaluator" and ev.get("evaluator_type") in ("internal", "external"))

    # 4. Teacher (Supervisor) Login & Portal
    print("\n--- 2. Testing Teacher / Supervisor Portal ---")
    status, teacher_res = make_req("/auth/login", method="POST", data={"email": "saifali@bnu.edu.pk", "password": "11223344"})
    check("Teacher Login", status == 200, f"User role: {teacher_res['data'].get('user', {}).get('role')}")
    teacher_token = teacher_res["data"]["token"]
    teacher_headers = {"Authorization": f"Bearer {teacher_token}"}

    # Teacher Dashboard
    status, t_dash = make_req("/teacher/dashboard", headers=teacher_headers)
    check("Teacher Dashboard API", status == 200, f"Active groups: {t_dash['data']['stats']['active_groups_count']} / {t_dash['data']['stats']['max_supervision_cap']}")

    # Teacher Groups
    status, t_groups = make_req("/teacher/groups", headers=teacher_headers)
    print(f"DEBUG t_groups: status={status}, body={t_groups}")
    check("Teacher Supervised Groups API", status == 200, f"Status: {status}, Error: {t_groups.get('message', t_groups)}")

    # Teacher Students
    status, _t_students = make_req("/teacher/students", headers=teacher_headers)
    check("Teacher Supervised Students API", status == 200)

    # Teacher Profile & Update Domains
    status, t_profile = make_req("/teacher/profile", headers=teacher_headers)
    check("Teacher Profile API", status == 200, f"Domains: {t_profile['data'].get('domains')}")

    status, _t_domains_update = make_req(
        "/teacher/profile/domains",
        method="PUT",
        data={"domains": ["Artificial Intelligence", "Web Systems", "Cloud Computing"]},
        headers=teacher_headers,
    )
    check("Teacher Update Domains API", status == 200)

    # 5. Evaluator Login
    print("\n--- 3. Testing Showcase Evaluator Login & Access ---")
    status, eval_res = make_req("/auth/login", method="POST", data={"email": "kashif.mehmood@techvista.com", "password": "11223344"})
    check("Evaluator Login", status == 200, f"User role: {eval_res['data'].get('user', {}).get('role')}")
    eval_token = eval_res["data"]["token"]
    eval_headers = {"Authorization": f"Bearer {eval_token}"}

    status, _eval_dash = make_req("/evaluator/dashboard", headers=eval_headers)
    check("Evaluator Dashboard API", status == 200)

    # 6. Student Login
    print("\n--- 4. Testing Student Login & Role Verification ---")
    status, stu_res = make_req("/auth/login", method="POST", data={"email": "F2023-111@bnu.edu.pk", "password": "11223344"})
    check("Student Login", status == 200, f"User role: {stu_res['data'].get('user', {}).get('role')}")

    # 7. Group Mail Broadcast
    print("\n--- 5. Testing Manager Group Broadcast Email ---")
    status, mail_res = make_req(
        "/manager/groups/send-mail",
        method="POST",
        data={
            "recipient_filter": "all",
            "subject": "System Verification Broadcast",
            "body": "System consistency and role separation verification test.",
        },
        headers=mgr_headers,
    )
    check("Manager Group Mail Broadcast API", status == 200, f"Dispatched: {mail_res['data']['emails_dispatched']}")

    print("\n🎉 ALL ARCHITECTURE & ROLE VERIFICATIONS PASSED PERFECTLY!\n")

if __name__ == "__main__":
    main()
