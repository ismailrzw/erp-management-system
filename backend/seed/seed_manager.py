# backend/seed/seed_manager.py
import os
import sys
from datetime import datetime, timezone
from dotenv import load_dotenv
from pymongo import MongoClient
import bcrypt

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.models.user import UserFields, Role

load_dotenv()

def seed_manager():
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        print("ERROR: MONGO_URI not found")
        return False
    
    client = MongoClient(mongo_uri)
    db = client.get_default_database()
    
    # Check if manager exists
    existing = db.users.find_one({UserFields.EMAIL: "manager@bnu.edu.pk"})
    
    if existing:
        print("✅ Manager already exists")
        return True
    
    # Create manager
    password = "11223344"
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    
    manager = {
        UserFields.NAME: "Zaman Aziz",
        UserFields.EMAIL: "zamanaziz@bnu.edu.pk",
        UserFields.PASSWORD_HASH: hashed,
        UserFields.ROLE: Role.MANAGER,
        UserFields.DELETED: False,
        UserFields.CREATED_AT: datetime.now(timezone.utc)
    }
    
    db.users.insert_one(manager)
    print("✅ Manager created!")
    print("   Email: zamanaziz@bnu.edu.pk")
    print("   Password: 11223344")
    
    # Create index for unique email
    db.users.create_index(UserFields.EMAIL, unique=True)
    print("✅ Indexes created")
    
    return True

if __name__ == "__main__":
    seed_manager()