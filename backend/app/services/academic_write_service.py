"""Coordinate academic writes across Flask workers, including standalone MongoDB."""

from contextvars import ContextVar
from datetime import datetime, timedelta, timezone
from functools import wraps
from threading import Event, Thread
from uuid import uuid4

from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError, PyMongoError

from app.extensions import mongo
from app.services.academic_integrity_service import AcademicConflict

_inside_write = ContextVar("inside_academic_write", default=False)


def academic_write(function):
    """Serialize integrity-sensitive operations; nested service calls share the lease."""
    @wraps(function)
    def guarded(*args, **kwargs):
        if _inside_write.get():
            return function(*args, **kwargs)
        collection = mongo.db.academic_write_locks
        owner = uuid4().hex
        now = datetime.now(timezone.utc)
        try:
            collection.find_one_and_update(
                {"_id": "academic", "expires_at": {"$lte": now}},
                {"$set": {"owner": owner, "expires_at": now + timedelta(minutes=10)}},
                upsert=True, return_document=ReturnDocument.AFTER,
            )
        except DuplicateKeyError as exc:
            raise AcademicConflict("Another academic update is in progress. Refresh and retry shortly.") from exc
        stop = Event()

        def renew():
            while not stop.wait(30):
                try:
                    collection.update_one({"_id": "academic", "owner": owner}, {"$set": {
                        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
                    }})
                except PyMongoError:
                    # A disconnected operation will fail its database writes. The lease
                    # remains long enough to recover normal transient disconnects.
                    stop.set()

        thread = Thread(target=renew, daemon=True)
        thread.start()
        token = _inside_write.set(True)
        try:
            return function(*args, **kwargs)
        finally:
            _inside_write.reset(token)
            stop.set()
            thread.join(timeout=1)
            collection.delete_one({"_id": "academic", "owner": owner})
    return guarded
