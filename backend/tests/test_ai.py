from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.dependencies import get_current_user_id
from app.integrations.gemini import AICategorySuggestion, AIEconomyOutput, AIModelOutput, AIProviderError, AIWebSource
from app.main import app
from app.services.ai_service import AIService


class FakeResult:
    def __init__(self, rows=None):
        self.rows = rows or []

    def all(self):
        return self.rows

    def scalars(self):
        return self


class FakeSession:
    def __init__(self):
        self.added = None

    def execute(self, statement):
        statement_text = str(statement)
        if 'FROM categories' in statement_text:
            return FakeResult([SimpleNamespace(id=uuid4(), name='Food')])
        return FakeResult([])

    def add(self, value):
        self.added = value

    def commit(self):
        return None

    def refresh(self, value):
        now = datetime.now(timezone.utc)
        value.generated_at = now


class FakeProvider:
    def __init__(self, output=None, category_output=None, error=None):
        self.output = output
        self.category_output = category_output
        self.error = error
        self.prompt = None

    def generate_insight(self, *, prompt):
        self.prompt = prompt
        if self.error:
            raise self.error
        return self.output

    def suggest_category(self, *, prompt):
        self.prompt = prompt
        if self.error:
            raise self.error
        return self.category_output

    def economy_update(self, *, prompt):
        self.prompt = prompt
        if self.error:
            raise self.error
        return self.output


def test_ai_service_scopes_prompt_to_bounded_user_context():
    provider = FakeProvider(
        output=AIModelOutput(
            title="Spending snapshot",
            content="Your recent spending is available for review.",
            insight_type="monthly_summary",
        )
    )
    service = AIService(provider=provider)

    result = service.generate_insight(
        FakeSession(),
        user_id=uuid4(),
        insight_type="monthly_summary",
    )

    assert result.title == "Spending snapshot"
    assert "financial context" in provider.prompt.lower()
    assert "authoritative facts" in provider.prompt.lower()
    assert "do not invent" in provider.prompt.lower()


def test_ai_service_rejects_provider_failure():
    provider = FakeProvider(error=AIProviderError("Gemini request failed"))
    service = AIService(provider=provider)

    try:
        service.ask(FakeSession(), user_id=uuid4(), question="Where did I spend most?")
        assert False, "Expected AIProviderError"
    except AIProviderError as exc:
        assert str(exc) == "Gemini request failed"


def test_ai_service_accepts_only_user_category_suggestion():
    category_id = uuid4()
    provider = FakeProvider(
        category_output=AICategorySuggestion(
            category_name=" food ",
            confidence=0.92,
            reason="The description suggests a meal purchase.",
        )
    )
    service = AIService(provider=provider)
    db = FakeSession()
    db.execute = lambda statement: FakeResult([SimpleNamespace(id=category_id, name="Food")])

    category, suggestion = service.suggest_category(
        db,
        user_id=uuid4(),
        description="Dinner at a restaurant",
    )

    assert category.id == category_id
    assert suggestion.category_name == "Food"
    assert suggestion.confidence == 0.92
    assert "Allowed categories" in provider.prompt
    assert "Dinner at a restaurant" in provider.prompt


def test_ai_service_rejects_unknown_category_suggestion():
    provider = FakeProvider(
        category_output=AICategorySuggestion(
            category_name="Investments",
            confidence=0.99,
            reason="The description sounds financial.",
        )
    )
    service = AIService(provider=provider)

    try:
        service.suggest_category(FakeSession(), user_id=uuid4(), description="Stocks")
        assert False, "Expected AIProviderError"
    except AIProviderError as exc:
        assert "not available" in str(exc)


def test_ai_service_economy_update_requires_grounded_context_and_returns_sources():
    provider = FakeProvider(
        output=AIEconomyOutput(
            title="India Economy Pulse",
            content="Recent economic developments may affect household costs.",
            sources=[AIWebSource(title="Reserve Bank of India", url="https://rbi.org.in")],
            updated_at="2026-09-03T10:00:00+00:00",
        )
    )
    service = AIService(provider=provider)

    result = service.economy_update(FakeSession(), user_id=uuid4())

    assert result.title == "India Economy Pulse"
    assert result.sources[0].title == "Reserve Bank of India"
    assert "live web" in provider.prompt.lower()
    assert "google search grounding" in provider.prompt.lower()


