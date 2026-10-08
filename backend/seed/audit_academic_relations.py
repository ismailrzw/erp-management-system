"""Preview compatible reference backfills; never guess enrollment or overwrite grades.

python seed/audit_academic_relations.py --database pbl_system --output plan.json
python seed/audit_academic_relations.py --database pbl_system --output plan.json --apply
"""

import argparse
import json
import os
from pathlib import Path

from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient


def plan_backfills(db):
    updates, issues = [], []
    departments = list(db.departments.find({"deleted": {"$ne": True}}))
    courses = list(db.courses.find({"deleted": {"$ne": True}}))
    sprints = list(db.sprints.find({"deleted": {"$ne": True}}))

    def one(records, key, value):
        matches = [record for record in records if record.get(key) == value]
        return matches[0] if len(matches) == 1 else None

    for collection in ("users", "courses", "groups"):
        for record in db[collection].find({"deleted": {"$ne": True}}):
            if collection == "users" and record.get("role") != "student":
                continue
            fields = {}
            dept = one(departments, "code", record.get("dept"))
            if not dept:
                issues.append({"collection": collection, "id": str(record["_id"]), "reason": "Missing/ambiguous Department"})
                continue
            if not record.get("dept_id"):
                fields["dept_id"] = dept["_id"]
            if collection != "courses" and record.get("course"):
                course = one(courses, "name", record["course"])
                if not course or course.get("dept") != dept["code"]:
                    issues.append({"collection": collection, "id": str(record["_id"]), "reason": "Course/Department needs Manager correction"})
                    continue
                if not record.get("course_id"):
                    fields["course_id"] = course["_id"]
            if fields:
                updates.append({"collection": collection, "id": str(record["_id"]), "set": {key: str(value) for key, value in fields.items()}})
            if collection == "groups" and not record.get("creator_id"):
                issues.append({"collection": collection, "id": str(record["_id"]), "reason": "Historical creator unknown; preserve original member array order"})
            if collection == "groups" and not record.get("proposal_attachment_id"):
                issues.append({"collection": collection, "id": str(record["_id"]), "reason": "Proposal attachment missing"})
    for task in db.iterations.find({"deleted": {"$ne": True}}):
        if not task.get("sprint_id"):
            sprint = one(sprints, "name", task.get("sprint_name"))
            if sprint:
                updates.append({"collection": "iterations", "id": str(task["_id"]), "set": {"sprint_id": str(sprint["_id"])}})
            else:
                issues.append({"collection": "iterations", "id": str(task["_id"]), "reason": "Missing/ambiguous Sprint; associate explicitly"})
        if not task.get("created_by"):
            issues.append({"collection": "iterations", "id": str(task["_id"]), "reason": "Creator unknown; private Manager comments cannot be redirected to a guessed recipient"})
    for submission in db.submissions.find({}):
        if "deadline_snapshot" not in submission or "late_penalty_percent" not in submission:
            issues.append({"collection": "submissions", "id": str(submission["_id"]), "reason": "Historical deadline/penalty policy needs explicit review; no automatic score rewrite"})
    for teacher in db.users.find({"role": "teacher", "deleted": {"$ne": True}}):
        count = db.groups.count_documents({"supervisor_id": {"$in": [teacher["_id"], str(teacher["_id"])]}, "status": {"$ne": "deleted"}})
        if count > 4:
            issues.append({"collection": "users", "id": str(teacher["_id"]), "reason": f"Supervisor has {count} active groups; review capacity without removing assignments"})
    for assignment in db.assignments.find({}):
        group_id = assignment.get("group_id")
        staff_id = assignment.get("evaluator_id")
        if not ObjectId.is_valid(str(group_id)) or not db.groups.find_one({"_id": ObjectId(str(group_id))}):
            issues.append({"collection": "assignments", "id": str(assignment["_id"]), "reason": "Orphan group assignment"})
        if not ObjectId.is_valid(str(staff_id)) or not db.users.find_one({"_id": ObjectId(str(staff_id))}):
            issues.append({"collection": "assignments", "id": str(assignment["_id"]), "reason": "Orphan staff assignment"})
    return {"database": db.name, "updates": updates, "issues": issues}


def main():
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    parser = argparse.ArgumentParser()
    parser.add_argument("--database", required=True)
    parser.add_argument("--uri", default=os.getenv("MONGO_URI", "mongodb://localhost:27017"))
    parser.add_argument("--output", default="academic-relations-plan.json")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    db = MongoClient(args.uri, serverSelectionTimeoutMS=5000)[args.database]
    plan = plan_backfills(db)
    Path(args.output).write_text(json.dumps(plan, indent=2), encoding="utf-8")
    if args.apply:
        backup = []
        for update in plan["updates"]:
            record = db[update["collection"]].find_one({"_id": ObjectId(update["id"])})
            backup.append({"collection": update["collection"], "id": update["id"], "previous": {
                key: str(record[key]) if key in record else None for key in update["set"]
            }})
        Path(args.output + ".backup.json").write_text(json.dumps(backup, indent=2), encoding="utf-8")
        for update in plan["updates"]:
            # Conditional writes preserve any concurrent Manager correction.
            for key, value in update["set"].items():
                db[update["collection"]].update_one({"_id": ObjectId(update["id"]), "$or": [{key: None}, {key: {"$exists": False}}]}, {"$set": {key: ObjectId(value)}})
    print(json.dumps({"database": db.name, "backfills": len(plan["updates"]), "needs_review": len(plan["issues"]), "applied": args.apply}))


if __name__ == "__main__":
    main()
