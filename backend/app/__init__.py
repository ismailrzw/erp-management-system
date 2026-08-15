# backend/app/__init__.py
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_restx import Api

from app.config import Config
from app.extensions import mongo
from app.middleware import fix_authorization_header
from app.utils import register_jwt_handlers

jwt = JWTManager()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Extensions
    CORS(app)
    jwt.init_app(app)
    mongo.init_app(app)

    # Register JWT error handlers (cleanly)
    register_jwt_handlers(jwt)

    # Register middleware to fix Authorization header
    app.before_request(fix_authorization_header)

    # Swagger / OpenAPI
    api = Api(
        app,
        version='1.0',
        title='ERP Management System API',
        description='API documentation for the ERP Management System',
        doc='/api/docs',
        authorizations={
            'Bearer Auth': {
                'type': 'apiKey',
                'in': 'header',
                'name': 'Authorization',
                'description': 'Enter JWT token as: Bearer <your_token>'
            }
        },
        security='Bearer Auth'
    )

    # Namespaces (only, no blueprint registration)
    from app.blueprints.auth.routes import auth_ns
    api.add_namespace(auth_ns, path='/api/auth')

    return app