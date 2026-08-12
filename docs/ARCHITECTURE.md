# Smart Expense Tracker — Full-Stack Architecture

## 1. System boundary

The application has four primary runtime concerns:

- React + TypeScript + Vite frontend: presentation, local UI state, forms, navigation, and API calls.
- FastAPI backend: HTTP API, authentication, validation, business orchestration, authorization, analytics, and AI orchestration.
- PostgreSQL: source of truth for user-owned financial data.
- Gemini API: natural-language understanding and contextual explanation; it does not own financial calculations or persistence. The provider is Gemini, not OpenAI.

Dependency rule: frontend -> API only; routers -> services; services -> repositories/models/integrations; repositories -> PostgreSQL. No layer reaches around the layer immediately below it for business operations.

Redis remains optional and is introduced only when a concrete caching, rate-limiting, or background-job need is demonstrated.

## 1.1 Technology decisions

- Frontend: React + TypeScript + Vite + Tailwind CSS + React Router.
- Server state: native `fetch` initially; no TanStack Query until justified.
- Backend: Python + FastAPI + Pydantic + SQLAlchemy + Alembic.
- Database: PostgreSQL.
- AI: Gemini API behind an integration/service boundary.
- Auth: application-managed credentials with secure password hashing and HttpOnly-cookie token handling.
- Cache/background infrastructure: Redis only when a measured requirement appears.

## 2. Request flow

The backend remains the security boundary: the frontend sends the request, but the server determines the authenticated user, validates the input, enforces ownership, and performs authoritative financial operations.

```text
Browser
  -> React page/component
  -> native fetch()
  -> /api/v1/... FastAPI router
  -> Pydantic validation
  -> authenticated-user dependency
  -> service layer
  -> repository / SQLAlchemy
  -> PostgreSQL
  -> response schema
  -> React UI
```

AI requests use a bounded extension of this flow:

```text
React AI interaction
  -> FastAPI AI router
  -> authenticated-user dependency
  -> analytics/data retrieval service
  -> deterministic financial facts
  -> Gemini service
  -> validated AI response
  -> React UI
```

## 3. Frontend responsibilities

Current implementation note: the React shell and Expenses interaction layer are already implemented locally. Backend-facing service modules remain intentionally thin placeholders until the API contract is finalized.

- `pages/`: route-level screens and page orchestration.
- `components/`: reusable visual and interaction components.
- `services/`: HTTP/API functions only; no business rules that belong on the server.
- `types/`: shared frontend TypeScript contracts.
- `hooks/`: reusable client-side behavior.
- `context/`: cross-cutting client state only when genuinely needed.
- `utils/`: presentation/client-only helpers.

The frontend uses native `fetch` initially. TanStack Query is intentionally deferred until server-state complexity demonstrates a real need. Existing `services/` files are placeholders until API contracts are finalized.

## 4. Backend responsibilities

Current implementation note: the backend directory structure has been scaffolded, but its modules are still placeholders. Architecture is now locked; implementation begins with the PostgreSQL data model before the FastAPI runtime so API contracts can be derived from stable ownership and relationship rules.

- `routers/`: HTTP boundary only; parse requests, call services, map responses.
- `schemas/`: Pydantic request/response contracts.
- `services/`: business logic and orchestration.
- `repositories/`: persistence/query operations where a repository abstraction adds value.
- `models/`: SQLAlchemy persistence models.
- `core/`: configuration, database/session setup, security, and dependencies.
- `integrations/`: external systems such as Gemini and Redis.
- `utils/`: deterministic calculations/date helpers that have no HTTP or persistence concerns.
- `tests/`: backend behavior and security tests.

Routers must not contain database-heavy business logic, and frontend components must not implement authoritative financial rules.

## 5. API conventions

Base path: `/api/v1`

Endpoint-specific request/response contracts will be finalized after the PostgreSQL schema is approved; this avoids creating client/server shapes that immediately need to change with the data model.

Core resource groups:

