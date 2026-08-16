# backend/app/models/user.py
"""
User Model - Data layer for user operations
"""
from datetime import datetime, timezone
from typing import ClassVar

import bcrypt
from pydantic import BaseModel, EmailStr, field_validator
from pydantic import Field as PydanticField

COLLECTION = "users"


class Field:
    """Field name constants to prevent typos."""
    ID = "_id"
    NAME = "name"
    EMAIL = "email"
    PASSWORD_HASH = "password_hash"
    ROLE = "role"
    DEPT = "dept"
    SECTION = "section"
    COURSE = "course"
    ROLL = "roll"
    RECOVERY_EMAIL = "recovery_email"
    TYPE = "type"
    DELETED = "deleted"
    DELETED_AT = "deleted_at"
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"


UserFields = Field


class Role:
    """User role constants."""
    MANAGER = "pbl_manager"
    STUDENT = "student"
    EVALUATOR = "evaluator"
    HOD = "hod"
    HODIC = "hodic"
    DEAN = "dean"
    
    # Use tuples instead of lists (immutable)
    ALL: ClassVar[tuple] = (MANAGER, STUDENT, EVALUATOR, HOD, HODIC, DEAN)
    OVERSIGHT: ClassVar[tuple] = (HOD, HODIC, DEAN)


# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plaintext: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return bcrypt.checkpw(plaintext.encode('utf-8'), hashed.encode('utf-8'))


# ==================== PYDANTIC MODEL ====================

class User(BaseModel):
    """Pydantic model for User data validation."""
    
    name: str = PydanticField(..., min_length=2, max_length=100)
    email: EmailStr = PydanticField(...)
    password_hash: str = PydanticField(..., min_length=60)
    role: str = PydanticField(...)
    dept: str | None = PydanticField(None, max_length=50)
    section: str | None = PydanticField(None, max_length=10)
    course: str | None = PydanticField(None, max_length=20)
    roll: str | None = PydanticField(None, max_length=20)
    recovery_email: EmailStr | None = None
    type: str | None = PydanticField(None, max_length=50)
    deleted: bool = False
    deleted_at: datetime | None = None
    created_at: datetime = PydanticField(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = PydanticField(default_factory=lambda: datetime.now(timezone.utc))
    
    @field_validator('role')
    def validate_role(cls, v):
        if v not in Role.ALL:
            raise ValueError(f"Role must be one of: {', '.join(Role.ALL)}")
        return v
    
    @field_validator('password_hash')
    def validate_password_hash(cls, v):
        if not v.startswith('$2b$') and not v.startswith('$2a$'):
            raise ValueError("Password hash must be a valid bcrypt hash")
        return v
    
    def dict(self, *args, **kwargs):
        data = super().dict(*args, **kwargs)
        return {k: v for k, v in data.items() if v is not None}
    
    @classmethod
    def from_mongo(cls, data: dict):
        """Create User instance from MongoDB document."""
        if data is None:
            return None
        if "_id" in data:
            data["id"] = str(data["_id"])
            del data["_id"]
        return cls(**data)