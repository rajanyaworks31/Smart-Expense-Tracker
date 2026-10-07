from datetime import date
from math import ceil
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.repositories.expense_repository import ExpenseRepository
from app.schemas.expense import ExpenseCreate, ExpenseResponse, ExpenseUpdate


class ExpenseNotFoundError(LookupError):
    pass


class ExpenseCategoryError(ValueError):
    pass


class ExpenseService:
    def __init__(self, repository: ExpenseRepository | None = None) -> None:
        self.repository = repository or ExpenseRepository()

    def create(
        self,
        db: Session,
        *,
        user_id: UUID,
        data: ExpenseCreate,
    ) -> ExpenseResponse:
        self._ensure_category_belongs_to_user(
            db,
            user_id=user_id,
            category_id=data.category_id,
        )

        expense = Expense(
            id=uuid4(),
            user_id=user_id,
            category_id=data.category_id,
            amount=data.amount,
            description=data.description.strip(),
            expense_date=data.expense_date,
            notes=data.notes.strip() if data.notes else None,
        )
        created = self.repository.create(db, user_id=user_id, expense=expense)
        db.commit()
        db.refresh(created)
        return ExpenseResponse.model_validate(created)

    def get(
        self,
        db: Session,
        *,
        user_id: UUID,
        expense_id: UUID,
    ) -> ExpenseResponse:
        expense = self.repository.get_by_id(
            db,
            user_id=user_id,
            expense_id=expense_id,
        )
        if expense is None:
            raise ExpenseNotFoundError("Expense not found")
        return ExpenseResponse.model_validate(expense)

    def list(
        self,
        db: Session,
        *,
        user_id: UUID,
        page: int = 1,
        page_size: int = 20,
        category_id: UUID | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> tuple[list[ExpenseResponse], dict[str, int]]:
        if start_date and end_date and start_date > end_date:
            raise ValueError("start_date cannot be after end_date")

        expenses, total = self.repository.list(
            db,
            user_id=user_id,
            page=page,
            page_size=page_size,
            category_id=category_id,
            start_date=start_date,
            end_date=end_date,
        )
        total_pages = ceil(total / page_size) if total else 0
        return (
            [ExpenseResponse.model_validate(expense) for expense in expenses],
            {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": total_pages,
            },
        )

    def update(
        self,
        db: Session,
        *,
        user_id: UUID,
        expense_id: UUID,
        data: ExpenseUpdate,
    ) -> ExpenseResponse:
        expense = self.repository.get_by_id(
            db,
            user_id=user_id,
            expense_id=expense_id,
        )
        if expense is None:
            raise ExpenseNotFoundError("Expense not found")

        updates = data.model_dump(exclude_unset=True)
        if "category_id" in updates:
            self._ensure_category_belongs_to_user(
                db,
                user_id=user_id,
                category_id=updates["category_id"],
            )
        if "description" in updates and updates["description"] is not None:
            updates["description"] = updates["description"].strip()
        if "notes" in updates and updates["notes"] is not None:
            updates["notes"] = updates["notes"].strip()

        for field, value in updates.items():
            setattr(expense, field, value)

        updated = self.repository.update(db, expense)
        db.commit()
        db.refresh(updated)
        return ExpenseResponse.model_validate(updated)

    def delete(
        self,
        db: Session,
        *,
        user_id: UUID,
        expense_id: UUID,
    ) -> None:
        expense = self.repository.get_by_id(
            db,
            user_id=user_id,
            expense_id=expense_id,
        )
        if expense is None:
            raise ExpenseNotFoundError("Expense not found")

        self.repository.delete(db, expense)
        db.commit()

    def _ensure_category_belongs_to_user(
        self,
        db: Session,
        *,
        user_id: UUID,
        category_id: UUID,
    ) -> None:
        if not self.repository.category_belongs_to_user(
            db,
            user_id=user_id,
            category_id=category_id,
        ):
            raise ExpenseCategoryError("Category does not belong to the current user")
