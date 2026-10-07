from __future__ import annotations

import logging
from typing import Protocol

from pydantic import BaseModel, Field


logger = logging.getLogger(__name__)


class AIProviderError(RuntimeError):
    """Raised when the configured AI provider cannot produce a valid response."""


class AIModelOutput(BaseModel):
    """The only shape the application accepts from the AI provider."""

    title: str = Field(min_length=1, max_length=160)
    content: str = Field(min_length=1, max_length=4000)
    insight_type: str = Field(min_length=1, max_length=60)


class AICategorySuggestion(BaseModel):
    """Validated category suggestion returned by the AI provider."""

    category_name: str = Field(min_length=1, max_length=80)
    confidence: float = Field(ge=0, le=1)
    reason: str = Field(min_length=1, max_length=500)


class AIWebSource(BaseModel):
    """A web source returned by Gemini Search grounding."""

    title: str = Field(min_length=1, max_length=200)
    url: str = Field(min_length=1, max_length=2000)


class AIEconomyOutput(BaseModel):
    """Validated real-time economy response plus grounded source metadata."""

    title: str = Field(min_length=1, max_length=160)
    content: str = Field(min_length=1, max_length=4000)
    sources: list[AIWebSource] = Field(default_factory=list, max_length=10)
    updated_at: str = Field(min_length=1, max_length=80)


class AIProvider(Protocol):
    def generate_insight(self, *, prompt: str) -> AIModelOutput:
        ...

    def suggest_category(self, *, prompt: str) -> AICategorySuggestion:
        ...

    def economy_update(self, *, prompt: str) -> AIEconomyOutput:
        ...


class GeminiProvider:
    """Thin Gemini adapter; the rest of the app does not depend on the SDK."""

    def __init__(self, api_key: str, model: str) -> None:
        if not api_key:
            raise AIProviderError("Gemini API key is not configured")

        try:
            from google import genai
            from google.genai import types
        except ImportError as exc:
            raise AIProviderError("google-genai is not installed") from exc

        self._types = types
        self._client = genai.Client(api_key=api_key)
        self._model = model

    def generate_insight(self, *, prompt: str) -> AIModelOutput:
        return self._generate_structured(prompt=prompt, schema=AIModelOutput, error_message="Gemini request failed")

    def suggest_category(self, *, prompt: str) -> AICategorySuggestion:
        return self._generate_structured(
            prompt=prompt,
            schema=AICategorySuggestion,
            error_message="Gemini category request failed",
        )

    def economy_update(self, *, prompt: str) -> AIEconomyOutput:
        """Research with Search first, then format the grounded research as structured JSON.

        Gemini 3 supports combining Search grounding and structured output, but keeping the
        retrieval and formatting calls separate makes the citation extraction explicit and avoids
        coupling the two response modes in the legacy generate-content API.
        """
        try:
            search_response = self._client.models.generate_content(
                model=self._model,
                contents=prompt,
                config=self._types.GenerateContentConfig(
                    tools=[self._types.Tool(google_search=self._types.GoogleSearch())],
                ),
            )
        except Exception as exc:
            logger.exception("Gemini economy search request failed")
            raise AIProviderError("Gemini economy request failed") from exc

        research = getattr(search_response, "text", None)
        if not research:
            raise AIProviderError("Gemini returned no grounded economy research")

        sources: list[AIWebSource] = []
        candidates = getattr(search_response, "candidates", None) or []
        if candidates:
            metadata = getattr(candidates[0], "grounding_metadata", None)
            chunks = getattr(metadata, "grounding_chunks", None) or []
            for chunk in chunks:
                web = getattr(chunk, "web", None)
                url = getattr(web, "uri", None) if web else None
                title = getattr(web, "title", None) if web else None
                if url and title and not any(source.url == url for source in sources):
                    sources.append(AIWebSource(title=title, url=url))

        if not sources:
            raise AIProviderError("Gemini returned no grounded web sources")

        format_prompt = f"""
Turn the following Google Search-grounded research into the requested JSON structure.

Rules:
- Use only facts explicitly supported by the research below.
- Do not add current facts from memory or outside the supplied research.
- Give 3 to 5 important India economic developments and briefly explain why each may matter to
  everyday household spending, saving, borrowing, or purchasing power.
- Do not give personalized investment, tax, legal, or regulated financial recommendations.
- Do not invent figures, dates, sources, or certainty.
- The application will attach the verified source list separately.
- Return only JSON matching the requested schema.

Requested fields:
- title: concise title
- content: concise plain-English update
- sources: []
- updated_at: leave as an empty string; the application will set it

Grounded research:
{research}
"""
        try:
            response = self._client.models.generate_content(
                model=self._model,
                contents=format_prompt,
                config=self._types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=AIEconomyOutput,
                ),
            )
        except Exception as exc:
            logger.exception("Gemini economy formatting request failed")
            raise AIProviderError("Gemini economy request failed") from exc

        try:
            if getattr(response, "parsed", None) is not None:
                output = AIEconomyOutput.model_validate(response.parsed)
            else:
                output = AIEconomyOutput.model_validate_json(response.text)
        except Exception as exc:
            logger.exception("Gemini returned an invalid economy response")
            raise AIProviderError("Gemini returned an invalid economy response") from exc

        output.sources = sources[:10]
        return output

    def _generate_structured(self, *, prompt: str, schema: type[BaseModel], error_message: str) -> BaseModel:
        try:
            response = self._client.models.generate_content(
                model=self._model,
                contents=prompt,
                config=self._types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=schema,
                ),
            )
        except Exception as exc:
            logger.exception("Gemini provider request failed: %s", error_message)
            raise AIProviderError(error_message) from exc

        try:
            if getattr(response, "parsed", None) is not None:
                return schema.model_validate(response.parsed)
            return schema.model_validate_json(response.text)
        except Exception as exc:
            logger.exception("Gemini returned an invalid structured response")
            raise AIProviderError("Gemini returned an invalid structured response") from exc
