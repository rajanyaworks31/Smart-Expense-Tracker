from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.models.budget import Budget
from app.repositories.budget_repository import BudgetRepository
from app.schemas.budget import BudgetCreate, BudgetResponse, BudgetUpdate


class BudgetNotFoundError(LookupError):
    pass


class BudgetCategoryError(ValueError):
    pass


class BudgetService:
    def __init__(self, repository: BudgetRepository | None = None) -> None:
        self.repository = repository or BudgetRepository()

    def create(self, db: Session, *, user_id: UUID, data: BudgetCreate) -> BudgetResponse:
        self._validate_dates(data.start_date, data.end_date)
        self._ensure_category(data.category_id, db=db, user_id=user_id)

        budget = Budget(
            id=uuid4(),
            user_id=user_id,
            category_id=data.category_id,
            name=data.name.strip(),
            amount=data.amount,
            period=data.period,
            start_date=data.start_date,
            end_date=data.end_date,
        )
        created = self.repository.create(db, budget=budget)
        db.commit()
        db.refresh(created)
        return self._response(db, user_id=user_id, budget=created)

    def get(self, db: Session, *, user_id: UUID, budget_id: UUID) -> BudgetResponse:
        budget = self.repository.get_by_id(db, user_id=user_id, budget_id=budget_id)
        if budget is None:
            raise BudgetNotFoundError("Budget not found")
        return self._response(db, user_id=user_id, budget=budget)

    def list(self, db: Session, *, user_id: UUID) -> list[BudgetResponse]:
        return [
            self._response(db, user_id=user_id, budget=budget)
            for budget in self.repository.list(db, user_id=user_id)
        ]

    def update(
        self,
        db: Session,
        *,
        user_id: UUID,
        budget_id: UUID,
        data: BudgetUpdate,
    ) -> BudgetResponse:
        budget = self.repository.get_by_id(db, user_id=user_id, budget_id=budget_id)
        if budget is None:
            raise BudgetNotFoundError("Budget not found")

        updates = data.model_dump(exclude_unset=True)
        if "category_id" in updates:
            self._ensure_category(updates["category_id"], db=db, user_id=user_id)
        start_date = updates.get("start_date", budget.start_date)
        end_date = updates.get("end_date", budget.end_date)
        self._validate_dates(start_date, end_date)

        if "name" in updates and updates["name"] is not None:
            updates["name"] = updates["name"].strip()
        for field, value in updates.items():
            setattr(budget, field, value)

        updated = self.repository.update(db, budget)
        db.commit()
        db.refresh(updated)
        return self._response(db, user_id=user_id, budget=updated)

    def delete(self, db: Session, *, user_id: UUID, budget_id: UUID) -> None:
        budget = self.repository.get_by_id(db, user_id=user_id, budget_id=budget_id)
        if budget is None:
            raise BudgetNotFoundError("Budget not found")
        self.repository.delete(db, budget)
        db.commit()

    def _response(self, db: Session, *, user_id: UUID, budget: Budget) -> BudgetResponse:
        spent = Decimal(str(self.repository.spent_for_budget(db, user_id=user_id, budget=budget)))
        remaining = max(budget.amount - spent, Decimal("0.00"))
        utilization = Decimal("0.00")
        if budget.amount:
            utilization = (spent / budget.amount * Decimal("100")).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
        return BudgetResponse.model_validate(
            {
                **{column.name: getattr(budget, column.name) for column in Budget.__table__.columns},
                "spent": spent,
                "remaining": remaining,
                "utilization_percentage": utilization,
            }
        )

    def _ensure_category(self, category_id: UUID | None, *, db: Session, user_id: UUID) -> None:
        if category_id is not None and not self.repository.category_belongs_to_user(
            db, user_id=user_id, category_id=category_id
        ):
            raise BudgetCategoryError("Category does not belong to the current user")

    @staticmethod
    def _validate_dates(start_date: date, end_date: date) -> None:
        if start_date > end_date:
            raise ValueError("start_date cannot be after end_date")
