"""Disposable UI fixture server. Never connects to an application database."""

import sys
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import bcrypt

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app
from app.extensions import mongo
from app.services import email_service


class QAConfig:
    TESTING = True
    MONGO_URI = f"mongodb://localhost:27017/pbl_system_ui_test_{uuid4().hex[:8]}"
    JWT_SECRET_KEY = "disposable-local-ui-verification-secret"
    MAX_CONTENT_LENGTH = 11 * 1024 * 1024


app = create_app(QAConfig)
email_service._dispatch_email = lambda *args, **kwargs: True
with app.app_context():
    assert mongo.db.name.startswith("pbl_system_ui_test_")
    mongo.db.departments.insert_one({"code": "SE", "name": "Software Engineering", "deleted": False})
    mongo.db.courses.insert_one({"name": "QA Final Year Project", "dept": "SE", "min_group": 2, "max_group": 4, "deleted": False})
    password = bcrypt.hashpw(b"TestWorkflow123!", bcrypt.gensalt()).decode()
    users = {}
    for alias, role, roll, course in (
        ("manager", "pbl_manager", None, ""), ("student", "student", "f2026-001", "QA Final Year Project"),
        ("peer", "student", "f2026-002", "QA Final Year Project"), ("create", "student", "f2026-003", ""),
        ("teacher", "teacher", None, ""), ("evaluator", "evaluator", None, ""),
    ):
        document = {"name": f"QA {alias.title()}", "email": f"qa-{alias}@bnu.edu.pk", "password_hash": password,
                    "role": role, "dept": "SE", "course": course, "session": "2026", "section": "A", "deleted": False,
                    "password_set": True, "email_verified": True, "domains": ["Software Engineering"]}
        if roll:
            document["roll"] = roll
        users[alias] = mongo.db.users.insert_one(document).inserted_id
    group_id = mongo.db.groups.insert_one({"name": "grp-2026-001", "project_title": "QA Project Proposal", "dept": "SE",
                                         "course": "QA Final Year Project", "leader_id": users["student"],
                                         "creator_id": users["student"], "member_ids": [users["student"], users["peer"]],
                                         "status": "pending", "version": 1, "proposal_version": 1,
                                         "created_at": datetime.now(timezone.utc)}).inserted_id
    mongo.db.users.update_many({"_id": {"$in": [users["student"], users["peer"]]}}, {"$set": {"group_id": group_id}})
    sprint_id = mongo.db.sprints.insert_one({"name": "Requirement Engineering", "description": "Identify stakeholders and requirements.", "course": "All Courses", "order": 1, "deleted": False}).inserted_id
    task_id = mongo.db.iterations.insert_one({"title": "Target Market", "course": "QA Final Year Project", "deadline": "2099-12-31T18:59:00+00:00", "details": "Gather primary and secondary users. Attach your findings.", "sprint_id": sprint_id, "sprint_name": "Requirement Engineering", "milestone_order": 1, "late_penalty_percent": 10, "created_by": users["manager"], "version": 1, "deleted": False, "rubrics": [{"id": 1, "question": "User evidence", "weight": 100, "levels": {str(n): f"Evidence level {n}" for n in range(6)}}]}).inserted_id
    mongo.db.announcements.insert_one({"title": "QA Milestone Notice", "content": "Please review your Course's published milestones.",
                                       "scope": "broadcast", "created_at": datetime.now(timezone.utc), "posted_by": users["manager"]})
    print(f"UI QA database: {mongo.db.name}", flush=True)

@app.route("/qa-fixtures")
def fixtures():
    return {"group_id": str(group_id), "task_id": str(task_id)}


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, use_reloader=False)
