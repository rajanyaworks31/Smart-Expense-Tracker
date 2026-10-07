from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class AnalyticsQuery(BaseModel):
    start_date: date
    end_date: date


class CategorySpending(BaseModel):
    category_id: UUID
    category_name: str
    amount: Decimal
    percentage: Decimal = Field(ge=0, le=100)


class MonthlyTrend(BaseModel):
    month: str = Field(pattern=r"^\d{4}-\d{2}$")
    income: Decimal
    expenses: Decimal
    net_cash_flow: Decimal


class BudgetUtilization(BaseModel):
    budget_id: UUID
    budget_name: str
    limit: Decimal
    spent: Decimal
    remaining: Decimal
    utilization_percentage: Decimal = Field(ge=0)


class AnalyticsSummary(BaseModel):
    start_date: date
    end_date: date
    total_income: Decimal
    total_expenses: Decimal
    net_cash_flow: Decimal
    savings_rate: Decimal
    category_breakdown: list[CategorySpending]
    monthly_trends: list[MonthlyTrend]
    budget_utilization: list[BudgetUtilization]


class MoneyLeak(BaseModel):
    category_id: UUID
    category_name: str
    current_amount: Decimal
    previous_amount: Decimal
    increase_amount: Decimal
    increase_percentage: Decimal
    explanation: str


class MoneyLeakReport(BaseModel):
    start_date: date
    end_date: date
    comparison_start_date: date
    comparison_end_date: date
    leaks: list[MoneyLeak]


class SpendingForecast(BaseModel):
    start_date: date
    end_date: date
    observed_end_date: date
    elapsed_days: int = Field(ge=1)
    remaining_days: int = Field(ge=0)
    total_days: int = Field(ge=1)
    observed_spend: Decimal
    projected_spend: Decimal
    daily_run_rate: Decimal
    explanation: str


class SpendingForecastReport(BaseModel):
    forecast: SpendingForecast
