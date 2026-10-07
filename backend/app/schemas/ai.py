from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.financial_insight import FinancialInsightResponse


class AIAskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)


class AIAskResponse(BaseModel):
    answer: str
    supporting_insight: FinancialInsightResponse | None = None


class AIWebSourceResponse(BaseModel):
    title: str
    url: str


class AIEconomyResponse(BaseModel):
    title: str
    content: str
    sources: list[AIWebSourceResponse]
    updated_at: str


class AIInsightRequest(BaseModel):
    insight_type: str = Field(min_length=1, max_length=60)


class AIInsightResponse(BaseModel):
    insight: FinancialInsightResponse


class AICategoryRequest(BaseModel):
    description: str = Field(min_length=1, max_length=255)


class AICategoryResponse(BaseModel):
    category_id: UUID
    category_name: str
    confidence: float = Field(ge=0, le=1)
    reason: str = Field(min_length=1, max_length=500)
