from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user_id
from app.schemas.savings_goal import SavingsGoalCreate, SavingsGoalResponse, SavingsGoalUpdate
from app.services.goal_service import SavingsGoalNotFoundError, SavingsGoalService

router = APIRouter(prefix="/goals", tags=["goals"])
service = SavingsGoalService()


@router.post("", response_model=SavingsGoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(
    data: SavingsGoalCreate,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> SavingsGoalResponse:
    try:
        return service.create(db, user_id=user_id, data=data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("", response_model=list[SavingsGoalResponse])
def list_goals(
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> list[SavingsGoalResponse]:
    return service.list(db, user_id=user_id)


@router.get("/{goal_id}", response_model=SavingsGoalResponse)
def get_goal(
    goal_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> SavingsGoalResponse:
    try:
        return service.get(db, user_id=user_id, goal_id=goal_id)
    except SavingsGoalNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/{goal_id}", response_model=SavingsGoalResponse)
def update_goal(
    goal_id: UUID,
    data: SavingsGoalUpdate,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> SavingsGoalResponse:
    try:
        return service.update(db, user_id=user_id, goal_id=goal_id, data=data)
    except SavingsGoalNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> Response:
    try:
        service.delete(db, user_id=user_id, goal_id=goal_id)
    except SavingsGoalNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
