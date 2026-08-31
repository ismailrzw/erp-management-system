# backend/app/middleware/__init__.py
from .auth_middleware import fix_authorization_header

__all__ = ['fix_authorization_header']