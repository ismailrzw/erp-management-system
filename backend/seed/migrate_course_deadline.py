# backend/seed/migrate_course_deadline.py
"""
Migration Script: Rename courses.deadline -> courses.group_formation_deadline.
Idempotent script to align existing course records with Sprint 05 specifications.
"""

import os
import sys
from dotenv import load_dotenv
from pymongo import MongoClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

MONGO_URI = os.getenv("MONGO_URI")


def migrate():
    if not MONGO_URI:
        print("ERROR: MONGO_URI is not set in environment.")
        sys.exit(1)

    client = MongoClient(MONGO_URI)
    db = client.get_default_database()

    print("Checking courses collection for migration...")
    courses_to_update = list(db.courses.find({"deadline": {"$exists": True}}))
    print(f"Found {len(courses_to_update)} course document(s) with 'deadline' field.")

    updated_count = 0
    for doc in courses_to_update:
        deadline_val = doc.get("deadline")
        db.courses.update_one(
            {"_id": doc["_id"]},
            {
                "$set": {"group_formation_deadline": deadline_val},
                "$unset": {"deadline": ""},
            },
        )
        updated_count += 1
        print(f"Migrated course '{doc.get('name')}' (ID: {doc['_id']}) -> group_formation_deadline: {deadline_val}")

    print(f"Migration complete. Successfully updated {updated_count} course(s).")


if __name__ == "__main__":
    migrate()
