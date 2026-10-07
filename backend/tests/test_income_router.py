from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.dependencies import get_current_user_id
from app.main import app
from app.schemas.income import IncomeResponse
import app.routers.income as income_router


USER_ID = uuid4()
INCOME_ID = uuid4()
NOW = datetime.now(timezone.utc)


def fake_db():
    yield object()


def fake_user_id() -> UUID:
    return USER_ID


def income_response() -> IncomeResponse:
    return IncomeResponse(
        id=INCOME_ID,
        amount=Decimal("65000.00"),
        source="Salary",
        income_date=date(2026, 8, 1),
        notes=None,
        created_at=NOW,
        updated_at=NOW,
    )


class FakeService:
    def create(self, db, *, user_id, data):
        assert user_id == USER_ID
        return income_response()

    def list(self, db, *, user_id, page, page_size, start_date=None, end_date=None):
        assert user_id == USER_ID
        return [income_response()], {
            "page": page,
            "page_size": page_size,
            "total": 1,
            "total_pages": 1,
        }

    def get(self, db, *, user_id, income_id):
        assert user_id == USER_ID
        assert income_id == INCOME_ID
        return income_response()

    def update(self, db, *, user_id, income_id, data):
        assert user_id == USER_ID
        assert income_id == INCOME_ID
        return income_response()

    def delete(self, db, *, user_id, income_id):
        assert user_id == USER_ID
        assert income_id == INCOME_ID


def test_income_routes_require_authentication():
    with TestClient(app) as client:
        response = client.get(f"/api/v1/income/{INCOME_ID}")

    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication is required"}


def test_income_crud_routes_return_documented_shapes(monkeypatch):
    monkeypatch.setattr(income_router, "service", FakeService())
    app.dependency_overrides[get_current_user_id] = fake_user_id
    app.dependency_overrides[get_db] = fake_db

    try:
        with TestClient(app) as client:
            created = client.post(
                "/api/v1/income",
                json={
                    "amount": "65000.00",
                    "source": "Salary",
                    "income_date": "2026-08-01",
                },
            )
            listed = client.get("/api/v1/income?page=1&page_size=20")
            fetched = client.get(f"/api/v1/income/{INCOME_ID}")
            updated = client.patch(
                f"/api/v1/income/{INCOME_ID}",
                json={"source": "Updated salary"},
            )
            deleted = client.delete(f"/api/v1/income/{INCOME_ID}")

        assert created.status_code == 201
        assert created.json()["id"] == str(INCOME_ID)
        assert listed.status_code == 200
        assert listed.json()["meta"]["total"] == 1
        assert fetched.status_code == 200
        assert updated.status_code == 200
        assert deleted.status_code == 204
    finally:
        app.dependency_overrides.clear()


def test_income_list_validates_query_bounds():
    app.dependency_overrides[get_current_user_id] = fake_user_id
    app.dependency_overrides[get_db] = fake_db

    try:
        with TestClient(app) as client:
            response = client.get("/api/v1/income?page=0&page_size=101")

        assert response.status_code == 422
    finally:
        app.dependency_overrides.clear()
