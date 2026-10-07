from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.dependencies import get_current_user_id
from app.main import app
from app.models.budget import Budget
from app.models.expense import Expense
from app.models.income import Income
from app.schemas.analytics import AnalyticsSummary, MoneyLeakReport
from app.services.analytics_service import AnalyticsService
import app.routers.analytics as analytics_router


USER_ID = uuid4()
OTHER_USER_ID = uuid4()
FOOD_ID = uuid4()
TRAVEL_ID = uuid4()
NOW = datetime.now(timezone.utc)


def make_expense(*, user_id, category_id, amount, expense_date, description):
    return Expense(
        id=uuid4(),
        user_id=user_id,
        category_id=category_id,
        amount=Decimal(amount),
        description=description,
        expense_date=expense_date,
        created_at=NOW,
        updated_at=NOW,
    )


def make_income(*, user_id, amount, income_date, source):
    return Income(
        id=uuid4(),
        user_id=user_id,
        amount=Decimal(amount),
        source=source,
        income_date=income_date,
        created_at=NOW,
        updated_at=NOW,
    )


def make_budget(*, user_id, category_id, amount, start_date, end_date, name):
    return Budget(
        id=uuid4(),
        user_id=user_id,
        category_id=category_id,
        name=name,
        amount=Decimal(amount),
        period="monthly",
        start_date=start_date,
        end_date=end_date,
        created_at=NOW,
        updated_at=NOW,
    )


def test_calculate_summary_uses_deterministic_decimal_arithmetic():
    start = date(2026, 8, 1)
    end = date(2026, 8, 31)
    expenses = [
        (make_expense(user_id=USER_ID, category_id=FOOD_ID, amount="100.00", expense_date=date(2026, 8, 5), description="Lunch"), "Food"),
        (make_expense(user_id=USER_ID, category_id=FOOD_ID, amount="50.00", expense_date=date(2026, 8, 15), description="Coffee"), "Food"),
        (make_expense(user_id=USER_ID, category_id=TRAVEL_ID, amount="150.00", expense_date=date(2026, 8, 20), description="Taxi"), "Transport"),
    ]
    incomes = [make_income(user_id=USER_ID, amount="1000.00", income_date=date(2026, 8, 1), source="Salary")]
    budgets = [make_budget(user_id=USER_ID, category_id=FOOD_ID, amount="200.00", start_date=start, end_date=end, name="Food")]

    summary = AnalyticsService.calculate_summary(
        start_date=start,
        end_date=end,
        expenses=expenses,
        incomes=incomes,
        budgets=budgets,
    )

    assert summary.total_income == Decimal("1000.00")
    assert summary.total_expenses == Decimal("300.00")
    assert summary.net_cash_flow == Decimal("700.00")
    assert summary.savings_rate == Decimal("70.00")
    assert summary.category_breakdown[0].category_name == "Food"
    assert summary.category_breakdown[0].amount == Decimal("150.00")
    assert summary.category_breakdown[0].percentage == Decimal("50.00")
    assert summary.budget_utilization[0].spent == Decimal("150.00")
    assert summary.budget_utilization[0].remaining == Decimal("50.00")
    assert summary.budget_utilization[0].utilization_percentage == Decimal("75.00")


def test_calculate_summary_builds_monthly_trends():
    summary = AnalyticsService.calculate_summary(
        start_date=date(2026, 7, 1),
        end_date=date(2026, 8, 31),
        expenses=[
            (make_expense(user_id=USER_ID, category_id=FOOD_ID, amount="100.00", expense_date=date(2026, 7, 10), description="July"), "Food"),
            (make_expense(user_id=USER_ID, category_id=FOOD_ID, amount="250.00", expense_date=date(2026, 8, 10), description="August"), "Food"),
        ],
        incomes=[
            make_income(user_id=USER_ID, amount="500.00", income_date=date(2026, 7, 1), source="Salary"),
            make_income(user_id=USER_ID, amount="600.00", income_date=date(2026, 8, 1), source="Salary"),
        ],
        budgets=[],
    )

    assert [(item.month, item.income, item.expenses, item.net_cash_flow) for item in summary.monthly_trends] == [
        ("2026-07", Decimal("500.00"), Decimal("100.00"), Decimal("400.00")),
        ("2026-08", Decimal("600.00"), Decimal("250.00"), Decimal("350.00")),
    ]


