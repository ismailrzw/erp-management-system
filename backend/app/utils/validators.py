# backend/app/utils/validators.py
import re

def validate_email(email):
    """Validate email format."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_roll_number(roll):
    """Validate BNU roll number format: XXXX-FXX-XXX."""
    pattern = r'^[A-Z]{4}-[F|S]\d{2}-\d{3,4}$'
    return re.match(pattern, roll) is not None

def validate_password_strength(password):
    """Validate password strength (min 8 chars, at least one number)."""
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    return True, "Password is strong"