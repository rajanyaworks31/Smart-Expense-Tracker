from datetime import date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKeyConstraint, Index, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, foreign, mapped_column, relationship

from app.core.database import Base


class Budget(Base):
    __tablename__ = "budgets"
    __table_args__ = (
        ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        ForeignKeyConstraint(["user_id", "category_id"], ["categories.user_id", "categories.id"]),
        CheckConstraint("amount > 0", name="ck_budgets_amount_positive"),
        CheckConstraint("end_date >= start_date", name="ck_budgets_valid_dates"),
        CheckConstraint("period IN ('monthly')", name="ck_budgets_supported_period"),
        Index("ix_budgets_user_dates", "user_id", "start_date", "end_date"),
        Index("ix_budgets_user_category", "user_id", "category_id"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    category_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    period: Mapped[str] = mapped_column(String(20), nullable=False, default="monthly")
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship(
        "User",
        back_populates="budgets",
        foreign_keys=[user_id],
        overlaps="categories,expenses,budgets,category",
    )
    category = relationship(
        "Category",
        back_populates="budgets",
        primaryjoin="and_(foreign(Budget.category_id) == Category.id, Budget.user_id == Category.user_id)",
        foreign_keys=[category_id],
        overlaps="user,expenses,budgets,category",
    )
