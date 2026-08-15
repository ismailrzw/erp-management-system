# backend/app/middleware/auth_middleware.py
"""
Middleware to automatically add 'Bearer ' prefix to Authorization header
if it's missing. This ensures Swagger UI and other clients work seamlessly.
"""
from flask import request


def fix_authorization_header():
    """
    Before request handler: if Authorization header exists but doesn't
    start with 'Bearer ', prepend it automatically.
    """
    auth_header = request.headers.get('Authorization')
    if auth_header and not auth_header.startswith('Bearer '):
        # Fix the header in the WSGI environment
        request.environ['HTTP_AUTHORIZATION'] = f'Bearer {auth_header}'