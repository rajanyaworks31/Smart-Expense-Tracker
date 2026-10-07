from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user_id
from app.schemas.budget import BudgetCreate, BudgetResponse, BudgetUpdate
from app.services.budget_service import BudgetCategoryError, BudgetNotFoundError, BudgetService

router = APIRouter(prefix="/budgets", tags=["budgets"])
service = BudgetService()


@router.post("", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def create_budget(
    data: BudgetCreate,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> BudgetResponse:
    try:
        return service.create(db, user_id=user_id, data=data)
    except BudgetCategoryError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("", response_model=list[BudgetResponse])
def list_budgets(
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> list[BudgetResponse]:
    return service.list(db, user_id=user_id)


@router.get("/{budget_id}", response_model=BudgetResponse)
def get_budget(
    budget_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> BudgetResponse:
    try:
        return service.get(db, user_id=user_id, budget_id=budget_id)
    except BudgetNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: UUID,
    data: BudgetUpdate,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> BudgetResponse:
    try:
        return service.update(db, user_id=user_id, budget_id=budget_id, data=data)
    except BudgetNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except (BudgetCategoryError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    budget_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> Response:
    try:
        service.delete(db, user_id=user_id, budget_id=budget_id)
    except BudgetNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
