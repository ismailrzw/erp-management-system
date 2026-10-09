"""JSON-safe values for nested MongoDB records without exposing internal fields."""

from datetime import datetime, timezone

from bson import ObjectId


def json_safe(value):
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return (value if value.tzinfo else value.replace(tzinfo=timezone.utc)).isoformat()
    if isinstance(value, dict):
        return {key: json_safe(item) for key, item in value.items()
                if key not in ("password_hash", "file_path", "stored_filename")}
    if isinstance(value, (list, tuple)):
        return [json_safe(item) for item in value]
    return value
