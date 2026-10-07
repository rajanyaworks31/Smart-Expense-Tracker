from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.savings_goal import SavingsGoal


class SavingsGoalRepository:
    def create(self, db: Session, *, goal: SavingsGoal) -> SavingsGoal:
        db.add(goal)
        db.flush()
        db.refresh(goal)
        return goal

    def get_by_id(self, db: Session, *, user_id: UUID, goal_id: UUID) -> SavingsGoal | None:
        return db.scalar(
            select(SavingsGoal).where(
                SavingsGoal.id == goal_id,
                SavingsGoal.user_id == user_id,
            )
        )

    def list(self, db: Session, *, user_id: UUID) -> list[SavingsGoal]:
        return list(
            db.scalars(
                select(SavingsGoal)
                .where(SavingsGoal.user_id == user_id)
                .order_by(SavingsGoal.target_date.asc().nulls_last(), SavingsGoal.created_at.desc())
            ).all()
        )

    def update(self, db: Session, goal: SavingsGoal) -> SavingsGoal:
        db.flush()
        db.refresh(goal)
        return goal

    def delete(self, db: Session, goal: SavingsGoal) -> None:
        db.delete(goal)
        db.flush()
