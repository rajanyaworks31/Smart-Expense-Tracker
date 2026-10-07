from datetime import date, datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.schemas.income import IncomeCreate, IncomeUpdate
from app.services.income_service import IncomeNotFoundError, IncomeService


class FakeSession:
    def __init__(self) -> None:
        self.commits = 0

    def commit(self) -> None:
        self.commits += 1

    def refresh(self, obj) -> None:
        now = datetime.now(timezone.utc)
        if getattr(obj, "created_at", None) is None:
            obj.created_at = now
        if getattr(obj, "updated_at", None) is None:
            obj.updated_at = now


class FakeIncomeRepository:
    def __init__(self, income=None) -> None:
        self.income = income
        self.created = None
        self.updated = None
        self.deleted = None

    def create(self, db, *, income):
        self.created = income
        return income

    def get_by_id(self, db, *, user_id, income_id):
        if self.income is None:
            return None
        return self.income if self.income.user_id == user_id and self.income.id == income_id else None

    def list(self, db, *, user_id, page, page_size, start_date=None, end_date=None):
        if self.income is None or self.income.user_id != user_id:
            return [], 0
        if start_date and self.income.income_date < start_date:
            return [], 0
        if end_date and self.income.income_date > end_date:
            return [], 0
        return [self.income], 1

    def update(self, db, income):
        self.updated = income
        return income

    def delete(self, db, income):
        self.deleted = income


def income_object(*, user_id, income_id=None):
    now = datetime.now(timezone.utc)
    return SimpleNamespace(
        id=income_id or uuid4(),
        user_id=user_id,
        amount=Decimal("65000.00"),
        source="Salary",
        income_date=date(2026, 8, 1),
        notes=None,
        created_at=now,
        updated_at=now,
    )


def test_create_income_scopes_record_to_current_user():
    user_id = uuid4()
    repo = FakeIncomeRepository()
    service = IncomeService(repo)

    result = service.create(
        FakeSession(),
        user_id=user_id,
        data=IncomeCreate(
            amount=Decimal("65000.00"),
            source="  Salary  ",
            income_date=date(2026, 8, 1),
        ),
    )

    assert result.amount == Decimal("65000.00")
    assert repo.created.user_id == user_id
    assert repo.created.source == "Salary"


def test_get_rejects_income_owned_by_another_user():
    owner_id = uuid4()
    income = income_object(user_id=owner_id)
    service = IncomeService(FakeIncomeRepository(income=income))

    with pytest.raises(IncomeNotFoundError):
        service.get(FakeSession(), user_id=uuid4(), income_id=income.id)


def test_list_calculates_pagination_metadata():
    user_id = uuid4()
    income = income_object(user_id=user_id)
    service = IncomeService(FakeIncomeRepository(income=income))

    items, meta = service.list(FakeSession(), user_id=user_id, page=1, page_size=20)

    assert len(items) == 1
    assert meta == {"page": 1, "page_size": 20, "total": 1, "total_pages": 1}


def test_list_rejects_invalid_date_range():
    service = IncomeService(FakeIncomeRepository())

    with pytest.raises(ValueError, match="start_date cannot be after end_date"):
        service.list(
            FakeSession(),
            user_id=uuid4(),
            start_date=date(2026, 8, 20),
            end_date=date(2026, 8, 1),
        )


def test_update_changes_only_supplied_fields():
    user_id = uuid4()
    income = income_object(user_id=user_id)
    repo = FakeIncomeRepository(income=income)
    service = IncomeService(repo)

    result = service.update(
        FakeSession(),
        user_id=user_id,
        income_id=income.id,
        data=IncomeUpdate(source="  Freelancing  "),
    )

    assert result.source == "Freelancing"
    assert result.amount == Decimal("65000.00")
    assert repo.updated is income


def test_delete_rejects_missing_income():
    service = IncomeService(FakeIncomeRepository())

    with pytest.raises(IncomeNotFoundError):
        service.delete(FakeSession(), user_id=uuid4(), income_id=uuid4())
