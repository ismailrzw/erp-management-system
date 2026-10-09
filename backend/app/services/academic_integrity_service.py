"""Academic reference checks using the application's existing names, codes and IDs."""

import re

from bson import ObjectId

from app.extensions import mongo


class AcademicConflict(ValueError):
    """A retained academic reference prevents the requested mutation."""

    status_code = 409


def _references(value):
    return [value, str(value)] if isinstance(value, ObjectId) else [value]


def validate_enrollment(dept: str, course: str = "") -> None:
    """Require active academic parents without manufacturing missing enrollment."""
    code = (dept or "").strip().upper()
    if not code or not mongo.db.departments.find_one({
        "code": code, "deleted": {"$ne": True},
    }):
        raise ValueError("Select an active Department.")
    if course and not mongo.db.courses.find_one({
        "name": course.strip(), "dept": code, "deleted": {"$ne": True},
    }):
        raise ValueError("The selected Course must belong to the selected Department.")


def student_group(student: dict) -> dict | None:
    """Find retained membership/leadership, including legacy string references."""
    refs = _references(student["_id"])
    conditions = [{"member_ids": {"$in": refs}}, {"leader_id": {"$in": refs}}]
    group_id = student.get("group_id")
    if group_id:
        ids = [group_id]
        if ObjectId.is_valid(str(group_id)):
            ids = _references(ObjectId(str(group_id)))
        conditions.append({"_id": {"$in": ids}})
    return mongo.db.groups.find_one({"$or": conditions})


def assert_deletable(kind: str, document: dict, action: str = "delete") -> None:
    """Block soft/permanent deletion while retained children still need a parent."""
    refs = _references(document["_id"])
    checks = []
    if kind == "student":
        if student_group(document) or document.get("group_id"):
            raise AcademicConflict("Cannot delete this student: group membership or leadership still exists.")
        checks = [
            ("student_evaluations", {"student_id": {"$in": refs}}, "grades"),
            ("submissions", {"submitted_by": {"$in": refs}}, "submissions"),
            ("milestone_comments", {"author_id": {"$in": refs}}, "comments"),
        ]
    elif kind == "department":
        code = document["code"]
        dept_query = {"$or": [{"dept": {"$regex": f"^{re.escape(code)}$", "$options": "i"}}, {"dept_id": {"$in": refs}}]}
        checks = [(collection, dept_query, label) for collection, label in (
            ("courses", "courses"), ("users", "students/faculty"), ("groups", "groups"),
        )]
    elif kind == "course":
        course_query = {"$or": [{"course": document["name"]}, {"course_id": {"$in": refs}}]}
        checks = [(collection, course_query, label) for collection, label in (
            ("groups", "groups"), ("users", "enrolled students"), ("iterations", "milestones"),
        )]
    elif kind in ("teacher", "evaluator"):
        checks = [
            ("groups", {"$or": [
                {"supervisor_id": {"$in": refs}}, {"evaluator_id": {"$in": refs}},
                {"evaluator_ids": {"$in": refs}},
            ]}, "bound groups"),
            ("assignments", {"evaluator_id": {"$in": refs}}, "group assignments"),
            ("evaluations", {"evaluator_id": {"$in": refs}}, "evaluations"),
            ("student_evaluations", {"evaluator_id": {"$in": refs}}, "student grades"),
            ("supervisor_requests", {"evaluator_id": {"$in": refs}, "status": "pending"}, "pending supervisor requests"),
        ]
    counts = [(label, mongo.db[collection].count_documents(query)) for collection, query, label in checks]
    blockers = [f"{count} {label}" for label, count in counts if count]
    if blockers:
        raise AcademicConflict(f"Cannot {action} this {kind}: {', '.join(blockers)} still reference it.")


def assert_restorable(kind, document):
    """Do not reactivate an identity that was reused while the record was archived."""
    collection, keys = {"department": ("departments", ("code",)), "course": ("courses", ("name",)),
                        "student": ("users", ("email", "roll")), "teacher": ("users", ("email",)),
                        "evaluator": ("users", ("email",))}[kind]
    for key in keys:
        if document.get(key) and mongo.db[collection].find_one({"_id": {"$ne": document["_id"]}, key: document[key], "deleted": {"$ne": True}}):
            raise AcademicConflict(f"Cannot restore this {kind}: an active record already uses its {key}.")
