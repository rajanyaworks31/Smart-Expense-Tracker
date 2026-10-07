from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.models.savings_goal import SavingsGoal
from app.repositories.savings_goal_repository import SavingsGoalRepository
from app.schemas.savings_goal import SavingsGoalCreate, SavingsGoalResponse, SavingsGoalUpdate


class SavingsGoalNotFoundError(LookupError):
    pass


class SavingsGoalService:
    def __init__(self, repository: SavingsGoalRepository | None = None) -> None:
        self.repository = repository or SavingsGoalRepository()

    def create(self, db: Session, *, user_id: UUID, data: SavingsGoalCreate) -> SavingsGoalResponse:
        self._validate_amounts(data.target_amount, data.current_amount)
        goal = SavingsGoal(
            id=uuid4(),
            user_id=user_id,
            name=data.name.strip(),
            target_amount=data.target_amount,
            current_amount=data.current_amount,
            target_date=data.target_date,
        )
        created = self.repository.create(db, goal=goal)
        db.commit()
        db.refresh(created)
        return self._response(created)

    def get(self, db: Session, *, user_id: UUID, goal_id: UUID) -> SavingsGoalResponse:
        goal = self.repository.get_by_id(db, user_id=user_id, goal_id=goal_id)
        if goal is None:
            raise SavingsGoalNotFoundError("Savings goal not found")
        return self._response(goal)

    def list(self, db: Session, *, user_id: UUID) -> list[SavingsGoalResponse]:
        return [self._response(goal) for goal in self.repository.list(db, user_id=user_id)]

    def update(
        self,
        db: Session,
        *,
        user_id: UUID,
        goal_id: UUID,
        data: SavingsGoalUpdate,
    ) -> SavingsGoalResponse:
        goal = self.repository.get_by_id(db, user_id=user_id, goal_id=goal_id)
        if goal is None:
            raise SavingsGoalNotFoundError("Savings goal not found")

        updates = data.model_dump(exclude_unset=True)
        target_amount = updates.get("target_amount", goal.target_amount)
        current_amount = updates.get("current_amount", goal.current_amount)
        self._validate_amounts(target_amount, current_amount)

        if "name" in updates and updates["name"] is not None:
            updates["name"] = updates["name"].strip()
        for field, value in updates.items():
            setattr(goal, field, value)

        updated = self.repository.update(db, goal)
        db.commit()
        db.refresh(updated)
        return self._response(updated)

    def delete(self, db: Session, *, user_id: UUID, goal_id: UUID) -> None:
        goal = self.repository.get_by_id(db, user_id=user_id, goal_id=goal_id)
        if goal is None:
            raise SavingsGoalNotFoundError("Savings goal not found")
        self.repository.delete(db, goal)
        db.commit()

    @staticmethod
    def _response(goal: SavingsGoal) -> SavingsGoalResponse:
        remaining = max(goal.target_amount - goal.current_amount, Decimal("0.00"))
        progress = (goal.current_amount / goal.target_amount * Decimal("100")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        return SavingsGoalResponse.model_validate(
            {
                **{column.name: getattr(goal, column.name) for column in SavingsGoal.__table__.columns},
                "remaining_amount": remaining,
                "progress_percentage": progress,
            }
        )

    @staticmethod
    def _validate_amounts(target_amount: Decimal, current_amount: Decimal) -> None:
        if current_amount > target_amount:
            raise ValueError("current_amount cannot exceed target_amount")
