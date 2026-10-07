from __future__ import annotations

from calendar import monthrange
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.budget import Budget
from app.models.category import Category
from app.models.expense import Expense
from app.models.income import Income
from app.schemas.analytics import (
    AnalyticsSummary,
    BudgetUtilization,
    CategorySpending,
    MonthlyTrend,
    MoneyLeak,
    MoneyLeakReport,
    SpendingForecast,
)

_CENTS = Decimal("0.01")
_HUNDRED = Decimal("100")
_ZERO = Decimal("0.00")


def _money(value: Decimal) -> Decimal:
    return Decimal(value).quantize(_CENTS, rounding=ROUND_HALF_UP)


def _percentage(part: Decimal, total: Decimal) -> Decimal:
    if total <= 0:
        return _ZERO
    return (part * _HUNDRED / total).quantize(_CENTS, rounding=ROUND_HALF_UP)


def _month_start(value: date) -> date:
    return value.replace(day=1)


def _next_month(value: date) -> date:
    if value.month == 12:
        return date(value.year + 1, 1, 1)
    return date(value.year, value.month + 1, 1)


def _month_label(value: date) -> str:
    return f"{value.year:04d}-{value.month:02d}"


class AnalyticsService:
    """Calculate authoritative financial metrics from user-owned database rows."""

    @staticmethod
    def calculate_summary(
        *,
        start_date: date,
        end_date: date,
        expenses: list[tuple[Expense, str]],
        incomes: list[Income],
        budgets: list[Budget],
    ) -> AnalyticsSummary:
        if start_date > end_date:
            raise ValueError("start_date must be on or before end_date")

        total_expenses = sum((Decimal(expense.amount) for expense, _ in expenses), _ZERO)
        total_income = sum((Decimal(income.amount) for income in incomes), _ZERO)
        net_cash_flow = total_income - total_expenses
        savings_rate = _percentage(net_cash_flow, total_income)

        category_totals: dict[UUID, tuple[str, Decimal]] = {}
        for expense, category_name in expenses:
            amount = Decimal(expense.amount)
            current_name, current_total = category_totals.get(
                expense.category_id,
                (category_name, _ZERO),
            )
            category_totals[expense.category_id] = (current_name, current_total + amount)

        category_breakdown = [
            CategorySpending(
                category_id=category_id,
                category_name=name,
                amount=_money(amount),
                percentage=_percentage(amount, total_expenses),
            )
            for category_id, (name, amount) in sorted(
                category_totals.items(),
                key=lambda item: item[1][1],
                reverse=True,
            )
        ]

        monthly_trends: list[MonthlyTrend] = []
        month = _month_start(start_date)
        end_month = _month_start(end_date)
        while month <= end_month:
            month_end = date(month.year, month.month, monthrange(month.year, month.month)[1])
            month_expenses = sum(
                (
                    Decimal(expense.amount)
                    for expense, _ in expenses
                    if month <= expense.expense_date <= month_end
                ),
                _ZERO,
            )
            month_income = sum(
                (
                    Decimal(income.amount)
                    for income in incomes
                    if month <= income.income_date <= month_end
                ),
                _ZERO,
            )
            monthly_trends.append(
                MonthlyTrend(
                    month=_month_label(month),
                    income=_money(month_income),
                    expenses=_money(month_expenses),
                    net_cash_flow=_money(month_income - month_expenses),
                )
            )
            month = _next_month(month)

        budget_utilization: list[BudgetUtilization] = []
        for budget in budgets:
            budget_start = max(start_date, budget.start_date)
            budget_end = min(end_date, budget.end_date)
            if budget_start > budget_end:
                continue

            spent = sum(
                (
                    Decimal(expense.amount)
                    for expense, _ in expenses
                    if budget_start <= expense.expense_date <= budget_end
                    and (budget.category_id is None or expense.category_id == budget.category_id)
                ),
                _ZERO,
            )
            limit = Decimal(budget.amount)
            budget_utilization.append(
                BudgetUtilization(
                    budget_id=budget.id,
                    budget_name=budget.name,
                    limit=_money(limit),
                    spent=_money(spent),
                    remaining=_money(limit - spent),
                    utilization_percentage=_percentage(spent, limit),
                )
            )

        return AnalyticsSummary(
            start_date=start_date,
            end_date=end_date,
            total_income=_money(total_income),
            total_expenses=_money(total_expenses),
            net_cash_flow=_money(net_cash_flow),
            savings_rate=savings_rate,
            category_breakdown=category_breakdown,
            monthly_trends=monthly_trends,
            budget_utilization=budget_utilization,
        )

    def money_leaks(
        self,
        db: Session,
        *,
        user_id: UUID,
        start_date: date,
        end_date: date,
        min_increase_percentage: Decimal = Decimal("20.00"),
        min_increase_amount: Decimal = Decimal("100.00"),
        limit: int = 5,
    ) -> MoneyLeakReport:
        if start_date > end_date:
            raise ValueError("start_date must be on or before end_date")
        if min_increase_percentage < 0 or min_increase_amount < 0:
            raise ValueError("leak thresholds must be non-negative")
        if limit < 1:
            raise ValueError("limit must be at least 1")

        period_days = (end_date - start_date).days + 1
        comparison_end = start_date.fromordinal(start_date.toordinal() - 1)
        comparison_start = comparison_end.fromordinal(comparison_end.toordinal() - period_days + 1)

        rows = db.execute(
            select(Expense, Category.name)
            .join(
                Category,
                (Expense.category_id == Category.id) & (Expense.user_id == Category.user_id),
            )
            .where(
                Expense.user_id == user_id,
                Expense.expense_date >= comparison_start,
                Expense.expense_date <= end_date,
            )
        ).all()

        current: dict[UUID, tuple[str, Decimal]] = {}
        previous: dict[UUID, tuple[str, Decimal]] = {}
        for expense, category_name in rows:
            target = current if start_date <= expense.expense_date <= end_date else previous
            name, total = target.get(expense.category_id, (category_name, _ZERO))
            target[expense.category_id] = (name, total + Decimal(expense.amount))

        leaks: list[MoneyLeak] = []
        for category_id in current.keys() | previous.keys():
            fallback_name = previous.get(category_id, ("", _ZERO))[0]
            current_name, current_amount = current.get(category_id, (fallback_name, _ZERO))
            _, previous_amount = previous.get(category_id, (current_name, _ZERO))
            increase = current_amount - previous_amount
            if previous_amount <= 0 or increase <= 0:
                continue

            increase_percentage = (increase * _HUNDRED / previous_amount).quantize(
                _CENTS,
                rounding=ROUND_HALF_UP,
            )
            if increase < min_increase_amount or increase_percentage < min_increase_percentage:
                continue

            leaks.append(
                MoneyLeak(
                    category_id=category_id,
                    category_name=current_name,
                    current_amount=_money(current_amount),
                    previous_amount=_money(previous_amount),
                    increase_amount=_money(increase),
                    increase_percentage=increase_percentage,
                    explanation=(
                        f"{current_name} spending increased by {_money(increase)} "
                        f"({increase_percentage}%) versus the previous period."
                    ),
                )
            )

        leaks.sort(key=lambda leak: leak.increase_amount, reverse=True)
        return MoneyLeakReport(
            start_date=start_date,
            end_date=end_date,
            comparison_start_date=comparison_start,
            comparison_end_date=comparison_end,
            leaks=leaks[:limit],
        )

    def spending_forecast(
        self,
        db: Session,
        *,
        user_id: UUID,
        start_date: date,
        end_date: date,
        as_of_date: date | None = None,
    ) -> SpendingForecast:
        if start_date > end_date:
            raise ValueError("start_date must be on or before end_date")

        effective_as_of = as_of_date or date.today()
        observed_end_date = min(end_date, effective_as_of)
        if observed_end_date < start_date:
            raise ValueError("forecast period has not started yet")

        total_days = (end_date - start_date).days + 1
        elapsed_days = (observed_end_date - start_date).days + 1
        remaining_days = total_days - elapsed_days

        observed_spend = db.execute(
            select(Expense.amount)
            .where(
                Expense.user_id == user_id,
                Expense.expense_date >= start_date,
                Expense.expense_date <= observed_end_date,
            )
        ).scalars().all()
        total_observed_spend = sum((Decimal(amount) for amount in observed_spend), _ZERO)
        daily_run_rate = total_observed_spend / Decimal(elapsed_days)
        projected_spend = _money(daily_run_rate * Decimal(total_days))

        return SpendingForecast(
            start_date=start_date,
            end_date=end_date,
            observed_end_date=observed_end_date,
            elapsed_days=elapsed_days,
            remaining_days=remaining_days,
            total_days=total_days,
            observed_spend=_money(total_observed_spend),
            projected_spend=projected_spend,
            daily_run_rate=_money(daily_run_rate),
            explanation=(
                f"Based on {_money(daily_run_rate)} per day across {elapsed_days} observed day(s), "
                f"projected spending for the full period is {_money(projected_spend)}."
            ),
        )

    def summary(
        self,
        db: Session,
        *,
        user_id: UUID,
        start_date: date,
        end_date: date,
    ) -> AnalyticsSummary:
        if start_date > end_date:
            raise ValueError("start_date must be on or before end_date")

        expenses = db.execute(
            select(Expense, Category.name)
            .join(
                Category,
                (Expense.category_id == Category.id) & (Expense.user_id == Category.user_id),
            )
            .where(
                Expense.user_id == user_id,
                Expense.expense_date >= start_date,
                Expense.expense_date <= end_date,
            )
        ).all()

        incomes = db.execute(
            select(Income)
            .where(
                Income.user_id == user_id,
                Income.income_date >= start_date,
                Income.income_date <= end_date,
            )
        ).scalars().all()

        budgets = db.execute(
            select(Budget)
            .where(
                Budget.user_id == user_id,
                Budget.start_date <= end_date,
                Budget.end_date >= start_date,
            )
            .order_by(Budget.start_date, Budget.name)
        ).scalars().all()

        return self.calculate_summary(
            start_date=start_date,
            end_date=end_date,
            expenses=expenses,
            incomes=incomes,
            budgets=budgets,
        )
