from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKeyConstraint, String, UniqueConstraint, and_, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, foreign, mapped_column, relationship

from app.core.database import Base


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        UniqueConstraint("user_id", "name", name="uq_categories_user_name"),
        UniqueConstraint("user_id", "id", name="uq_categories_user_id"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    icon: Mapped[str | None] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="categories", foreign_keys=[user_id])
    expenses = relationship(
        "Expense",
        back_populates="category",
        primaryjoin="and_(foreign(Expense.category_id) == Category.id, Expense.user_id == Category.user_id)",
        foreign_keys="Expense.category_id",
        overlaps="user,expenses,budgets,category",
    )
    budgets = relationship(
        "Budget",
        back_populates="category",
        primaryjoin="and_(foreign(Budget.category_id) == Category.id, Budget.user_id == Category.user_id)",
        foreign_keys="Budget.category_id",
        overlaps="user,expenses,budgets,category",
    )
