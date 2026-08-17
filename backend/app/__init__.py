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

    # Register JWT error handlers
    register_jwt_handlers(jwt)

    # Register middleware to fix Authorization header
    app.before_request(fix_authorization_header)

    # ── Swagger / OpenAPI ──────────────────────────────────
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

    # ── Register Namespaces ──────────────────────────────
    from app.blueprints.auth.routes import auth_ns
    api.add_namespace(auth_ns, path='/api/auth')

    from app.blueprints.manager.dashboard import dashboard_ns
    api.add_namespace(dashboard_ns, path='/api/manager/dashboard')

    # ── Register Students Namespace ──────────────────────
    from app.blueprints.manager.students import students_ns
    api.add_namespace(students_ns, path='/api/manager/students')

    from app.blueprints.manager.attachments import attachments_ns
    api.add_namespace(attachments_ns, path='/api/manager/attachments')

    from app.blueprints.manager.announcements import announcements_ns
    api.add_namespace(announcements_ns, path='/api/manager/announcements')

    from app.blueprints.manager.departments import departments_ns
    api.add_namespace(departments_ns, path="/api/manager/departments")

    # ── Register Blueprints ──────────────────────────────
    from app.blueprints.auth.routes import auth_bp
    app.register_blueprint(auth_bp, url_prefix="/api/auth")

    return app