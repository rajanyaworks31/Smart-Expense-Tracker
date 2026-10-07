from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ExpenseCreate(BaseModel):
    category_id: UUID
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    description: str = Field(min_length=1, max_length=255)
    expense_date: date
    notes: str | None = None


class ExpenseUpdate(BaseModel):
    category_id: UUID | None = None
    amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    description: str | None = Field(default=None, min_length=1, max_length=255)
    expense_date: date | None = None
    notes: str | None = None


class ExpenseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    category_id: UUID
    amount: Decimal
    description: str
    expense_date: date
    notes: str | None
    created_at: datetime
    updated_at: datetime
