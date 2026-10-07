from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.dependencies import get_current_user_id
from app.main import app
from app.schemas.expense import ExpenseResponse
import app.routers.expenses as expenses_router


USER_ID = uuid4()
EXPENSE_ID = uuid4()
CATEGORY_ID = uuid4()
NOW = datetime.now(timezone.utc)


def fake_db():
    yield object()


def fake_user_id() -> UUID:
    return USER_ID


def expense_response() -> ExpenseResponse:
    return ExpenseResponse(
        id=EXPENSE_ID,
        category_id=CATEGORY_ID,
        amount=Decimal("450.00"),
        description="Starbucks",
        expense_date=date(2026, 8, 10),
        notes=None,
        created_at=NOW,
        updated_at=NOW,
    )


class FakeService:
    def create(self, db, *, user_id, data):
        assert user_id == USER_ID
        return expense_response()

    def list(self, db, *, user_id, page, page_size, category_id=None, start_date=None, end_date=None):
        assert user_id == USER_ID
        return [expense_response()], {
            "page": page,
            "page_size": page_size,
            "total": 1,
            "total_pages": 1,
        }

    def get(self, db, *, user_id, expense_id):
        assert user_id == USER_ID
        assert expense_id == EXPENSE_ID
        return expense_response()

    def update(self, db, *, user_id, expense_id, data):
        assert user_id == USER_ID
        assert expense_id == EXPENSE_ID
        return expense_response()

    def delete(self, db, *, user_id, expense_id):
        assert user_id == USER_ID
        assert expense_id == EXPENSE_ID


def test_expense_routes_require_authentication():
    with TestClient(app) as client:
        response = client.get(f"/api/v1/expenses/{EXPENSE_ID}")

    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication is required"


def test_expense_crud_routes_return_documented_shapes(monkeypatch):
    monkeypatch.setattr(expenses_router, "service", FakeService())
    app.dependency_overrides[get_current_user_id] = fake_user_id
    app.dependency_overrides[get_db] = fake_db

    try:
        with TestClient(app) as client:
            created = client.post(
                "/api/v1/expenses",
                json={
                    "category_id": str(CATEGORY_ID),
                    "amount": "450.00",
                    "description": "Starbucks",
                    "expense_date": "2026-08-10",
                },
            )
            listed = client.get("/api/v1/expenses?page=1&page_size=20")
            fetched = client.get(f"/api/v1/expenses/{EXPENSE_ID}")
            updated = client.patch(
                f"/api/v1/expenses/{EXPENSE_ID}",
                json={"description": "Updated coffee"},
            )
            deleted = client.delete(f"/api/v1/expenses/{EXPENSE_ID}")

        assert created.status_code == 201
        assert created.json()["id"] == str(EXPENSE_ID)
        assert listed.status_code == 200
        assert listed.json()["meta"]["total"] == 1
        assert fetched.status_code == 200
        assert updated.status_code == 200
        assert deleted.status_code == 204
    finally:
        app.dependency_overrides.clear()


def test_expense_list_validates_query_bounds():
    app.dependency_overrides[get_current_user_id] = fake_user_id
    app.dependency_overrides[get_db] = fake_db

    try:
        with TestClient(app) as client:
            response = client.get("/api/v1/expenses?page=0&page_size=101")

        assert response.status_code == 422
    finally:
        app.dependency_overrides.clear()
