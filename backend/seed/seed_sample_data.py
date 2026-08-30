import os
import sys
from datetime import datetime, timezone
import bcrypt
from pymongo import MongoClient

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.models.user import Role, UserFields
from app.models.teacher import TeacherType

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/pbl_system")
client = MongoClient(MONGO_URI)
db = client.get_default_database()

def seed_departments():
    depts = [
        {"name": "Computer Science", "code": "CS"},
        {"name": "Software Engineering", "code": "SE"},
        {"name": "Electrical Engineering", "code": "EE"},
        {"name": "Business Administration", "code": "BBA"},
    ]
    for d in depts:
        db.departments.update_one(
            {"code": d["code"]},
            {"$setOnInsert": {**d, "deleted": False, "created_at": datetime.now(timezone.utc)}},
            upsert=True
        )
    print("✅ Seeded Departments")

def seed_courses():
    courses = [
        {"name": "Final Year Project", "dept": "CS", "min_group": 2, "max_group": 4, "deadline": "2026-12-31"},
        {"name": "Software Architecture PBL", "dept": "SE", "min_group": 1, "max_group": 3, "deadline": "2026-11-30"},
        {"name": "Embedded Systems Project", "dept": "EE", "min_group": 2, "max_group": 4, "deadline": "2026-12-15"},
    ]
    for c in courses:
        db.courses.update_one(
            {"name": c["name"]},
            {"$setOnInsert": {**c, "deleted": False, "created_at": datetime.now(timezone.utc)}},
            upsert=True
        )
    print("✅ Seeded Courses")

def seed_teachers():
    teachers = [
        {"name": "Dr. Sarah Ahmed", "email": "sarah.ahmed@superior.edu.pk", "dept": "CS", "type": TeacherType.INTERNAL},
        {"name": "Prof. Ali Raza", "email": "ali.raza@superior.edu.pk", "dept": "SE", "type": TeacherType.INTERNAL},
        {"name": "Mr. Kashif Mehmood", "email": "kashif.mehmood@techvista.com", "dept": "CS", "type": TeacherType.EXTERNAL},
    ]
    default_pass = "pbl123*"
    hashed = bcrypt.hashpw(default_pass.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    for t in teachers:
        db.users.update_one(
            {"email": t["email"]},
            {"$setOnInsert": {
                **t,
                "role": Role.EVALUATOR,
                "password_hash": hashed,
                "deleted": False,
                "created_at": datetime.now(timezone.utc)
            }},
            upsert=True
        )
    print("✅ Seeded Teachers / Evaluators")

if __name__ == "__main__":
    seed_departments()
    seed_courses()
    seed_teachers()
