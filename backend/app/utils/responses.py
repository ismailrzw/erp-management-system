# backend/app/utils/responses.py
"""
Response helpers for Flask-RESTx.
These return plain dicts + status codes, NOT Flask Response objects.
"""

def success_response(message="Success", data=None, status=200):
    """Return a success response as a dict and status code."""
    response = {"success": True, "message": message}
    if data is not None:
        response["data"] = data
    return response, status

def error_response(message="Something went wrong", status=400, errors=None):
    """Return an error response as a dict and status code."""
    response = {"success": False, "message": message}
    if errors is not None:
        response["errors"] = errors
    return response, status