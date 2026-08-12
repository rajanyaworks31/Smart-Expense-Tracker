# Architecture Review — Step 3

Step 3 is finalized.

Status: DONE.

## Decisions

- Frontend: React + TypeScript + Vite + Tailwind CSS + React Router.
- Client data access: native `fetch` initially; TanStack Query is deferred until demonstrated server-state complexity justifies it.
- Backend: Python + FastAPI + Pydantic + SQLAlchemy + Alembic.
- Database: PostgreSQL as the source of truth.
- AI: Gemini API, isolated behind the backend integration/service boundary.
- Authentication: secure password hashing plus short-lived credentials and HttpOnly-cookie token handling; authorization/ownership enforced server-side.
- Redis: optional and introduced only for a demonstrated caching, rate-limiting, or background-job requirement.
- API namespace: `/api/v1`.
- Monetary values: fixed-precision decimal semantics; no binary floating-point as authoritative storage.

## Dependency boundaries

```text
React UI
  -> native fetch / API service
  -> FastAPI router
  -> Pydantic validation + auth dependency
  -> service
  -> repository / SQLAlchemy
  -> PostgreSQL
```

AI flow:

```text
React AI interaction
  -> FastAPI AI router
  -> authorized data retrieval
  -> deterministic financial facts
  -> Gemini service
  -> validated response
  -> React UI
```

## Verification

- Architecture document exists and was reviewed from the workspace.
- API convention document exists and defines versioning, HTTP methods, validation, ownership, money, dates, and AI boundaries.
- Existing frontend/backend scaffolds were inspected; current service/backend files are placeholders and are not being treated as finalized API implementations.

Must-fail checks: no direct database access from React, no business logic in routers, no provider-specific Gemini code in frontend, no binary floating-point as authoritative money storage, and no client-controlled ownership boundary.

## Gate

Step 3 is complete. The next implementation step is Step 4: design the PostgreSQL data model and relationships. Endpoint-specific API contracts intentionally wait until the data model is approved.

## Verification command

Documentation verification: read `docs/ARCHITECTURE.md`, `docs/API_CONVENTIONS.md`, and this review -> expected: architecture, API conventions, and verification gate are present and consistent -> PASS. Must-fail: provider mismatch, missing API version, missing ownership boundary, or undefined money representation.