- `/auth`
- `/users`
- `/categories`
- `/expenses`
- `/income`
- `/budgets`
- `/goals`
- `/analytics`
- `/ai`

Use standard HTTP semantics, Pydantic validation, consistent error payloads, explicit pagination/filter parameters, and response schemas rather than returning raw ORM objects.

## 6. Authentication and authorization direction

Authentication is an application-level concern and is intentionally implemented after the API/data boundaries are established; the architecture already reserves the dependency and service boundaries for it.

Authentication will use secure password hashing plus short-lived access credentials and refresh handling through HttpOnly cookies. Protected endpoints resolve the current user through a FastAPI dependency.

Every user-owned query must enforce ownership at the backend boundary. The client must never be trusted to provide an arbitrary owner/user ID.

## 7. Environment configuration

The repository already contains a backend `.env` and `.env.example`; the architecture requires that only variable names/default placeholders appear in `.env.example` and secrets stay local.

Secrets and environment-specific configuration stay outside source control. The backend `.env` is local-only; `.env.example` documents required variable names without secret values.

Expected categories include:

- database connection
- application secret/security settings
- frontend origin/CORS configuration
- Gemini API credentials
- optional Redis configuration

## 8. AI boundary

The initial product scope uses Gemini rather than OpenAI, as approved by the user. Keep the provider behind `integrations/` and the orchestration behind `services/ai_service.py` so the rest of the application does not depend directly on provider-specific code.

Gemini is an interpretation layer, not the financial source of truth.

Deterministic application code calculates balances, totals, comparisons, budget progress, goal progress, and scenario math. Gemini receives only the relevant user-owned facts needed for the requested explanation or natural-language interaction.

AI output must be treated as untrusted external data: validate structure, constrain prompts, handle provider failures, and never allow model output to directly bypass authorization or mutate financial records without normal application validation.

## 9. Error handling

- Validation errors are returned as structured 4xx responses.
- Authentication/authorization failures are explicit 401/403 responses.
- Missing resources return 404.
- Unexpected server/provider failures return safe 5xx responses without leaking secrets or stack traces.
- External AI failures degrade gracefully; core expense tracking must remain usable.

## 10. Module and dependency rules

### Frontend

`pages` may compose components and call frontend `services`. Components may own presentation/local interaction state, but authoritative financial rules stay on the backend. Frontend services translate UI intent into HTTP requests and do not contain database/business calculations.

### Backend

`routers -> services -> repositories/models -> database` is the normal dependency direction. Routers handle HTTP concerns only. Services own business rules and orchestration. Repositories own persistence/query concerns where they improve clarity. Integrations are the only place that knows provider-specific SDK/request details.

### Cross-cutting rules

- No React component talks directly to PostgreSQL or Gemini.
- No FastAPI router contains substantial financial calculations or ORM query composition when that logic belongs in a service/repository.
- No AI response is treated as authoritative financial state.
- User ownership is resolved server-side from authentication; never from a client-supplied `user_id`.
- Keep shared contracts explicit: Pydantic schemas define backend API shapes and TypeScript types mirror the stable client-facing shapes.

## 11. Request lifecycle and error boundary

```text
UI event
  -> frontend service
  -> HTTP request
  -> FastAPI router
  -> auth dependency
  -> Pydantic validation
  -> service/business rule
  -> repository/SQLAlchemy
  -> PostgreSQL
  -> response schema
  -> frontend state update
```

Failures are handled at the layer that understands them: field validation at the API boundary, authorization in dependencies/services, persistence failures in the backend, and provider failures in the integration/service boundary. The frontend displays safe, user-oriented messages rather than server internals.

## 12. Architectural principles

1. PostgreSQL is the source of truth for financial data.
2. Business rules live in FastAPI services, not React components.
3. AI explains and interprets verified facts; it does not invent or own them.
4. Authentication and ownership checks are enforced server-side.
5. Keep dependencies minimal until a demonstrated need exists.
6. Prefer clear module boundaries over premature abstraction.
7. Build locally and verify each layer before connecting the next layer.
