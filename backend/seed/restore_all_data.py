import os
from datetime import datetime, timezone

import bcrypt
from pymongo import MongoClient

mongo_uri = os.getenv("MONGO_URI", "mongodb://mongo:27017/pbl_system")
client = MongoClient(mongo_uri)
db = client.get_default_database()

print("Connected to database:", db.name)

# 1. Manager
mgr_pass = bcrypt.hashpw(b"11223344", bcrypt.gensalt()).decode()
db.users.update_one(
    {"email": "zamanaziz@bnu.edu.pk"},
    {"$set": {
        "name": "Zaman Aziz",
        "email": "zamanaziz@bnu.edu.pk",
        "role": "pbl_manager",
        "password_hash": mgr_pass,
        "deleted": False,
        "created_at": datetime.now(timezone.utc)
    }},
    upsert=True
)

# 2. Departments
for code, name in [("CS", "Computer Science"), ("SE", "Software Engineering"), ("EE", "Electrical Engineering"), ("BBA", "Business Administration")]:
    db.departments.update_one({"code": code}, {"$set": {"name": name, "code": code, "deleted": False}}, upsert=True)

# 3. Courses
for cname in ["Final Year Project - Fall 2025", "Final Year Project", "Software Architecture PBL", "Embedded Systems Project"]:
    db.courses.update_one({"name": cname}, {"$set": {"name": cname, "dept": "SE", "min_group": 1, "max_group": 4, "deadline": "2026-12-31", "deleted": False}}, upsert=True)

# 4. Students
std_pass = bcrypt.hashpw(b"11223344", bcrypt.gensalt()).decode()
s1 = db.users.find_one_and_update(
    {"email": "student1@bnu.edu.pk"},
    {"$set": {
        "name": "Muhammad Ismail",
        "email": "student1@bnu.edu.pk",
        "role": "student",
        "course": "Final Year Project - Fall 2025",
        "section": "A",
        "dept": "SE",
        "roll": "BCSM-F23-551",
        "password_hash": std_pass,
        "deleted": False
    }},
    upsert=True,
    return_document=True
)

db.users.update_one(
    {"email": "student2@bnu.edu.pk"},
    {"$set": {
        "name": "No Group Student",
        "email": "student2@bnu.edu.pk",
        "role": "student",
        "course": "Final Year Project - Fall 2025",
        "section": "A",
        "dept": "SE",
        "roll": "BCSM-F23-552",
        "password_hash": std_pass,
        "deleted": False
    }},
    upsert=True
)

# 5. Group
s1_id = s1["_id"]
grp = db.groups.find_one_and_update(
    {"name": "Alpha Team"},
    {"$set": {
        "name": "Alpha Team",
        "course": "Final Year Project - Fall 2025",
        "section": "A",
        "dept": "SE",
        "leader_id": s1_id,
        "member_ids": [s1_id],
        "status": "approved",
        "version": 1,
        "updatedAt": datetime.now(timezone.utc)
    }, "$setOnInsert": {"createdAt": datetime.now(timezone.utc)}},
    upsert=True,
    return_document=True
)

# 6. Sample Iteration
rubrics = [
    {
        "id": 1,
        "question": "Problem Statement & Scope",
        "weight": 50,
        "levels": {"0": "Not provided", "1": "Vague", "2": "Basic", "3": "Adequate", "4": "Good", "5": "Excellent"}
    },
    {
        "id": 2,
        "question": "System Architecture & Design",
        "weight": 50,
        "levels": {"0": "Not provided", "1": "Vague", "2": "Basic", "3": "Adequate", "4": "Good", "5": "Excellent"}
    }
]

it = db.iterations.find_one_and_update(
    {"title": "Project Proposal Submission (Updated)", "course": "Final Year Project - Fall 2025"},
    {"$set": {
        "title": "Project Proposal Submission (Updated)",
        "details": "Upload a detailed FYP project proposal in PDF format.",
        "course": "Final Year Project - Fall 2025",
        "deadline": "2026-11-01",
        "rubrics": rubrics,
        "updatedAt": datetime.now(timezone.utc)
    }, "$setOnInsert": {"createdAt": datetime.now(timezone.utc)}},
    upsert=True,
    return_document=True
)

print("✅ Seeding complete!")
print(f"Manager count: {db.users.count_documents({'role': 'pbl_manager'})}")
print(f"Student count: {db.users.count_documents({'role': 'student'})}")
print(f"Group count: {db.groups.count_documents({})}")
print(f"Iteration count: {db.iterations.count_documents({})}")
