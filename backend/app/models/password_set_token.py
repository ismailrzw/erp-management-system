# backend/app/models/password_set_token.py
"""
Field constants for the password_set_tokens collection.

Used for one-time student account activation / password-set links.
"""

COLLECTION = "password_set_tokens"


class PasswordSetTokenFields:
    """MongoDB field-name constants for password_set_tokens."""
    COLLECTION  = "password_set_tokens"
    ID          = "_id"
    USER_ID     = "user_id"
    TOKEN_HASH  = "token_hash"
    EXPIRES_AT  = "expires_at"
    USED        = "used"
    CREATED_AT  = "created_at"
