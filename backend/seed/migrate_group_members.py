# backend/seed/migrate_group_members.py
"""
Data migration script to enforce group membership source of truth:
1. Converts all string IDs in member_ids to BSON ObjectId.
2. Ensures leader_id is converted to BSON ObjectId.
3. Ensures leader_id is present inside member_ids.
4. Normalizes member_ids to be unique while preserving leader at index 0.
5. Updates member_count to reflect actual total members.
6. Synchronizes group_id on all member user records.
"""

import os
from datetime import datetime, timezone
from bson import ObjectId
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/pbl_system")
client = MongoClient(mongo_uri)
db = client.get_default_database()

print(f"[*] Connected to database: {db.name}")

def migrate_groups():
    groups = list(db.groups.find())
    print(f"[*] Found {len(groups)} groups to audit...")

    updated_count = 0
    now = datetime.now(timezone.utc)

    for g in groups:
        gid = g["_id"]
        name = g.get("name", "Unnamed")
        leader_raw = g.get("leader_id")
        members_raw = g.get("member_ids", [])

        # Normalize leader_id
        leader_oid = None
        if leader_raw:
            if isinstance(leader_raw, ObjectId):
                leader_oid = leader_raw
            elif isinstance(leader_raw, str) and ObjectId.is_valid(leader_raw):
                leader_oid = ObjectId(leader_raw)

        # Normalize member_ids to unique ObjectIds
        normalized_oids = []
        seen = set()

        # Leader always goes first
        if leader_oid:
            normalized_oids.append(leader_oid)
            seen.add(str(leader_oid))

        for m in members_raw:
            m_oid = None
            if isinstance(m, ObjectId):
                m_oid = m
            elif isinstance(m, str) and ObjectId.is_valid(m):
                m_oid = ObjectId(m)

            if m_oid and str(m_oid) not in seen:
                normalized_oids.append(m_oid)
                seen.add(str(m_oid))

        new_count = len(normalized_oids)

        # Check if update is needed
        needs_update = (
            members_raw != normalized_oids or
            leader_raw != leader_oid or
            g.get("member_count") != new_count
        )

        if needs_update:
            db.groups.update_one(
                {"_id": gid},
                {
                    "$set": {
                        "leader_id": leader_oid,
                        "member_ids": normalized_oids,
                        "member_count": new_count,
                        "updated_at": now,
                    }
                }
            )
            updated_count += 1
            print(f"  [+] Fixed Group '{name}' (ID: {gid}): {len(members_raw)} -> {new_count} members (Leader: {leader_oid})")

        # Synchronize group_id on member user records (for non-deleted groups)
        if g.get("status") != "deleted":
            for m_oid in normalized_oids:
                db.users.update_one(
                    {"_id": m_oid},
                    {"$set": {"group_id": gid}}
                )

    print(f"[✓] Migration complete: {updated_count} groups updated out of {len(groups)} total.")

if __name__ == "__main__":
    migrate_groups()
