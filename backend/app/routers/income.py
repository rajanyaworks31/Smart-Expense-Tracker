from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user_id
from app.schemas.common import PaginatedResponse
from app.schemas.income import IncomeCreate, IncomeResponse, IncomeUpdate
from app.services.income_service import IncomeNotFoundError, IncomeService

router = APIRouter(prefix="/income", tags=["income"])
service = IncomeService()


@router.post("", response_model=IncomeResponse, status_code=status.HTTP_201_CREATED)
def create_income(
    data: IncomeCreate,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> IncomeResponse:
    return service.create(db, user_id=user_id, data=data)


@router.get("", response_model=PaginatedResponse[IncomeResponse])
def list_income(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> PaginatedResponse[IncomeResponse]:
    try:
        items, meta = service.list(
            db,
            user_id=user_id,
            page=page,
            page_size=page_size,
            start_date=start_date,
            end_date=end_date,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return PaginatedResponse(items=items, meta=meta)


@router.get("/{income_id}", response_model=IncomeResponse)
def get_income(
    income_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> IncomeResponse:
    try:
        return service.get(db, user_id=user_id, income_id=income_id)
    except IncomeNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/{income_id}", response_model=IncomeResponse)
def update_income(
    income_id: UUID,
    data: IncomeUpdate,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> IncomeResponse:
    try:
        return service.update(db, user_id=user_id, income_id=income_id, data=data)
    except IncomeNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/{income_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_income(
    income_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> Response:
    try:
        service.delete(db, user_id=user_id, income_id=income_id)
    except IncomeNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return Response(status_code=status.HTTP_204_NO_CONTENT)
