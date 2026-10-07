from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user_id
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryResponse

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryResponse])
def list_categories(
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> list[CategoryResponse]:
    categories = db.scalars(
        select(Category).where(Category.user_id == user_id).order_by(Category.name.asc())
    ).all()
    return [CategoryResponse.model_validate(category) for category in categories]


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> CategoryResponse:
    category = Category(
        user_id=user_id,
        name=data.name.strip(),
        icon=data.icon.strip() if data.icon else None,
    )
    db.add(category)
    try:
        db.commit()
        db.refresh(category)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A category with this name already exists",
        ) from exc

    return CategoryResponse.model_validate(category)
