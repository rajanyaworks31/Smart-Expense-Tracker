from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user_id
from app.schemas.analytics import AnalyticsSummary, MoneyLeakReport, SpendingForecast
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])
service = AnalyticsService()


@router.get("/money-leaks", response_model=MoneyLeakReport)
def get_money_leaks(
    start_date: date = Query(...),
    end_date: date = Query(...),
    min_increase_percentage: Decimal = Query(default=Decimal("20.00"), ge=0),
    min_increase_amount: Decimal = Query(default=Decimal("100.00"), ge=0),
    limit: int = Query(default=5, ge=1, le=20),
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> MoneyLeakReport:
    try:
        return service.money_leaks(
            db,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            min_increase_percentage=min_increase_percentage,
            min_increase_amount=min_increase_amount,
            limit=limit,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get("/spending-forecast", response_model=SpendingForecast)
def get_spending_forecast(
    start_date: date = Query(...),
    end_date: date = Query(...),
    as_of_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> SpendingForecast:
    try:
        return service.spending_forecast(
            db,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            as_of_date=as_of_date,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get("/summary", response_model=AnalyticsSummary)
def get_analytics_summary(
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> AnalyticsSummary:
    try:
        return service.summary(
            db,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
