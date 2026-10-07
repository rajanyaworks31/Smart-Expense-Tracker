from datetime import date, datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.schemas.expense import ExpenseCreate, ExpenseUpdate
from app.services.expense_service import (
    ExpenseCategoryError,
    ExpenseNotFoundError,
    ExpenseService,
)


class FakeSession:
    def __init__(self) -> None:
        self.commits = 0

    def commit(self) -> None:
        self.commits += 1

    def refresh(self, obj) -> None:
        # Mimic SQLAlchemy refreshing server-generated timestamps from PostgreSQL.
        now = datetime.now(timezone.utc)
        if getattr(obj, "created_at", None) is None:
            obj.created_at = now
        if getattr(obj, "updated_at", None) is None:
            obj.updated_at = now


class FakeExpenseRepository:
    def __init__(self, expense=None, category_exists=True) -> None:
        self.expense = expense
        self.category_exists = category_exists
        self.created = None
        self.updated = None
        self.deleted = None

    def category_belongs_to_user(self, db, *, user_id, category_id):
        return self.category_exists

    def create(self, db, *, user_id, expense):
        self.created = expense
        return expense

    def get_by_id(self, db, *, user_id, expense_id):
        return self.expense

    def update(self, db, expense):
        self.updated = expense
        return expense

    def delete(self, db, expense):
        self.deleted = expense

    def list(self, db, *, user_id, page, page_size, category_id=None, start_date=None, end_date=None):
        items = [self.expense] if self.expense else []
        return items, len(items)


def expense_object(*, user_id, category_id, expense_id=None):
    now = datetime.now(timezone.utc)
    return SimpleNamespace(
        id=expense_id or uuid4(),
        user_id=user_id,
        category_id=category_id,
        amount=Decimal("450.00"),
        description="Starbucks",
        expense_date=date(2026, 8, 10),
        notes=None,
        created_at=now,
        updated_at=now,
    )


def test_create_expense_scopes_category_to_user():
    user_id = uuid4()
    category_id = uuid4()
    repo = FakeExpenseRepository(category_exists=True)
    service = ExpenseService(repo)
    db = FakeSession()

    result = service.create(
        db,
        user_id=user_id,
        data=ExpenseCreate(
            category_id=category_id,
            amount=Decimal("450.00"),
            description="  Starbucks  ",
            expense_date=date(2026, 8, 10),
        ),
    )

    assert result.amount == Decimal("450.00")
    assert repo.created.user_id == user_id
    assert repo.created.description == "Starbucks"
    assert db.commits == 1


def test_create_rejects_category_owned_by_another_user():
    repo = FakeExpenseRepository(category_exists=False)
    service = ExpenseService(repo)

    with pytest.raises(ExpenseCategoryError):
        service.create(
            FakeSession(),
            user_id=uuid4(),
            data=ExpenseCreate(
                category_id=uuid4(),
                amount=Decimal("100.00"),
                description="Test",
                expense_date=date(2026, 8, 10),
            ),
        )


def test_get_rejects_missing_or_other_user_expense():
    repo = FakeExpenseRepository(expense=None)
    service = ExpenseService(repo)

    with pytest.raises(ExpenseNotFoundError):
        service.get(FakeSession(), user_id=uuid4(), expense_id=uuid4())


def test_list_calculates_pagination_metadata():
    user_id = uuid4()
    expense = expense_object(user_id=user_id, category_id=uuid4())
    repo = FakeExpenseRepository(expense=expense)
    service = ExpenseService(repo)

    items, meta = service.list(
        FakeSession(),
        user_id=user_id,
        page=1,
        page_size=20,
    )

    assert len(items) == 1
    assert meta == {"page": 1, "page_size": 20, "total": 1, "total_pages": 1}


def test_list_rejects_invalid_date_range():
    service = ExpenseService(FakeExpenseRepository())

    with pytest.raises(ValueError, match="start_date cannot be after end_date"):
        service.list(
            FakeSession(),
            user_id=uuid4(),
            start_date=date(2026, 8, 20),
            end_date=date(2026, 8, 10),
        )


def test_update_changes_only_supplied_fields():
    user_id = uuid4()
    category_id = uuid4()
    expense = expense_object(user_id=user_id, category_id=category_id)
    repo = FakeExpenseRepository(expense=expense)
    service = ExpenseService(repo)

    result = service.update(
        FakeSession(),
        user_id=user_id,
        expense_id=expense.id,
        data=ExpenseUpdate(description="  Updated coffee  "),
    )

    assert result.description == "Updated coffee"
    assert result.amount == Decimal("450.00")
    assert repo.updated is expense


def test_delete_rejects_missing_expense():
    service = ExpenseService(FakeExpenseRepository(expense=None))

    with pytest.raises(ExpenseNotFoundError):
        service.delete(FakeSession(), user_id=uuid4(), expense_id=uuid4())
