# Smart Expense Tracker

An AI-powered personal expense tracker built as a full-stack portfolio and learning project: React + TypeScript on the frontend, FastAPI + PostgreSQL on the backend, with Gemini handling natural-language explanation of deterministic financial data.

> **The one-line story:** every number on screen comes from PostgreSQL, calculated by application code. Gemini never invents a balance — it explains balances the backend already computed. That boundary is the main architectural decision in this project, and it's the thing worth leading with in an interview.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Database model](#database-model)
- [AI design](#ai-design)
- [API overview](#api-overview)
- [Project structure](#project-structure)
- [Running locally](#running-locally)
- [Testing](#testing)
- [Security notes](#security-notes)
- [Trade-offs and decisions](#trade-offs-and-decisions)


---

## Features

- **Expenses & income** — full CRUD, user-owned categories, filtering and pagination.
- **Budgets** — monthly spending limits, optionally scoped to a category, with live utilization (spent / remaining / % used) calculated from actual expenses.
- **Savings goals** — target amount, current progress, optional target date. Progress is a manually-entered "saved so far" value, not auto-calculated from income/expenses — see [Known limitations](#known-limitations--whats-out-of-scope).
- **Dashboard** — net cash flow, income/expense totals, savings rate, category breakdown, monthly trends, budget pulse, top savings goal, and recent transactions — all derived from real data, not placeholders.
- **Analytics** — deterministic summary (income, expenses, net cash flow, savings rate, category spending, monthly trends, budget utilization), a money-leak detector (category spend increases vs. the previous period), and a spending forecast (run-rate projection from the current period's spend-to-date).
- **AI categorization** — Gemini suggests a category for a new expense from the user's own category list (never invents a category).
- **Ask Your Money** — free-form question answered by Gemini, grounded only in the authenticated user's own financial context; the model is instructed to say when it doesn't have enough data rather than guess.
- **Monthly financial story** — Gemini turns last month's numbers (and the month before, for comparison) into a short plain-English summary.


## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite | Fast dev loop, strong typing, no framework lock-in |
| Styling | Tailwind CSS v4 | Utility-first, fast to iterate on a custom visual direction |
| Routing | React Router v7 | Standard SPA routing |
| Charts | Recharts | Lightweight, composable |
| Server state | Native `fetch` | No client-state library until one is actually justified (see [Trade-offs](#trade-offs-and-decisions)) |
| Backend | FastAPI + Pydantic | Async-capable, typed request/response contracts, automatic OpenAPI docs |
| ORM / migrations | SQLAlchemy + Alembic | Explicit schema control, reviewable migrations |
| Database | PostgreSQL | Relational integrity for money data; `NUMERIC(12,2)`, not floats |
| Auth | JWT in an HttpOnly cookie | Server-issued, not readable by client JS — mitigates XSS token theft |
| AI | Gemini API (`google-genai`) | Structured JSON output support, Google Search grounding for the Economy Pulse feature |
| Testing | pytest (backend), `tsc`/ESLint (frontend) | — |

## Architecture

```text
Browser
  -> React page/component
  -> native fetch()
  -> /api/v1/... FastAPI router
  -> Pydantic validation
  -> authenticated-user dependency (reads the JWT cookie)
  -> service layer (business rules)
  -> repository / SQLAlchemy
  -> PostgreSQL
  -> response schema
  -> React UI
```

**Layering rule:** `routers -> services -> repositories/models -> database`. Routers only parse requests and map responses; they don't contain business logic. Services own the business rules. No React component talks to PostgreSQL or Gemini directly — everything goes through the FastAPI boundary, which is also where ownership (`user_id`) is enforced. The client is never trusted to supply its own user ID.

The AI path is a bounded extension of the same flow:

```text
React AI interaction
  -> FastAPI AI router
  -> authenticated-user dependency
  -> service builds a bounded, user-scoped financial context (last 90 days of
     expenses/income, budgets, goals — summarized, not a full data dump)
  -> Gemini call via integrations/gemini.py, constrained to structured JSON output
  -> validated response (Pydantic) -> persisted as a FinancialInsight if applicable
  -> React UI
```

Full architecture rationale, module boundaries, and API conventions are documented in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/API_CONVENTIONS.md`](docs/API_CONVENTIONS.md), and [`docs/ARCHITECTURE_REVIEW.md`](docs/ARCHITECTURE_REVIEW.md).

## Database model

```text
USER
 │
 ├────< CATEGORY
 │          │
 │          └────< EXPENSE
 │
 ├────< EXPENSE
 ├────< INCOME
 ├────< BUDGET >──── CATEGORY (optional)
 ├────< SAVINGS_GOAL
 └────< FINANCIAL_INSIGHT
```

Core rule: **transactions are the facts; analytics are derived; AI explains those facts.** Nothing like `monthly_total` or `remaining_amount` is stored as an authoritative column — those are always calculated from `expenses`/`income` at request time, so they can never drift out of sync with the underlying transactions. Money is `NUMERIC(12,2)` end to end (never a float). Every user-owned table carries an explicit `user_id` foreign key so authorization queries are simple joins, not inferred relationships.

Full schema with column-level constraints, indexes, and deletion-behavior rules: [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md).

## AI design

The hardest design decision in this project was keeping Gemini from becoming an unreliable source of financial truth. The rule: **PostgreSQL computes every number; Gemini only explains numbers it's given.**

- `AIService._financial_context()` builds a bounded, user-scoped snapshot (last 90 days of expenses/income, active budgets, goals) — never the full table, never another user's data.
- Every prompt explicitly instructs Gemini: use only the supplied context, don't invent transactions/dates/amounts, treat the numbers as authoritative facts calculated by the application, and say when the context is insufficient rather than guess.
- Gemini's response is forced into a validated Pydantic schema (`AIModelOutput`, `AICategorySuggestion`, `AIEconomyOutput`) — unstructured text from the model is never trusted as-is.
- Provider failures (`AIProviderError`) are caught and surfaced as a 503 with a safe message — a Gemini outage degrades the AI features gracefully without breaking expense tracking, which remains the core product.
- The category suggestion endpoint specifically rejects any category name Gemini returns that isn't in the user's own category list — the model can't invent a new category.

This is the part of the project most worth walking an interviewer through, because it's a real instance of "LLM output is untrusted input" applied end to end — not just a prompt, but a validated contract.

## API overview

Base path: `/api/v1`. Full request/response shapes are in [`docs/API_CONVENTIONS.md`](docs/API_CONVENTIONS.md) and the live OpenAPI docs at `/docs` when the backend is running.

| Resource | Endpoints |
|---|---|
| `/auth` | `POST /register`, `POST /login`, `POST /logout`, `GET /me` |
| `/categories` | `GET /`, `POST /` |
| `/expenses` | `POST /`, `GET /` (paginated), `GET /{id}`, `PATCH /{id}`, `DELETE /{id}` |
| `/income` | `POST /`, `GET /` (paginated), `GET /{id}`, `PATCH /{id}`, `DELETE /{id}` |
| `/budgets` | `POST /`, `GET /`, `GET /{id}`, `PATCH /{id}`, `DELETE /{id}` |
| `/goals` | `POST /`, `GET /`, `GET /{id}`, `PATCH /{id}`, `DELETE /{id}` |
| `/analytics` | `GET /summary`, `GET /money-leaks`, `GET /spending-forecast` |
| `/ai` | `POST /ask`, `POST /monthly-story`, `POST /categorize`, `POST /insights`, `POST /economy-pulse` *(backend only, not in the UI)* |
| `/health` | `GET /health` (root, no `/api/v1` prefix) |

All endpoints except `/auth/register`, `/auth/login`, and `/health` require authentication via the HttpOnly session cookie set at login.

## Project structure

```text
backend/
  app/
    core/           # config, db session, security, auth dependency
    models/         # SQLAlchemy models
    schemas/        # Pydantic request/response contracts
    repositories/    # persistence/query layer (expense, income, user)
    services/        # business logic and orchestration
    routers/         # HTTP boundary only
    integrations/    # Gemini adapter, Redis (unused)
    utils/           # calculations, date helpers
  alembic/           # migrations
  tests/             # pytest suite

frontend/
  src/
    pages/           # route-level screens (Dashboard, Expenses, Budgets, Goals, Income, AIAdvisor, Analytics, Login, Register)
    components/      # reusable UI, organized by feature
    services/        # typed API client functions (one file per resource)
    types/           # shared TypeScript contracts mirroring the backend schemas

docs/                # architecture, API conventions, database schema (see links above)
```

## Running locally

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL running locally (or via Docker — see below)
- A Gemini API key ([Google AI Studio](https://aistudio.google.com/)) if you want the AI features to work

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows; use `source .venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in real values:

```env
DATABASE_URL=postgresql+psycopg://postgres:your_password@localhost:5432/smart_expense_tracker
JWT_SECRET_KEY=replace-with-a-long-random-string
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
FRONTEND_ORIGIN=http://localhost:5173
COOKIE_SECURE=false
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.6-flash
```

Create the database, then apply migrations and run the API:

```bash
alembic upgrade head
uvicorn app.main:app --reload
```

- API: `http://localhost:8000`
- Interactive docs: `http://localhost:8000/docs`
- Health check: `GET /health`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

- App: `http://localhost:5173`
- Optional `.env`: `VITE_API_BASE_URL=http://localhost:8000/api/v1` (this is already the default)

## Testing

```bash
# Backend
cd backend
python -m pytest -q

# Frontend
cd frontend
npm run typecheck
npm run lint
npm run build
```

Backend tests cover auth, expenses, income, analytics, and AI (including user-isolation and provider-failure cases — AI tests use a fake provider, never a real Gemini call, so the suite runs without an API key).

## Security notes

- Passwords are hashed, never stored or logged in plaintext.
- Auth token lives in an HttpOnly cookie — not reachable from client-side JavaScript, which limits XSS token theft compared to `localStorage`.
- Every query that touches user-owned data filters by `user_id` resolved server-side from the authenticated session — the client never supplies its own user ID, so one user cannot address another user's records by guessing an ID.
- CORS is restricted to `FRONTEND_ORIGIN` from config, not wildcarded.
- Gemini API key is server-side only (`integrations/gemini.py`); it is never sent to or used from the frontend.
- `.env` is gitignored; `.env.example` documents required variable names with placeholder values only.



## Trade-offs and decisions

- **Native `fetch` over TanStack Query:** the app's server-state needs (a handful of resource lists, no complex cache invalidation graph) didn't yet justify a dependency whose main value is caching/sync machinery for more complex data flows. Documented as a deliberate "defer until justified" choice, not an oversight.
- **Gemini over OpenAI:** switched mid-project (see `docs/ARCHITECTURE_REVIEW.md`) for structured-output and Google Search grounding support, kept behind a provider-agnostic `integrations/` boundary so the rest of the app doesn't depend on Gemini-specific types.
- **Derived values are never persisted.** Budget "spent" and "remaining," dashboard totals, and goal percentages are always calculated from source transactions at request time. This trades a small amount of query cost for the guarantee that these numbers can never silently drift from reality after an edit or delete.
- **User-owned categories, not global categories.** Each user has their own category list (uniqueness enforced per-user, not globally), which avoids cross-account collisions and lets categories be personalized later without a migration.
- **AI insight artifacts are cached as records (`financial_insights`), not as the source of truth.** They're stored so a generated story/insight can be revisited, but the next analytics calculation always goes back to the transaction tables, not to a previously generated AI summary.