def test_money_leaks_detects_meaningful_category_increase():
    service = AnalyticsService()
    previous_start = date(2026, 7, 1)
    previous_end = date(2026, 7, 31)
    current_start = date(2026, 8, 1)
    current_end = date(2026, 8, 31)

    class FakeResult:
        def all(self):
            return [
                (make_expense(user_id=USER_ID, category_id=FOOD_ID, amount="200.00", expense_date=date(2026, 7, 10), description="July food"), "Food"),
                (make_expense(user_id=USER_ID, category_id=FOOD_ID, amount="350.00", expense_date=date(2026, 8, 10), description="August food"), "Food"),
            ]

    class FakeDB:
        def execute(self, statement):
            return FakeResult()

    report = service.money_leaks(
        FakeDB(),
        user_id=USER_ID,
        start_date=current_start,
        end_date=current_end,
        min_increase_percentage=Decimal("20.00"),
        min_increase_amount=Decimal("100.00"),
    )

    assert report.comparison_start_date == previous_start
    assert report.comparison_end_date == previous_end
    assert len(report.leaks) == 1
    assert report.leaks[0].category_name == "Food"
    assert report.leaks[0].previous_amount == Decimal("200.00")
    assert report.leaks[0].current_amount == Decimal("350.00")
    assert report.leaks[0].increase_amount == Decimal("150.00")
    assert report.leaks[0].increase_percentage == Decimal("75.00")


def test_money_leaks_respects_result_limit():
    service = AnalyticsService()
    current_start = date(2026, 8, 1)
    current_end = date(2026, 8, 31)

    category_ids = [uuid4() for _ in range(3)]

    class FakeResult:
        def all(self):
            return [
                (make_expense(user_id=USER_ID, category_id=category_ids[0], amount="500.00", expense_date=date(2026, 7, 10), description="July one"), "One"),
                (make_expense(user_id=USER_ID, category_id=category_ids[0], amount="800.00", expense_date=date(2026, 8, 10), description="August one"), "One"),
                (make_expense(user_id=USER_ID, category_id=category_ids[1], amount="400.00", expense_date=date(2026, 7, 10), description="July two"), "Two"),
                (make_expense(user_id=USER_ID, category_id=category_ids[1], amount="650.00", expense_date=date(2026, 8, 10), description="August two"), "Two"),
                (make_expense(user_id=USER_ID, category_id=category_ids[2], amount="300.00", expense_date=date(2026, 7, 10), description="July three"), "Three"),
                (make_expense(user_id=USER_ID, category_id=category_ids[2], amount="500.00", expense_date=date(2026, 8, 10), description="August three"), "Three"),
            ]

    class FakeDB:
        def execute(self, statement):
            return FakeResult()

    report = service.money_leaks(FakeDB(), user_id=USER_ID, start_date=current_start, end_date=current_end, limit=2)

    assert len(report.leaks) == 2
    assert report.leaks[0].increase_amount == Decimal("300.00")
    assert report.leaks[1].increase_amount == Decimal("250.00")


def test_money_leaks_rejects_invalid_thresholds_and_limit():
    service = AnalyticsService()
    fake_db = object()
    start = date(2026, 8, 1)
    end = date(2026, 8, 31)

    with pytest.raises(ValueError, match="thresholds"):
        service.money_leaks(fake_db, user_id=USER_ID, start_date=start, end_date=end, min_increase_amount=Decimal("-1"))

    with pytest.raises(ValueError, match="limit"):
        service.money_leaks(fake_db, user_id=USER_ID, start_date=start, end_date=end, limit=0)


def test_spending_forecast_projects_run_rate_for_current_period():
    service = AnalyticsService()
    start = date(2026, 8, 1)
    end = date(2026, 8, 31)
    as_of = date(2026, 8, 10)

    class FakeScalars:
        def all(self):
            return [Decimal("100.00"), Decimal("50.00")]

    class FakeResult:
        def scalars(self):
            return FakeScalars()

    class FakeDB:
        def execute(self, statement):
            return FakeResult()

    forecast = service.spending_forecast(
        FakeDB(),
        user_id=USER_ID,
        start_date=start,
        end_date=end,
        as_of_date=as_of,
    )

    assert forecast.observed_end_date == as_of
    assert forecast.elapsed_days == 10
    assert forecast.remaining_days == 21
    assert forecast.total_days == 31
    assert forecast.observed_spend == Decimal("150.00")
    assert forecast.daily_run_rate == Decimal("15.00")
    assert forecast.projected_spend == Decimal("465.00")


def test_spending_forecast_handles_zero_spend():
    service = AnalyticsService()
    start = date(2026, 8, 1)
    end = date(2026, 8, 31)

    class FakeScalars:
        def all(self):
            return []

    class FakeResult:
        def scalars(self):
            return FakeScalars()

    class FakeDB:
        def execute(self, statement):
            return FakeResult()

    forecast = service.spending_forecast(
        FakeDB(),
        user_id=USER_ID,
        start_date=start,
        end_date=end,
        as_of_date=date(2026, 8, 10),
    )

    assert forecast.observed_spend == Decimal("0.00")
    assert forecast.daily_run_rate == Decimal("0.00")
    assert forecast.projected_spend == Decimal("0.00")


def test_spending_forecast_rejects_future_only_period():
    service = AnalyticsService()

    with pytest.raises(ValueError, match="has not started"):
        service.spending_forecast(
            object(),
            user_id=USER_ID,
            start_date=date(2026, 9, 10),
            end_date=date(2026, 9, 30),
            as_of_date=date(2026, 9, 3),
        )


