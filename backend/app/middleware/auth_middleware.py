# backend/app/middleware/auth_middleware.py
"""
Authorization header normalisation middleware.

Problem solved
--------------
Swagger UI (Flask-RESTx) sends raw JWT tokens in the Authorization header
without the ``Bearer `` prefix when users paste a token directly into the
Swagger UI "Authorize" dialog.  Flask-JWT-Extended requires the ``Bearer ``
prefix, so without this fix every Swagger request would return 401.

Behaviour
---------
Before each request, this function checks if an Authorization header is
present but does *not* start with ``Bearer ``.  If so, it prepends the
prefix automatically in the WSGI environ.

Security trade-off
------------------
This intentionally allows raw (non-prefixed) tokens to authenticate.  This
is an acceptable trade-off for developer and evaluator ergonomics (Swagger UI
usability) because:

  1. The token must still be a valid, signed JWT — a random string will be
     rejected by Flask-JWT-Extended's signature verification.
  2. This runs only before HTTP requests; it does not bypass any other auth
     check (role_required decorators, JWT expiry, etc.).

Production hardening (future sprint)
-------------------------------------
If the API is made publicly accessible, consider restricting this middleware
to non-production environments (``app.config["DEBUG"]``), or updating the
Swagger UI configuration to always prepend the prefix client-side.
"""
from flask import request


def fix_authorization_header() -> None:
    """
    WSGI before-request hook.

    If the ``Authorization`` header exists but is missing the ``Bearer ``
    prefix, prepend it so that Flask-JWT-Extended's token extraction works
    for all clients (cURL with raw token, Swagger UI, etc.).
    """
    auth_header = request.headers.get("Authorization")
    if auth_header and not auth_header.startswith("Bearer "):
        request.environ["HTTP_AUTHORIZATION"] = f"Bearer {auth_header}"