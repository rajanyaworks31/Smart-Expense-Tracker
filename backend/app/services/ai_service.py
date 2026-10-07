from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.integrations.gemini import AICategorySuggestion, AIEconomyOutput, AIModelOutput, AIProvider, AIProviderError, GeminiProvider
from app.models.budget import Budget
from app.models.category import Category
from app.models.expense import Expense
from app.models.financial_insight import FinancialInsight
from app.models.income import Income
from app.models.savings_goal import SavingsGoal


class AIService:
    """Build bounded, user-owned financial context and delegate language work to Gemini."""

    def __init__(self, provider: AIProvider | None = None) -> None:
        self.provider = provider

    def _provider(self) -> AIProvider:
        if self.provider is not None:
            return self.provider
        if not settings.gemini_api_key:
            raise AIProviderError("Gemini API key is not configured")
        return GeminiProvider(settings.gemini_api_key, settings.gemini_model)

    def _financial_context(self, db: Session, *, user_id: UUID) -> dict:
        since = date.today() - timedelta(days=90)

        expenses = db.execute(
            select(Expense, Category.name)
            .join(
                Category,
                (Expense.category_id == Category.id) & (Expense.user_id == Category.user_id),
            )
            .where(Expense.user_id == user_id, Expense.expense_date >= since)
            .order_by(desc(Expense.expense_date), desc(Expense.created_at))
            .limit(100)
        ).all()

        income = db.execute(
            select(Income)
            .where(Income.user_id == user_id, Income.income_date >= since)
            .order_by(desc(Income.income_date), desc(Income.created_at))
            .limit(100)
        ).scalars().all()

        category_totals: dict[str, Decimal] = {}
        expense_rows: list[dict] = []
        total_expenses = Decimal("0")
        for expense, category_name in expenses:
            amount = Decimal(expense.amount)
            total_expenses += amount
            category_totals[category_name] = category_totals.get(category_name, Decimal("0")) + amount
            expense_rows.append(
                {
                    "date": expense.expense_date.isoformat(),
                    "category": category_name,
                    "amount": str(amount),
                    "description": expense.description,
                }
            )

        total_income = sum((Decimal(item.amount) for item in income), Decimal("0"))

        budgets = db.execute(
            select(Budget)
            .where(Budget.user_id == user_id, Budget.start_date <= date.today(), Budget.end_date >= since)
            .order_by(Budget.start_date, Budget.name)
            .limit(20)
        ).scalars().all()
        goals = db.execute(
            select(SavingsGoal)
            .where(SavingsGoal.user_id == user_id)
            .order_by(SavingsGoal.target_date, SavingsGoal.name)
            .limit(20)
        ).scalars().all()

        return {
            "period": {"from": since.isoformat(), "to": date.today().isoformat()},
            "totals": {
                "income": str(total_income),
                "expenses": str(total_expenses),
                "net": str(total_income - total_expenses),
            },
            "spending_by_category": {
                name: str(amount)
                for name, amount in sorted(category_totals.items(), key=lambda item: item[1], reverse=True)
            },
            "recent_expenses": expense_rows,
            "recent_income": [
                {
                    "date": item.income_date.isoformat(),
                    "source": item.source,
                    "amount": str(item.amount),
                }
                for item in income
            ],
            "budgets": [
                {
                    "name": budget.name,
                    "amount": str(budget.amount),
                    "period": budget.period,
                    "start_date": budget.start_date.isoformat(),
                    "end_date": budget.end_date.isoformat(),
                }
                for budget in budgets
            ],
            "savings_goals": [
                {
                    "name": goal.name,
                    "target_amount": str(goal.target_amount),
                    "current_amount": str(goal.current_amount),
                    "target_date": goal.target_date.isoformat() if goal.target_date else None,
                }
                for goal in goals
            ],
        }

    def _build_prompt(self, *, insight_type: str, context: dict, question: str | None = None) -> str:
        task = (
            f"Answer the user's question: {question}"
            if question
            else f"Create a financial insight of type '{insight_type}'."
        )
        return f"""
You are the AI layer of a personal expense tracker.

Rules:
- Use only the supplied financial context.
- Do not invent transactions, income, balances, dates, or percentages.
- Treat the numeric values as authoritative facts calculated by the application.
- Explain patterns in plain language; do not present guesses as facts.
- Do not give regulated financial, investment, tax, or legal advice.
- Keep the response concise and actionable.
- For a monthly story, compare the supplied month with the previous month and mention only changes supported by the supplied numbers.
- For an Ask Your Money question, answer directly and say when the supplied context is insufficient rather than guessing.
- Return exactly the requested structured fields.

Task: {task}

Financial context (already scoped to the authenticated user):
{context}
"""

    def _persist_insight(self, db: Session, *, user_id: UUID, output: AIModelOutput) -> FinancialInsight:
        insight = FinancialInsight(
            id=uuid4(),
            user_id=user_id,
            insight_type=output.insight_type,
            title=output.title,
            content=output.content,
            insight_metadata={"provider": "gemini", "model": settings.gemini_model},
        )
        db.add(insight)
        db.commit()
        db.refresh(insight)
        return insight

    def generate_insight(
        self,
        db: Session,
        *,
        user_id: UUID,
        insight_type: str,
    ) -> FinancialInsight:
        context = self._financial_context(db, user_id=user_id)
        prompt = self._build_prompt(insight_type=insight_type, context=context)
        output = self._provider().generate_insight(prompt=prompt)
        output.insight_type = insight_type
        return self._persist_insight(db, user_id=user_id, output=output)

    def ask(
        self,
        db: Session,
        *,
        user_id: UUID,
        question: str,
    ) -> AIModelOutput:
        context = self._financial_context(db, user_id=user_id)
        prompt = self._build_prompt(insight_type="ask", context=context, question=question)
        return self._provider().generate_insight(prompt=prompt)

    def economy_update(self, db: Session, *, user_id: UUID) -> AIEconomyOutput:
        context = self._financial_context(db, user_id=user_id)
        prompt = f"""
You are the India Economy Pulse layer of a personal expense tracker.

Search the live web before answering. Focus on meaningful economic developments in India from the
most recent reliable reporting available today, especially RBI policy/rates, inflation and consumer
prices, employment or growth, government economic policy, and major currency or cost-of-living moves.

Rules:
- Use Google Search grounding for every current claim; do not rely on memory for today's information.
- Prefer primary or authoritative sources such as RBI, Government of India, MoSPI, Ministry of Finance,
  and official releases, then reputable economic journalism when needed for context.
- Give 3 to 5 important developments, not a generic news dump.
- Explain briefly why each development could matter to an ordinary Indian household's spending, saving,
  borrowing, or purchasing power.
- Do not make personalized investment, tax, legal, or regulated financial recommendations.
- Do not invent figures, dates, sources, or certainty.
- The supplied personal context is only for relevance. Never present it as economic news.
- Return JSON matching the requested fields. The application will attach the actual grounded source list.
- Set updated_at to the current date/time as understood from the live search context.

Personal financial context (already scoped to this authenticated user):
{context}
"""
        output = self._provider().economy_update(prompt=prompt)
        output.updated_at = datetime.now(timezone.utc).isoformat()
        return output

    def monthly_story(
        self,
        db: Session,
        *,
        user_id: UUID,
        month: date | None = None,
    ) -> FinancialInsight:
        reference = month or date.today()
        target_month_end = reference.replace(day=1) - timedelta(days=1)
        target_month_start = target_month_end.replace(day=1)
        comparison_month_end = target_month_start - timedelta(days=1)
        comparison_month_start = comparison_month_end.replace(day=1)
        context = self._financial_context(db, user_id=user_id)

        current_expenses = db.execute(
            select(Expense, Category.name)
            .join(
                Category,
                (Expense.category_id == Category.id) & (Expense.user_id == Category.user_id),
            )
            .where(
                Expense.user_id == user_id,
                Expense.expense_date >= target_month_start,
                Expense.expense_date <= target_month_end,
            )
        ).all()
        previous_expenses = db.execute(
            select(Expense, Category.name)
            .join(
                Category,
                (Expense.category_id == Category.id) & (Expense.user_id == Category.user_id),
            )
            .where(
                Expense.user_id == user_id,
                Expense.expense_date >= comparison_month_start,
                Expense.expense_date <= comparison_month_end,
            )
        ).all()

        current_total = sum((Decimal(expense.amount) for expense, _ in current_expenses), Decimal("0"))
        previous_total = sum((Decimal(expense.amount) for expense, _ in previous_expenses), Decimal("0"))
        current_by_category: dict[str, Decimal] = {}
        previous_by_category: dict[str, Decimal] = {}
        for expense, category_name in current_expenses:
            current_by_category[category_name] = current_by_category.get(category_name, Decimal("0")) + Decimal(expense.amount)
        for expense, category_name in previous_expenses:
            previous_by_category[category_name] = previous_by_category.get(category_name, Decimal("0")) + Decimal(expense.amount)

        story_context = {
            "month": target_month_start.isoformat(),
            "current_month": {
                "total_expenses": str(current_total),
                "spending_by_category": {key: str(value) for key, value in sorted(current_by_category.items(), key=lambda item: item[1], reverse=True)},
            },
            "previous_month": {
                "total_expenses": str(previous_total),
                "spending_by_category": {key: str(value) for key, value in sorted(previous_by_category.items(), key=lambda item: item[1], reverse=True)},
            },
            "account_context": context,
        }
        prompt = self._build_prompt(
            insight_type="monthly_story",
            context=story_context,
        )
        output = self._provider().generate_insight(prompt=prompt)
        output.insight_type = "monthly_story"
        return self._persist_insight(db, user_id=user_id, output=output)

    def suggest_category(
        self,
        db: Session,
        *,
        user_id: UUID,
        description: str,
    ) -> tuple[Category, AICategorySuggestion]:
        categories = db.execute(
            select(Category)
            .where(Category.user_id == user_id)
            .order_by(Category.name)
        ).scalars().all()
        if not categories:
            raise AIProviderError("No categories are available for this user")

        allowed_categories = [category.name for category in categories]
        prompt = f"""
You are the category suggestion layer of a personal expense tracker.

Rules:
- Choose exactly one category from the allowed category list.
- Never invent a category name.
- Use only the expense description supplied below.
- Confidence must be between 0 and 1.
- Give a short reason for the suggestion.
- This is a suggestion only; the user will review it before saving.

Allowed categories: {allowed_categories}
Expense description: {description.strip()}
"""
        suggestion = self._provider().suggest_category(prompt=prompt)
        normalized = suggestion.category_name.strip().casefold()
        category = next(
            (item for item in categories if item.name.strip().casefold() == normalized),
            None,
        )
        if category is None:
            raise AIProviderError("Gemini suggested a category that is not available to this user")

        suggestion.category_name = category.name
        return category, suggestion
