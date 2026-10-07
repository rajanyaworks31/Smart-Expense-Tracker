from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user_id
from app.integrations.gemini import AIProviderError
from app.schemas.ai import (
    AIAskRequest,
    AIAskResponse,
    AICategoryRequest,
    AIEconomyResponse,
    AICategoryResponse,
    AIInsightRequest,
    AIInsightResponse,
)
from app.schemas.financial_insight import FinancialInsightResponse
from app.services.ai_service import AIService

router = APIRouter(prefix="/ai", tags=["ai"])
service = AIService()


def _provider_error(exc: AIProviderError) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=str(exc),
    )


@router.post("/ask", response_model=AIAskResponse)
def ask_your_money(
    data: AIAskRequest,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> AIAskResponse:
    try:
        output = service.ask(db, user_id=user_id, question=data.question.strip())
    except AIProviderError as exc:
        raise _provider_error(exc) from exc

    return AIAskResponse(answer=output.content)


@router.post("/economy-pulse", response_model=AIEconomyResponse)
def economy_pulse(
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> AIEconomyResponse:
    try:
        output = service.economy_update(db, user_id=user_id)
    except AIProviderError as exc:
        raise _provider_error(exc) from exc

    return AIEconomyResponse.model_validate(output)


@router.post("/monthly-story", response_model=AIInsightResponse)
def monthly_story(
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> AIInsightResponse:
    try:
        insight = service.monthly_story(db, user_id=user_id)
    except AIProviderError as exc:
        raise _provider_error(exc) from exc

    return AIInsightResponse(insight=FinancialInsightResponse.model_validate(insight))


@router.post("/categorize", response_model=AICategoryResponse)
def suggest_category(
    data: AICategoryRequest,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> AICategoryResponse:
    try:
        category, suggestion = service.suggest_category(
            db,
            user_id=user_id,
            description=data.description,
        )
    except AIProviderError as exc:
        raise _provider_error(exc) from exc

    return AICategoryResponse(
        category_id=category.id,
        category_name=category.name,
        confidence=suggestion.confidence,
        reason=suggestion.reason,
    )


@router.post("/insights", response_model=AIInsightResponse)
def generate_insight(
    data: AIInsightRequest,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> AIInsightResponse:
    try:
        insight = service.generate_insight(
            db,
            user_id=user_id,
            insight_type=data.insight_type.strip(),
        )
    except AIProviderError as exc:
        raise _provider_error(exc) from exc

    return AIInsightResponse(insight=FinancialInsightResponse.model_validate(insight))
