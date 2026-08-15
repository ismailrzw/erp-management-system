# backend/tests/test_auth.py
import sys
import os
import pytest
from app import create_app
from app.extensions import mongo
import bcrypt

# Add the parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    app.config["MONGO_URI"] = "mongodb://localhost:27017/pbl_test"
    
    with app.test_client() as client:
        with app.app_context():
            # Clean DB
            for collection in mongo.db.list_collection_names():
                mongo.db[collection].drop()
            
            # Create test manager
            password = "11223344"
            hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
            mongo.db.users.insert_one({
                "name": "Zaman Aziz",
                "email": "zamanaziz@bnu.edu.pk",
                "password_hash": hashed,
                "role": "pbl_manager",
                "deleted": False
            })
        yield client

def test_login_success(client):
    resp = client.post("/api/auth/login", json={
        "email": "zamanaziz@bnu.edu.pk",
        "password": "11223344"
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True
    assert "token" in data["data"]

def test_login_wrong_password(client):
    resp = client.post("/api/auth/login", json={
        "email": "zamanaziz@bnu.edu.pk",
        "password": "wrong"
    })
    assert resp.status_code == 401

def test_login_unknown_user(client):
    resp = client.post("/api/auth/login", json={
        "email": "unknown@bnu.edu.pk",
        "password": "test"
    })
    assert resp.status_code == 401

def test_me_endpoint(client):
    # Login first
    login_resp = client.post("/api/auth/login", json={
        "email": "zamanaziz@bnu.edu.pk",
        "password": "11223344"
    })
    token = login_resp.get_json()["data"]["token"]
    
    # Test /me
    resp = client.get("/api/auth/me", headers={
        "Authorization": f"Bearer {token}"
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["data"]["email"] == "zamanaziz@bnu.edu.pk"