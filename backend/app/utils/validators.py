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


def validate_object_id(id_str):
    """Validate if string is a valid 24-char hex MongoDB ObjectId."""
    if not id_str or not isinstance(id_str, str):
        return False
    return bool(re.match(r'^[0-9a-fA-F]{24}$', id_str))


def validate_rubric_weights(rubrics):
    """Validate that rubric criteria weights sum up to 100%."""
    if not isinstance(rubrics, list) or len(rubrics) == 0:
        return False, "Rubrics list cannot be empty"
    
    total_weight = 0
    for rubric in rubrics:
        if not isinstance(rubric, dict) or "weight" not in rubric:
            return False, "Each rubric item must contain a 'weight' field"
        try:
            total_weight += float(rubric["weight"])
        except (ValueError, TypeError):
            return False, "Rubric weight must be a valid number"
            
    if abs(total_weight - 100.0) > 0.01:
        return False, f"Total rubric weight must sum to 100% (got {total_weight}%)"
        
    return True, None