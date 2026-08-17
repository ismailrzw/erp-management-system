# backend/app/utils/jwt_handlers.py
"""JWT error handlers - return dictionaries for flask_restx compatibility."""



def register_jwt_handlers(jwt):
    """Register JWT error handlers that return dictionaries."""
    
    @jwt.unauthorized_loader
    def unauthorized_loader(callback):
        return {"success": False, "message": "Missing Authorization Header"}, 401
    
    @jwt.invalid_token_loader
    def invalid_token_loader(callback):
        return {"success": False, "message": "Invalid token"}, 401
    
    @jwt.expired_token_loader
    def expired_token_loader(callback):
        return {"success": False, "message": "Token has expired"}, 401
    
    @jwt.revoked_token_loader
    def revoked_token_loader(callback):
        return {"success": False, "message": "Token has been revoked"}, 401
    
    @jwt.needs_fresh_token_loader
    def needs_fresh_token_loader(callback):
        return {"success": False, "message": "Fresh token required"}, 401