from datetime import date, datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.schemas.savings_goal import SavingsGoalCreate, SavingsGoalUpdate
from app.services.goal_service import SavingsGoalNotFoundError, SavingsGoalService


NOW = datetime.now(timezone.utc)


def goal_object(*, user_id, goal_id=None, target=Decimal("50000.00"), current=Decimal("12500.00")):
    return SimpleNamespace(
        id=goal_id or uuid4(),
        user_id=user_id,
        name="Emergency fund",
        target_amount=target,
        current_amount=current,
        target_date=date(2026, 12, 31),
        created_at=NOW,
        updated_at=NOW,
    )


class FakeRepository:
    def __init__(self, goal=None):
        self.goal = goal
        self.created = None
        self.updated = None
        self.deleted = None

    def create(self, db, *, goal):
        self.created = goal
        return goal

    def get_by_id(self, db, *, user_id, goal_id):
        return self.goal

    def list(self, db, *, user_id):
        return [self.goal] if self.goal else []

    def update(self, db, goal):
        self.updated = goal
        return goal

    def delete(self, db, goal):
        self.deleted = goal


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


def test_create_goal_calculates_progress_and_remaining():
    user_id = uuid4()
    repo = FakeRepository()
    service = SavingsGoalService(repo)

    result = service.create(
        FakeSession(),
        user_id=user_id,
        data=SavingsGoalCreate(
            name="  Emergency fund  ",
            target_amount=Decimal("50000.00"),
            current_amount=Decimal("12500.00"),
            target_date=date(2026, 12, 31),
        ),
    )

    assert result.name == "Emergency fund"
    assert result.remaining_amount == Decimal("37500.00")
    assert result.progress_percentage == Decimal("25.00")
    assert repo.created.user_id == user_id


def test_create_goal_rejects_current_amount_above_target():
    service = SavingsGoalService(FakeRepository())

    with pytest.raises(ValueError, match="current_amount cannot exceed target_amount"):
        service.create(
            FakeSession(),
            user_id=uuid4(),
            data=SavingsGoalCreate(
                name="Vacation",
                target_amount=Decimal("10000.00"),
                current_amount=Decimal("12000.00"),
            ),
        )


def test_update_validates_new_target_against_existing_progress():
    user_id = uuid4()
    goal = goal_object(user_id=user_id)
    service = SavingsGoalService(FakeRepository(goal=goal))

    with pytest.raises(ValueError, match="current_amount cannot exceed target_amount"):
        service.update(
            FakeSession(),
            user_id=user_id,
            goal_id=goal.id,
            data=SavingsGoalUpdate(target_amount=Decimal("10000.00")),
        )


def test_update_changes_only_supplied_fields():
    user_id = uuid4()
    goal = goal_object(user_id=user_id)
    repo = FakeRepository(goal=goal)
    service = SavingsGoalService(repo)

    result = service.update(
        FakeSession(),
        user_id=user_id,
        goal_id=goal.id,
        data=SavingsGoalUpdate(name="  Travel fund  "),
    )

    assert result.name == "Travel fund"
    assert result.target_amount == Decimal("50000.00")
    assert repo.updated is goal


def test_get_rejects_missing_goal():
    service = SavingsGoalService(FakeRepository(goal=None))

    with pytest.raises(SavingsGoalNotFoundError):
        service.get(FakeSession(), user_id=uuid4(), goal_id=uuid4())


def test_delete_rejects_missing_goal():
    service = SavingsGoalService(FakeRepository(goal=None))

    with pytest.raises(SavingsGoalNotFoundError):
        service.delete(FakeSession(), user_id=uuid4(), goal_id=uuid4())
