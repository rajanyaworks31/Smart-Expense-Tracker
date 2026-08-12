# API Conventions

These conventions are the initial contract for the Smart Expense Tracker backend. Endpoint-specific request and response schemas will be finalized in the API-contract step after the database model is approved.

## Base URL

`/api/v1`

## Resource naming

Use plural nouns for collections:

- `expenses`
- `income`
- `budgets`
- `goals`
- `categories`

## HTTP methods

- `GET` — retrieve
- `POST` — create
- `PATCH` — partial update
- `DELETE` — delete

## Response rules

Return Pydantic response schemas. Do not expose SQLAlchemy ORM objects directly. Keep success payloads predictable and versionable; do not mix unrelated resource shapes in a single endpoint.

## Errors

Use a consistent JSON shape containing a machine-readable error code and human-readable detail. Validation errors remain structured so the frontend can map them to fields.

## Pagination and filtering

Collection endpoints may accept explicit query parameters such as `page`, `page_size`, `category`, `start_date`, `end_date`, `search`, and `sort` as appropriate. Defaults must be documented and bounded.

## Ownership

The authenticated user is derived from the server-side auth dependency. Client-provided user IDs are not used to determine ownership.

## Money

Represent monetary values using fixed-precision decimal semantics in the backend/database. Do not use binary floating point as the authoritative storage type for money.

## Dates

Persist timestamps consistently and expose ISO-compatible values through API schemas. Date-only financial fields should remain date-only rather than being converted into arbitrary local timestamps.

## Authentication transport

The frontend does not store authentication tokens in `localStorage`. The planned auth flow uses secure HttpOnly cookies so JavaScript cannot directly read the credentials. The frontend sends requests with credentials enabled when required by the API. The backend remains responsible for resolving the current user.

## API versioning

All application endpoints are namespaced under `/api/v1`. Breaking changes create a new version rather than silently changing an existing response contract.

## AI endpoints

The current provider is Gemini. Keep provider-specific request construction out of routers and frontend services.

AI endpoints receive the user's natural-language request and retrieve relevant, authorized financial context server-side. The Gemini response is validated before being returned. AI endpoints never bypass ordinary authentication, ownership, or financial validation rules.
