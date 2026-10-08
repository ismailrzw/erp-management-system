import os

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/pbl_system")
client = MongoClient(MONGO_URI)
db = client.get_default_database()

print("--- Starting Database Role Migration ---")

# Step 1: Any user assigned as supervisor_id in groups -> role = "teacher"
supervisor_ids = [s for s in db.groups.distinct("supervisor_id") if s]
print(f"Distinct supervisor IDs in groups: {len(supervisor_ids)}")

res1 = db.users.update_many(
    {"_id": {"$in": supervisor_ids}},
    {"$set": {"role": "teacher"}, "$unset": {"type": ""}}
)
print(f"Updated {res1.modified_count} users to role='teacher' based on group supervision.")

# Step 2: Specific faculty emails or teachers with domains
res2 = db.users.update_many(
    {"email": {"$in": ["sarah.ahmed@superior.edu.pk", "ali.raza@superior.edu.pk", "saifali@bnu.edu.pk"]}},
    {"$set": {"role": "teacher"}, "$unset": {"type": ""}}
)
print(f"Verified core teacher accounts: {res2.modified_count}")

# Step 3: Evaluators migration
res3 = db.users.update_many(
    {"role": "evaluator", "type": "External Industry"},
    {"$set": {"evaluator_type": "external"}, "$unset": {"type": ""}}
)
res4 = db.users.update_many(
    {"role": "evaluator", "type": "Internal Faculty"},
    {"$set": {"evaluator_type": "internal"}, "$unset": {"type": ""}}
)
res5 = db.users.update_many(
    {"role": "evaluator", "evaluator_type": {"$exists": False}},
    {"$set": {"evaluator_type": "internal"}, "$unset": {"type": ""}}
)
print(f"Evaluators updated with evaluator_type. (ext: {res3.modified_count}, int: {res4.modified_count}, fallback: {res5.modified_count})")

# Step 4: Verification counts
teachers_count = db.users.count_documents({"role": "teacher", "deleted": {"$ne": True}})
evaluators_count = db.users.count_documents({"role": "evaluator", "deleted": {"$ne": True}})
students_count = db.users.count_documents({"role": "student", "deleted": {"$ne": True}})
managers_count = db.users.count_documents({"role": "pbl_manager", "deleted": {"$ne": True}})

print(f"Verification: Teachers: {teachers_count} | Evaluators: {evaluators_count} | Students: {students_count} | Managers: {managers_count}")
print("--- Migration Completed Successfully ---")
