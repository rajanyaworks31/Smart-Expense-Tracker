from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class IncomeCreate(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    source: str = Field(min_length=1, max_length=120)
    income_date: date
    notes: str | None = None


class IncomeUpdate(BaseModel):
    amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    source: str | None = Field(default=None, min_length=1, max_length=120)
    income_date: date | None = None
    notes: str | None = None


class IncomeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    amount: Decimal
    source: str
    income_date: date
    notes: str | None
    created_at: datetime
    updated_at: datetime
