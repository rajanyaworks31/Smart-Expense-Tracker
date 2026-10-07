from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BudgetCreate(BaseModel):
    category_id: UUID | None = None
    name: str = Field(min_length=1, max_length=120)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    period: str = Field(default="monthly", pattern="^monthly$")
    start_date: date
    end_date: date


class BudgetUpdate(BaseModel):
    category_id: UUID | None = None
    name: str | None = Field(default=None, min_length=1, max_length=120)
    amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    period: str | None = Field(default=None, pattern="^monthly$")
    start_date: date | None = None
    end_date: date | None = None


class BudgetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    category_id: UUID | None
    name: str
    amount: Decimal
    period: str
    start_date: date
    end_date: date
    created_at: datetime
    updated_at: datetime
    spent: Decimal
    remaining: Decimal
    utilization_percentage: Decimal
