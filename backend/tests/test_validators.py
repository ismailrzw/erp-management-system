"""
Unit tests for backend/app/utils/validators.py
"""
from app.utils.validators import (
    validate_email,
    validate_object_id,
    validate_password_strength,
    validate_roll_number,
    validate_rubric_weights,
)


def test_validate_email():
    """Test valid and invalid email formats."""
    assert validate_email("student@bnu.edu.pk") is True
    assert validate_email("user.name@domain.com") is True
    assert validate_email("invalid-email") is False
    assert validate_email("@bnu.edu.pk") is False


def test_validate_roll_number():
    """Test valid and invalid BNU roll numbers."""
    assert validate_roll_number("BCSM-F23-551") is True
    assert validate_roll_number("BCSM-S24-102") is True
    assert validate_roll_number("invalid-roll") is False
    assert validate_roll_number("1234-F23-551") is False


def test_validate_password_strength():
    """Test password strength validation logic."""
    is_valid, _ = validate_password_strength("StrongPass1")
    assert is_valid is True

    is_short, msg = validate_password_strength("Short1")
    assert is_short is False
    assert "8 characters" in msg

    is_no_num, msg = validate_password_strength("NoNumberPass")
    assert is_no_num is False
    assert "one number" in msg

    is_no_upper, msg = validate_password_strength("lower12345")
    assert is_no_upper is False
    assert "uppercase letter" in msg


def test_validate_object_id():
    """Test MongoDB ObjectId format validation."""
    assert validate_object_id("665f2a1b3c4d5e6f7a8b9c0d") is True
    assert validate_object_id("invalid-object-id") is False
    assert validate_object_id(12345) is False
    assert validate_object_id(None) is False


def test_validate_rubric_weights():
    """Test rubric weights total calculation."""
    valid_rubrics = [
        {"question": "Q1", "weight": 40},
        {"question": "Q2", "weight": 60},
    ]
    is_valid, err = validate_rubric_weights(valid_rubrics)
    assert is_valid is True
    assert err is None

    invalid_rubrics = [
        {"question": "Q1", "weight": 30},
        {"question": "Q2", "weight": 30},
    ]
    is_valid_inv, err_inv = validate_rubric_weights(invalid_rubrics)
    assert is_valid_inv is False
    assert "must sum to 100%" in err_inv