def test_spending_forecast_rejects_invalid_date_range():
    service = AnalyticsService()

    with pytest.raises(ValueError, match="start_date"):
        service.spending_forecast(
            object(),
            user_id=USER_ID,
            start_date=date(2026, 8, 31),
            end_date=date(2026, 8, 1),
            as_of_date=date(2026, 8, 31),
        )


def test_spending_forecast_route_requires_authentication():
    client = TestClient(app)
    response = client.get("/api/v1/analytics/spending-forecast?start_date=2026-08-01&end_date=2026-08-31")

    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication is required"


def test_money_leaks_ignores_small_or_non_increasing_changes():
    service = AnalyticsService()
    current_start = date(2026, 8, 1)
    current_end = date(2026, 8, 31)

    class FakeResult:
        def all(self):
            return [
                (make_expense(user_id=USER_ID, category_id=FOOD_ID, amount="500.00", expense_date=date(2026, 7, 10), description="July food"), "Food"),
                (make_expense(user_id=USER_ID, category_id=FOOD_ID, amount="550.00", expense_date=date(2026, 8, 10), description="August food"), "Food"),
                (make_expense(user_id=USER_ID, category_id=TRAVEL_ID, amount="300.00", expense_date=date(2026, 7, 10), description="July travel"), "Travel"),
                (make_expense(user_id=USER_ID, category_id=TRAVEL_ID, amount="250.00", expense_date=date(2026, 8, 10), description="August travel"), "Travel"),
            ]

    class FakeDB:
        def execute(self, statement):
            return FakeResult()

    report = service.money_leaks(
        FakeDB(),
        user_id=USER_ID,
        start_date=current_start,
        end_date=current_end,
    )

    assert report.leaks == []


def test_money_leaks_route_requires_authentication():
    client = TestClient(app)
    response = client.get("/api/v1/analytics/money-leaks?start_date=2026-08-01&end_date=2026-08-31")

    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication is required"


def test_money_leaks_route_returns_service_report(monkeypatch):
    report = MoneyLeakReport(
        start_date=date(2026, 8, 1),
        end_date=date(2026, 8, 31),
        comparison_start_date=date(2026, 7, 1),
        comparison_end_date=date(2026, 7, 31),
        leaks=[],
    )

    class FakeService:
        def money_leaks(self, db, *, user_id, start_date, end_date, min_increase_percentage, min_increase_amount, limit):
            assert user_id == USER_ID
            assert start_date == date(2026, 8, 1)
            assert end_date == date(2026, 8, 31)
            assert min_increase_percentage == Decimal("20.00")
            assert min_increase_amount == Decimal("100.00")
            assert limit == 5
            return report

    app.dependency_overrides[get_current_user_id] = lambda: USER_ID
    app.dependency_overrides[get_db] = lambda: iter([object()])
    monkeypatch.setattr(analytics_router, "service", FakeService())

    try:
        client = TestClient(app)
        response = client.get("/api/v1/analytics/money-leaks?start_date=2026-08-01&end_date=2026-08-31")

        assert response.status_code == 200
        assert response.json()["leaks"] == []
        assert response.json()["comparison_start_date"] == "2026-07-01"
    finally:
        app.dependency_overrides.clear()


def test_analytics_route_requires_authentication():
    client = TestClient(app)
    response = client.get("/api/v1/analytics/summary?start_date=2026-08-01&end_date=2026-08-31")

    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication is required"


def test_analytics_route_returns_service_summary(monkeypatch):
    summary = AnalyticsSummary(
        start_date=date(2026, 8, 1),
        end_date=date(2026, 8, 31),
        total_income=Decimal("1000.00"),
        total_expenses=Decimal("300.00"),
        net_cash_flow=Decimal("700.00"),
        savings_rate=Decimal("70.00"),
        category_breakdown=[],
        monthly_trends=[],
        budget_utilization=[],
    )

    class FakeService:
        def summary(self, db, *, user_id, start_date, end_date):
            assert user_id == USER_ID
            assert start_date == date(2026, 8, 1)
            assert end_date == date(2026, 8, 31)
            return summary

    def fake_db():
        yield object()

    app.dependency_overrides[get_current_user_id] = lambda: USER_ID
    app.dependency_overrides[get_db] = fake_db
    monkeypatch.setattr(analytics_router, "service", FakeService())

    try:
        client = TestClient(app)
        response = client.get("/api/v1/analytics/summary?start_date=2026-08-01&end_date=2026-08-31")

        assert response.status_code == 200
        assert response.json()["total_expenses"] == "300.00"
        assert response.json()["savings_rate"] == "70.00"
    finally:
        app.dependency_overrides.clear()


def test_analytics_route_rejects_invalid_date_range(monkeypatch):
    app.dependency_overrides[get_current_user_id] = lambda: USER_ID
    app.dependency_overrides[get_db] = lambda: iter([object()])
    monkeypatch.setattr(analytics_router, "service", AnalyticsService())

    try:
        client = TestClient(app)
        response = client.get("/api/v1/analytics/summary?start_date=2026-08-31&end_date=2026-08-01")

        assert response.status_code == 400
        assert "start_date" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()
