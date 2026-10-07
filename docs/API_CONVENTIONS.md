# Smart Expense Tracker — API Contract

## 1. Base contract

Base path: `/api/v1`

The frontend communicates with FastAPI over JSON. SQLAlchemy models are never exposed directly; every response is mapped through a Pydantic response schema.

### Authentication transport

Authentication uses secure HttpOnly cookies. The frontend does not store credentials or access tokens in `localStorage`. Requests that require authentication are sent with credentials enabled, and the backend resolves the current user from the server-side authentication dependency.

### Money

Authoritative money values use PostgreSQL `NUMERIC(12,2)` and Python `Decimal`. API responses preserve decimal semantics; frontend TypeScript represents money as `string` rather than `number` to avoid binary floating-point rounding.

### Dates

- Financial event dates use ISO date strings: `YYYY-MM-DD`.
- System timestamps use ISO 8601 date-time strings.

### Standard errors

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "detail": "Expense was not found."
  }
}
```

Validation errors remain structured by FastAPI/Pydantic so the frontend can map field errors.

Common application error codes include:

- `AUTHENTICATION_REQUIRED`
- `INVALID_CREDENTIALS`
- `RESOURCE_NOT_FOUND`
- `DUPLICATE_RESOURCE`
- `OWNERSHIP_VIOLATION`
- `INVALID_DATE_RANGE`
- `INVALID_AMOUNT`
- `CONFLICT`

## 2. Pagination and filters

Collection endpoints use:

- `page`: integer, default `1`, minimum `1`.
- `page_size`: integer, default `20`, minimum `1`, maximum `100`.
- `start_date`: optional `YYYY-MM-DD`.
- `end_date`: optional `YYYY-MM-DD`.
- `search`: optional text search where supported.
- `sort`: explicit server-supported sort key; clients must not send arbitrary SQL expressions.

Paginated responses use:

```json
{
  "items": [],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 0,
    "total_pages": 0
  }
}
```

## 3. Authentication endpoints

### `POST /auth/register`

Create an account and establish an authenticated session.

Request: `RegisterRequest`

```json
{
  "email": "user@example.com",
  "password": "at-least-8-characters",
  "full_name": "Alex User"
}
```

Response: `201` → `AuthResponse`

The response does not contain a password or password hash. The session credential is delivered through a secure HttpOnly cookie.

### `POST /auth/login`

Request: `LoginRequest`

Response: `200` → `AuthResponse`

Invalid credentials return `401` with `INVALID_CREDENTIALS`.

### `POST /auth/logout`

Response: `204` or an equivalent empty success response after clearing the session cookie.

### `GET /auth/me`

Return the authenticated user's profile.

Response: `200` → `UserResponse`

Unauthenticated requests return `401`.

### `PATCH /auth/me`

Request: `UserUpdate`

Response: `200` → `UserResponse`

## 4. Categories

### `GET /categories`

Return the authenticated user's categories.

Response: `200` → `PaginatedResponse[CategoryResponse]`

### `POST /categories`

Request: `CategoryCreate`

Response: `201` → `CategoryResponse`

Category names are unique per user.

### `GET /categories/{category_id}`

Response: `200` → `CategoryResponse`

### `PATCH /categories/{category_id}`

Request: `CategoryUpdate`

Response: `200` → `CategoryResponse`

### `DELETE /categories/{category_id}`

Response: `204`

For the MVP, deletion is rejected when the category is referenced by existing expenses rather than silently deleting those expenses.

## 5. Expenses

### `GET /expenses`

Query parameters:

- `page`
- `page_size`
- `category_id`
- `start_date`
- `end_date`
- `search`
- `sort`

Response: `200` → `PaginatedResponse[ExpenseResponse]`

### `POST /expenses`

Request: `ExpenseCreate`

```json
{
  "category_id": "uuid",
  "amount": "450.00",
  "description": "Coffee",
  "expense_date": "2026-08-16",
  "notes": null
}
```

Response: `201` → `ExpenseResponse`

The server derives `user_id` from authentication. A client cannot assign an expense to another user.

### `GET /expenses/{expense_id}`

Response: `200` → `ExpenseResponse`

### `PATCH /expenses/{expense_id}`

Request: `ExpenseUpdate`

Response: `200` → `ExpenseResponse`

### `DELETE /expenses/{expense_id}`

Response: `204`

## 6. Income

### `GET /income`

Query parameters:

- `page`
- `page_size`
- `start_date`
- `end_date`
- `search`
- `sort`

Response: `200` → `PaginatedResponse[IncomeResponse]`

### `POST /income`

Request: `IncomeCreate`

Response: `201` → `IncomeResponse`

### `GET /income/{income_id}`

Response: `200` → `IncomeResponse`

### `PATCH /income/{income_id}`

Request: `IncomeUpdate`

Response: `200` → `IncomeResponse`

### `DELETE /income/{income_id}`

Response: `204`

## 7. Budgets

### `GET /budgets`

Query parameters:

- `page`
- `page_size`
- `category_id`
- `start_date`
- `end_date`
- `sort`

Response: `200` → `PaginatedResponse[BudgetResponse]`

### `POST /budgets`

Request: `BudgetCreate`

Response: `201` → `BudgetResponse`

`period` is `monthly` for the MVP. `spent`, `remaining`, and utilization are calculated from expenses and are not persisted as authoritative budget columns.

### `GET /budgets/{budget_id}`

Response: `200` → `BudgetResponse`

### `PATCH /budgets/{budget_id}`

Request: `BudgetUpdate`

Response: `200` → `BudgetResponse`

### `DELETE /budgets/{budget_id}`

Response: `204`

## 8. Savings goals

### `GET /goals`

Query parameters:

- `page`
- `page_size`
- `sort`

Response: `200` → `PaginatedResponse[SavingsGoalResponse]`

### `POST /goals`

Request: `SavingsGoalCreate`

Response: `201` → `SavingsGoalResponse`

### `GET /goals/{goal_id}`

Response: `200` → `SavingsGoalResponse`

### `PATCH /goals/{goal_id}`

Request: `SavingsGoalUpdate`

Response: `200` → `SavingsGoalResponse`

### `DELETE /goals/{goal_id}`

Response: `204`

## 9. Analytics

Analytics are derived from persisted financial facts; the API does not write duplicate authoritative totals.

### `GET /analytics/summary`

Query parameters:

- `start_date`: required
- `end_date`: required

Response: `200` → `AnalyticsSummary`

The response includes:

- total income
- total expenses
- net cash flow
- savings rate
- category spending breakdown
- monthly trends
- budget utilization

If `end_date < start_date`, return `400` with `INVALID_DATE_RANGE`.

## 10. AI

AI is an interpretation layer over authorized financial facts. Deterministic arithmetic remains in the analytics/service layer.

### `POST /ai/ask`

Request: `AIAskRequest`

```json
{
  "question": "Where did I overspend this month?"
}
```

Response: `200` → `AIAskResponse`

The server retrieves authorized financial context, sends only the necessary context to Gemini, validates the provider result, and returns the answer. The Gemini API key is server-side only.

### `POST /ai/insights`

Request: `AIInsightRequest`

Response: `201` → `AIInsightResponse`

The generated insight may be persisted as a `financial_insights` artifact. It is not treated as the source of truth for financial totals.

AI endpoints must enforce the same authentication and ownership rules as ordinary financial endpoints.

## 11. Ownership rules

The authenticated user's identity is always derived server-side.

Never accept a client-supplied `user_id` as the ownership authority for financial resources.

For cross-resource references, ownership must be validated. For example, an expense may only reference a category owned by the same authenticated user.

## 12. Contract verification status

The endpoint contract and shared request/response shapes are implemented in the backend Pydantic schemas and frontend TypeScript types. Runtime verification is the remaining gate before this development step can be marked done.

## 13. Contract-to-code mapping

Backend Pydantic schemas:

- `schemas/auth.py`
- `schemas/user.py`
- `schemas/category.py`
- `schemas/expense.py`
- `schemas/income.py`
- `schemas/budget.py`
- `schemas/savings_goal.py`
- `schemas/financial_insight.py`
- `schemas/analytics.py`
- `schemas/ai.py`
- `schemas/common.py`

Frontend shared API types:

- `frontend/src/types/api.ts`

The next implementation step is to build services/repositories and routers against these contracts. No business logic belongs in these schema definitions.
