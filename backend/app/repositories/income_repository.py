from datetime import date
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.income import Income


class IncomeRepository:
    """Persistence operations for income records, always scoped to a user."""

    def create(self, db: Session, *, income: Income) -> Income:
        db.add(income)
        db.flush()
        db.refresh(income)
        return income

    def get_by_id(self, db: Session, *, user_id: UUID, income_id: UUID) -> Income | None:
        statement = select(Income).where(
            Income.id == income_id,
            Income.user_id == user_id,
        )
        return db.scalar(statement)

    def list(
        self,
        db: Session,
        *,
        user_id: UUID,
        page: int,
        page_size: int,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> tuple[list[Income], int]:
        filters = [Income.user_id == user_id]
        if start_date is not None:
            filters.append(Income.income_date >= start_date)
        if end_date is not None:
            filters.append(Income.income_date <= end_date)

        total = db.scalar(select(func.count(Income.id)).where(*filters)) or 0
        statement = (
            select(Income)
            .where(*filters)
            .order_by(Income.income_date.desc(), Income.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(db.scalars(statement).all()), total

    def update(self, db: Session, income: Income) -> Income:
        db.flush()
        db.refresh(income)
        return income

    def delete(self, db: Session, income: Income) -> None:
        db.delete(income)
        db.flush()
