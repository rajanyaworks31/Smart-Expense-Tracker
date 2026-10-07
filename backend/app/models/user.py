from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    categories = relationship(
        "Category",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="Category.user_id",
        overlaps="expenses,budgets,category",
    )
    expenses = relationship(
        "Expense",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="Expense.user_id",
        overlaps="categories,expenses,budgets,category",
    )
    income_records = relationship(
        "Income",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="Income.user_id",
    )
    budgets = relationship(
        "Budget",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="Budget.user_id",
        overlaps="categories,budgets,category",
    )
    savings_goals = relationship(
        "SavingsGoal",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="SavingsGoal.user_id",
    )
    financial_insights = relationship(
        "FinancialInsight",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="FinancialInsight.user_id",
    )
