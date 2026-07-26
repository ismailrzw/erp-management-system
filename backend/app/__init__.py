from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os

from .extensions import mongo
from .config import Config

def create_app():
    load_dotenv()
    
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Initialize extensions
    mongo.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Health check endpoint
    @app.route('/api/health')
    def health():
        return jsonify({
            'status': 'ok',
            'message': 'Backend is running'
        })
    
    # Register blueprints (we'll add these later)
    # from .routes.auth import auth_bp
    # app.register_blueprint(auth_bp, url_prefix='/api/auth')
    
    return app