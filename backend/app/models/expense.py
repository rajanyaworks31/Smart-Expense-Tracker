from datetime import date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKeyConstraint, Index, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, foreign, mapped_column, relationship

from app.core.database import Base


class Expense(Base):
    __tablename__ = "expenses"
    __table_args__ = (
        ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        ForeignKeyConstraint(["user_id", "category_id"], ["categories.user_id", "categories.id"]),
        CheckConstraint("amount > 0", name="ck_expenses_amount_positive"),
        Index("ix_expenses_user_date", "user_id", "expense_date"),
        Index("ix_expenses_user_category_date", "user_id", "category_id", "expense_date"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    category_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    expense_date: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship(
        "User",
        back_populates="expenses",
        foreign_keys=[user_id],
        overlaps="categories,expenses,budgets,category",
    )
    category = relationship(
        "Category",
        back_populates="expenses",
        primaryjoin="and_(foreign(Expense.category_id) == Category.id, Expense.user_id == Category.user_id)",
        foreign_keys=[category_id],
        overlaps="user,expenses,budgets,category",
    )
