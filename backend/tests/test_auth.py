from datetime import datetime, timezone
from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.main import app
from app.models.user import User
from app.routers import auth as auth_router


class FakeSession:
    def __init__(self):
        self.user = None

    def add(self, user):
        self.user = user

    def commit(self):
        return None

    def refresh(self, user):
        if user.id is None:
            user.id = uuid4()
        now = datetime.now(timezone.utc)
        if user.created_at is None:
            user.created_at = now
        if user.updated_at is None:
            user.updated_at = now

    def rollback(self):
        return None

    def get(self, model, user_id):
        if self.user is not None and self.user.id == user_id:
            return self.user
        return None



def test_password_hash_round_trip():
    encoded = hash_password("correct horse battery staple")

    assert encoded.startswith("scrypt$")
    assert verify_password("correct horse battery staple", encoded)
    assert not verify_password("wrong password", encoded)


def test_access_token_round_trip(monkeypatch):
    user_id = uuid4()
    monkeypatch.setattr("app.core.security.settings.jwt_secret_key", "test-secret-32-bytes-minimum-for-hs256")

    token = create_access_token(user_id)

    assert decode_access_token(token) == user_id


def test_protected_expense_endpoint_rejects_unauthenticated_request():
    client = TestClient(app)

    response = client.get("/api/v1/expenses")

    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication is required"


def test_register_sets_httponly_cookie(monkeypatch):
    db = FakeSession()
    app.dependency_overrides[get_db] = lambda: db
    monkeypatch.setattr(auth_router, "_get_user_by_email", lambda db, email: None)
    monkeypatch.setattr("app.core.security.settings.jwt_secret_key", "test-secret-32-bytes-minimum-for-hs256")

    try:
        client = TestClient(app)
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "rajanya@example.com",
                "password": "password123",
                "full_name": "Rajanya",
            },
        )

        assert response.status_code == 201
        assert response.json()["user"]["email"] == "rajanya@example.com"
        assert "smart_expense_access=" in response.headers["set-cookie"]
        assert "HttpOnly" in response.headers["set-cookie"]
    finally:
        app.dependency_overrides.clear()


def test_logout_clears_auth_cookie():
    client = TestClient(app)

    response = client.post("/api/v1/auth/logout")

    assert response.status_code == 204
    assert "smart_expense_access=\"\";" in response.headers["set-cookie"]
    assert "Max-Age=0" in response.headers["set-cookie"]
