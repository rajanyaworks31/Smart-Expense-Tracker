from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FinancialInsightResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    insight_type: str = Field(max_length=60)
    title: str = Field(max_length=160)
    content: str
    metadata: dict | None = Field(
        default=None,
        validation_alias="insight_metadata",
        serialization_alias="metadata",
    )
    generated_at: datetime
    expires_at: datetime | None