def test_ai_service_economy_update_propagates_provider_failure():
    provider = FakeProvider(error=AIProviderError("Gemini economy request failed"))
    service = AIService(provider=provider)

    try:
        service.economy_update(FakeSession(), user_id=uuid4())
        assert False, "Expected AIProviderError"
    except AIProviderError as exc:
        assert str(exc) == "Gemini economy request failed"


def test_protected_ai_economy_endpoint_rejects_unauthenticated_request():
    client = TestClient(app)

    response = client.post("/api/v1/ai/economy-pulse")

    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication is required"


def test_protected_ai_category_endpoint_rejects_unauthenticated_request():
    client = TestClient(app)

    response = client.post(
        "/api/v1/ai/categorize",
        json={"description": "Dinner at a restaurant"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication is required"


def test_protected_ai_monthly_story_endpoint_rejects_unauthenticated_request():
    client = TestClient(app)

    response = client.post("/api/v1/ai/monthly-story")

    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication is required"


def test_protected_ai_endpoint_rejects_unauthenticated_request():
    client = TestClient(app)

    response = client.post(
        "/api/v1/ai/ask",
        json={"question": "Where did I spend most?"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication is required"


def test_ai_category_endpoint_accepts_authenticated_mock_provider(monkeypatch):
    db = FakeSession()
    user_id = uuid4()
    category_id = uuid4()
    db.execute = lambda statement: FakeResult([SimpleNamespace(id=category_id, name="Food")])
    provider = FakeProvider(
        category_output=AICategorySuggestion(
            category_name="Food",
            confidence=0.91,
            reason="The description sounds like a meal purchase.",
        )
    )
    service = AIService(provider=provider)

    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user_id] = lambda: user_id
    monkeypatch.setattr("app.routers.ai.service", service)

    try:
        client = TestClient(app)
        response = client.post(
            "/api/v1/ai/categorize",
            json={"description": "Dinner at a restaurant"},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["category_id"] == str(category_id)
        assert body["category_name"] == "Food"
        assert body["confidence"] == 0.91
    finally:
        app.dependency_overrides.clear()


def test_ai_service_generates_monthly_story_with_validated_output():
    provider = FakeProvider(
        output=AIModelOutput(
            title="August in review",
            content="Your August spending was driven by Food.",
            insight_type="monthly_story",
        )
    )
    service = AIService(provider=provider)

    class EmptyStorySession(FakeSession):
        def execute(self, statement):
            return FakeResult([])

    result = service.monthly_story(EmptyStorySession(), user_id=uuid4())

    assert result.insight_type == "monthly_story"
    assert result.title == "August in review"
    assert "previous month" in provider.prompt.lower()
    assert "do not invent" in provider.prompt.lower()


def test_ai_monthly_story_endpoint_accepts_authenticated_mock_provider(monkeypatch):
    user_id = uuid4()
    provider = FakeProvider(
        output=AIModelOutput(
            title="August in review",
            content="Your August spending was driven by Food.",
            insight_type="monthly_story",
        )
    )
    service = AIService(provider=provider)

    class EmptyStorySession(FakeSession):
        def execute(self, statement):
            return FakeResult([])

    app.dependency_overrides[get_db] = lambda: EmptyStorySession()
    app.dependency_overrides[get_current_user_id] = lambda: user_id
    monkeypatch.setattr("app.routers.ai.service", service)

    try:
        client = TestClient(app)
        response = client.post("/api/v1/ai/monthly-story")

        assert response.status_code == 200
        body = response.json()
        assert body["insight"]["title"] == "August in review"
        assert body["insight"]["content"] == "Your August spending was driven by Food."
        assert body["insight"]["insight_type"] == "monthly_story"
    finally:
        app.dependency_overrides.clear()


def test_ai_endpoint_accepts_authenticated_mock_provider(monkeypatch):
    db = FakeSession()
    user_id = uuid4()
    provider = FakeProvider(
        output=AIModelOutput(
            title="Food spending",
            content="Food is your largest recent spending category.",
            insight_type="ask",
        )
    )
    service = AIService(provider=provider)

    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user_id] = lambda: user_id
    monkeypatch.setattr("app.routers.ai.service", service)

    try:
        client = TestClient(app)
        response = client.post(
            "/api/v1/ai/ask",
            json={"question": "Where did I spend most?"},
        )

        assert response.status_code == 200
        assert response.json()["answer"] == "Food is your largest recent spending category."
    finally:
        app.dependency_overrides.clear()
