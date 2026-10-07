from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user_id
from app.schemas.common import PaginatedResponse
from app.schemas.expense import ExpenseCreate, ExpenseResponse, ExpenseUpdate
from app.services.expense_service import (
    ExpenseCategoryError,
    ExpenseNotFoundError,
    ExpenseService,
)

router = APIRouter(prefix="/expenses", tags=["expenses"])
service = ExpenseService()


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> ExpenseResponse:
    try:
        return service.create(db, user_id=user_id, data=data)
    except ExpenseCategoryError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("", response_model=PaginatedResponse[ExpenseResponse])
def list_expenses(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    category_id: UUID | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> PaginatedResponse[ExpenseResponse]:
    try:
        items, meta = service.list(
            db,
            user_id=user_id,
            page=page,
            page_size=page_size,
            category_id=category_id,
            start_date=start_date,
            end_date=end_date,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return PaginatedResponse(items=items, meta=meta)


@router.get("/{expense_id}", response_model=ExpenseResponse)
def get_expense(
    expense_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> ExpenseResponse:
    try:
        return service.get(db, user_id=user_id, expense_id=expense_id)
    except ExpenseNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: UUID,
    data: ExpenseUpdate,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> ExpenseResponse:
    try:
        return service.update(db, user_id=user_id, expense_id=expense_id, data=data)
    except ExpenseNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ExpenseCategoryError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> Response:
    try:
        service.delete(db, user_id=user_id, expense_id=expense_id)
    except ExpenseNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return Response(status_code=status.HTTP_204_NO_CONTENT)
