from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SavingsGoalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    target_amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    current_amount: Decimal = Field(default=Decimal("0.00"), ge=0, max_digits=12, decimal_places=2)
    target_date: date | None = None


class SavingsGoalUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    target_amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    current_amount: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    target_date: date | None = None


class SavingsGoalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    target_amount: Decimal
    current_amount: Decimal
    target_date: date | None
    created_at: datetime
    updated_at: datetime
    remaining_amount: Decimal
    progress_percentage: Decimal
