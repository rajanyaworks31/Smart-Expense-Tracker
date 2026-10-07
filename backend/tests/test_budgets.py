from datetime import date, datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.schemas.budget import BudgetCreate, BudgetUpdate
from app.services.budget_service import BudgetCategoryError, BudgetNotFoundError, BudgetService


NOW = datetime.now(timezone.utc)


def budget_object(*, user_id, category_id=None, budget_id=None, amount=Decimal("10000.00")):
    return SimpleNamespace(
        id=budget_id or uuid4(),
        user_id=user_id,
        category_id=category_id,
        name="Monthly food",
        amount=amount,
        period="monthly",
        start_date=date(2026, 8, 1),
        end_date=date(2026, 8, 31),
        created_at=NOW,
        updated_at=NOW,
    )


class FakeRepository:
    def __init__(self, budget=None, category_exists=True, spent=Decimal("2500.00")):
        self.budget = budget
        self.category_exists = category_exists
        self.spent = spent
        self.created = None
        self.updated = None
        self.deleted = None

    def create(self, db, *, budget):
        self.created = budget
        return budget

    def get_by_id(self, db, *, user_id, budget_id):
        return self.budget

    def list(self, db, *, user_id):
        return [self.budget] if self.budget else []

    def update(self, db, budget):
        self.updated = budget
        return budget

    def delete(self, db, budget):
        self.deleted = budget

    def category_belongs_to_user(self, db, *, user_id, category_id):
        return self.category_exists

    def spent_for_budget(self, db, *, user_id, budget):
        return self.spent


class FakeSession:
    def __init__(self):
        self.commits = 0

    def commit(self):
        self.commits += 1

    def refresh(self, obj):
        # Mimic PostgreSQL server-generated timestamps after refresh.
        if getattr(obj, "created_at", None) is None:
            obj.created_at = NOW
        if getattr(obj, "updated_at", None) is None:
            obj.updated_at = NOW


def test_create_budget_scopes_category_and_calculates_utilization():
    user_id = uuid4()
    repo = FakeRepository(spent=Decimal("2500.00"))
    service = BudgetService(repo)

    result = service.create(
        FakeSession(),
        user_id=user_id,
        data=BudgetCreate(
            category_id=uuid4(),
            name="  Food  ",
            amount=Decimal("10000.00"),
            start_date=date(2026, 8, 1),
            end_date=date(2026, 8, 31),
        ),
    )

    assert result.name == "Food"
    assert result.spent == Decimal("2500.00")
    assert result.remaining == Decimal("7500.00")
    assert result.utilization_percentage == Decimal("25.00")
    assert repo.created.user_id == user_id


def test_create_budget_rejects_foreign_category():
    service = BudgetService(FakeRepository(category_exists=False))

    with pytest.raises(BudgetCategoryError):
        service.create(
            FakeSession(),
            user_id=uuid4(),
            data=BudgetCreate(
                category_id=uuid4(),
                name="Food",
                amount=Decimal("1000.00"),
                start_date=date(2026, 8, 1),
                end_date=date(2026, 8, 31),
            ),
        )


def test_budget_rejects_invalid_date_range():
    service = BudgetService(FakeRepository())

    with pytest.raises(ValueError, match="start_date cannot be after end_date"):
        service.create(
            FakeSession(),
            user_id=uuid4(),
            data=BudgetCreate(
                name="Food",
                amount=Decimal("1000.00"),
                start_date=date(2026, 8, 31),
                end_date=date(2026, 8, 1),
            ),
        )


def test_update_changes_only_supplied_fields():
    user_id = uuid4()
    budget = budget_object(user_id=user_id)
    repo = FakeRepository(budget=budget)
    service = BudgetService(repo)

    result = service.update(
        FakeSession(),
        user_id=user_id,
        budget_id=budget.id,
        data=BudgetUpdate(name="  Updated food  "),
    )

    assert result.name == "Updated food"
    assert result.amount == Decimal("10000.00")
    assert repo.updated is budget


def test_update_rejects_missing_budget():
    service = BudgetService(FakeRepository(budget=None))

    with pytest.raises(BudgetNotFoundError):
        service.update(
            FakeSession(),
            user_id=uuid4(),
            budget_id=uuid4(),
            data=BudgetUpdate(name="Updated"),
        )


def test_delete_rejects_missing_budget():
    service = BudgetService(FakeRepository(budget=None))

    with pytest.raises(BudgetNotFoundError):
        service.delete(FakeSession(), user_id=uuid4(), budget_id=uuid4())
