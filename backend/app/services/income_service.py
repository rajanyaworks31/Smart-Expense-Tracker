from datetime import date
from math import ceil
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.models.income import Income
from app.repositories.income_repository import IncomeRepository
from app.schemas.income import IncomeCreate, IncomeResponse, IncomeUpdate


class IncomeNotFoundError(LookupError):
    pass


class IncomeService:
    def __init__(self, repository: IncomeRepository | None = None) -> None:
        self.repository = repository or IncomeRepository()

    def create(
        self,
        db: Session,
        *,
        user_id: UUID,
        data: IncomeCreate,
    ) -> IncomeResponse:
        income = Income(
            id=uuid4(),
            user_id=user_id,
            amount=data.amount,
            source=data.source.strip(),
            income_date=data.income_date,
            notes=data.notes.strip() if data.notes else None,
        )
        created = self.repository.create(db, income=income)
        db.commit()
        db.refresh(created)
        return IncomeResponse.model_validate(created)

    def get(
        self,
        db: Session,
        *,
        user_id: UUID,
        income_id: UUID,
    ) -> IncomeResponse:
        income = self.repository.get_by_id(db, user_id=user_id, income_id=income_id)
        if income is None:
            raise IncomeNotFoundError("Income record not found")
        return IncomeResponse.model_validate(income)

    def list(
        self,
        db: Session,
        *,
        user_id: UUID,
        page: int = 1,
        page_size: int = 20,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> tuple[list[IncomeResponse], dict[str, int]]:
        if start_date and end_date and start_date > end_date:
            raise ValueError("start_date cannot be after end_date")

        incomes, total = self.repository.list(
            db,
            user_id=user_id,
            page=page,
            page_size=page_size,
            start_date=start_date,
            end_date=end_date,
        )
        total_pages = ceil(total / page_size) if total else 0
        return (
            [IncomeResponse.model_validate(income) for income in incomes],
            {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": total_pages,
            },
        )

    def update(
        self,
        db: Session,
        *,
        user_id: UUID,
        income_id: UUID,
        data: IncomeUpdate,
    ) -> IncomeResponse:
        income = self.repository.get_by_id(db, user_id=user_id, income_id=income_id)
        if income is None:
            raise IncomeNotFoundError("Income record not found")

        updates = data.model_dump(exclude_unset=True)
        if "source" in updates and updates["source"] is not None:
            updates["source"] = updates["source"].strip()
        if "notes" in updates and updates["notes"] is not None:
            updates["notes"] = updates["notes"].strip()

        for field, value in updates.items():
            setattr(income, field, value)

        updated = self.repository.update(db, income)
        db.commit()
        db.refresh(updated)
        return IncomeResponse.model_validate(updated)

    def delete(
        self,
        db: Session,
        *,
        user_id: UUID,
        income_id: UUID,
    ) -> None:
        income = self.repository.get_by_id(db, user_id=user_id, income_id=income_id)
        if income is None:
            raise IncomeNotFoundError("Income record not found")

        self.repository.delete(db, income)
        db.commit()
