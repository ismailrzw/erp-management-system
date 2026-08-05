from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from app.config import Config
from app.extensions import mongo

jwt = JWTManager()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    CORS(app)
    jwt.init_app(app)
    mongo.init_app(app)

    from app.blueprints.auth.routes import auth_bp
    from app.blueprints.manager.students import students_bp
    from app.blueprints.student.groups import student_groups_bp
    from app.blueprints.manager.groups import manager_groups_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(students_bp, url_prefix="/api/manager/students")
    app.register_blueprint(student_groups_bp, url_prefix="/api/student/groups")
    app.register_blueprint(manager_groups_bp, url_prefix="/api/manager/groups")

    from app.utils.error_handlers import register_error_handlers
    register_error_handlers(app)

    return app
