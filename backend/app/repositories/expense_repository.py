from datetime import date
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.expense import Expense


class ExpenseRepository:
    """Persistence operations for expenses.

    User ownership is always part of the query so callers cannot accidentally
    read or mutate another user's expenses.
    """

    def create(self, db: Session, *, user_id: UUID, expense: Expense) -> Expense:
        db.add(expense)
        db.flush()
        db.refresh(expense)
        return expense

    def get_by_id(self, db: Session, *, user_id: UUID, expense_id: UUID) -> Expense | None:
        statement = select(Expense).where(
            Expense.id == expense_id,
            Expense.user_id == user_id,
        )
        return db.scalar(statement)

    def list(
        self,
        db: Session,
        *,
        user_id: UUID,
        page: int,
        page_size: int,
        category_id: UUID | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> tuple[list[Expense], int]:
        filters = [Expense.user_id == user_id]

        if category_id is not None:
            filters.append(Expense.category_id == category_id)
        if start_date is not None:
            filters.append(Expense.expense_date >= start_date)
        if end_date is not None:
            filters.append(Expense.expense_date <= end_date)

        total = db.scalar(select(func.count(Expense.id)).where(*filters)) or 0
        statement = (
            select(Expense)
            .where(*filters)
            .order_by(Expense.expense_date.desc(), Expense.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(db.scalars(statement).all()), total

    def update(self, db: Session, expense: Expense) -> Expense:
        db.flush()
        db.refresh(expense)
        return expense

    def delete(self, db: Session, expense: Expense) -> None:
        db.delete(expense)
        db.flush()

    def category_belongs_to_user(
        self,
        db: Session,
        *,
        user_id: UUID,
        category_id: UUID,
    ) -> bool:
        statement = select(Category.id).where(
            Category.id == category_id,
            Category.user_id == user_id,
        )
        return db.scalar(statement) is not None
