"""Audit log helper."""

from datetime import datetime, timezone
from flask import request


def log_audit(db, actor_id, actor_role, entity, action, target_id=None, old_value=None, new_value=None):
    """Append an immutable audit record."""
    try:
        db.audit_log.insert_one({
            "timestamp": datetime.now(timezone.utc),
            "actor_id": actor_id,
            "actor_role": actor_role,
            "entity": entity,
            "action": action,
            "target_id": target_id,
            "old_value": old_value,
            "new_value": new_value,
            "ip_address": request.remote_addr if request else None,
        })
    except Exception:
        pass