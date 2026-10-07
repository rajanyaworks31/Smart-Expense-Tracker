from datetime import date
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.budget import Budget
from app.models.category import Category
from app.models.expense import Expense


class BudgetRepository:
    def create(self, db: Session, *, budget: Budget) -> Budget:
        db.add(budget)
        db.flush()
        db.refresh(budget)
        return budget

    def get_by_id(self, db: Session, *, user_id: UUID, budget_id: UUID) -> Budget | None:
        return db.scalar(
            select(Budget).where(Budget.id == budget_id, Budget.user_id == user_id)
        )

    def list(self, db: Session, *, user_id: UUID) -> list[Budget]:
        return list(
            db.scalars(
                select(Budget)
                .where(Budget.user_id == user_id)
                .order_by(Budget.start_date.desc(), Budget.created_at.desc())
            ).all()
        )

    def update(self, db: Session, budget: Budget) -> Budget:
        db.flush()
        db.refresh(budget)
        return budget

    def delete(self, db: Session, budget: Budget) -> None:
        db.delete(budget)
        db.flush()

    def category_belongs_to_user(
        self, db: Session, *, user_id: UUID, category_id: UUID
    ) -> bool:
        return (
            db.scalar(
                select(Category.id).where(
                    Category.id == category_id,
                    Category.user_id == user_id,
                )
            )
            is not None
        )

    def spent_for_budget(self, db: Session, *, user_id: UUID, budget: Budget):
        statement = select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.user_id == user_id,
            Expense.expense_date >= budget.start_date,
            Expense.expense_date <= budget.end_date,
        )
        if budget.category_id is not None:
            statement = statement.where(Expense.category_id == budget.category_id)
        return db.scalar(statement) or 0
