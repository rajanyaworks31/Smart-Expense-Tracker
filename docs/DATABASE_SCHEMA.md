# Smart Expense Tracker — PostgreSQL Data Model

## 1. Purpose

This document is the relational contract for the MVP database. It is a design artifact only; SQLAlchemy models and Alembic migrations must follow this document after explicit approval.

PostgreSQL is the authoritative source of financial facts. Dashboard totals, comparisons, budget progress, goal progress, and AI context are derived from persisted financial records rather than stored as duplicate authoritative totals.

## 2. Core entities

```text
users
  ├── categories
  │      └── expenses
  ├── expenses
  ├── income
  ├── budgets
  ├── savings_goals
  └── financial_insights
```

### Relationship summary

- One `user` has many `categories`.
- One `user` has many `expenses`.
- One `category` can classify many `expenses`.
- One `user` has many `income` records.
- One `user` has many `budgets`.
- A `budget` may optionally target one `category`; a null category means an overall budget.
- One `user` has many `savings_goals`.
- One `user` has many `financial_insights`.

Every user-owned table carries an explicit `user_id`. This makes authorization queries straightforward and avoids relying on indirect ownership inference.

## 3. Table specifications

### 3.1 users

| Column | Type | Rules | Purpose |
|---|---|---|---|
| `id` | UUID | PK | Stable user identifier |
| `email` | VARCHAR(320) | NOT NULL, UNIQUE | Login identity |
| `password_hash` | TEXT | NOT NULL | Secure password hash; never plaintext |
| `full_name` | VARCHAR(120) | NOT NULL | Display name |
| `created_at` | TIMESTAMPTZ | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last modification timestamp |

Email comparisons should be normalized consistently at the application boundary; the database uniqueness rule must prevent duplicate login identities.

### 3.2 categories

| Column | Type | Rules | Purpose |
|---|---|---|---|
| `id` | UUID | PK | Category identifier |
| `user_id` | UUID | FK → users.id, NOT NULL | Owner |
| `name` | VARCHAR(80) | NOT NULL | Category name |
| `icon` | VARCHAR(80) | NULL | Optional UI icon key |
| `created_at` | TIMESTAMPTZ | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last modification timestamp |

Constraint: UNIQUE(`user_id`, `name`).

The MVP uses user-owned categories so users can customize them without collisions between accounts. Default categories can be seeded per user during registration.

### 3.3 expenses

| Column | Type | Rules | Purpose |
|---|---|---|---|
| `id` | UUID | PK | Expense identifier |
| `user_id` | UUID | FK → users.id, NOT NULL | Owner |
| `category_id` | UUID | FK → categories.id, NOT NULL | Classification |
| `amount` | NUMERIC(12,2) | NOT NULL, > 0 | Monetary amount |
| `description` | VARCHAR(255) | NOT NULL | Merchant/item description |
| `expense_date` | DATE | NOT NULL | Date the expense occurred |
| `notes` | TEXT | NULL | Optional user notes |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last modification |

Important integrity rule: the referenced category must belong to the same user as the expense. This is enforced in the service layer and should also be made robust at the database level where practical (for example through a composite ownership key strategy).

### 3.4 income

| Column | Type | Rules | Purpose |
|---|---|---|---|
| `id` | UUID | PK | Income identifier |
| `user_id` | UUID | FK → users.id, NOT NULL | Owner |
| `amount` | NUMERIC(12,2) | NOT NULL, > 0 | Monetary amount |
| `source` | VARCHAR(120) | NOT NULL | Salary, freelance, gift, etc. |
| `income_date` | DATE | NOT NULL | Date received |
| `notes` | TEXT | NULL | Optional notes |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last modification |

### 3.5 budgets

| Column | Type | Rules | Purpose |
|---|---|---|---|
| `id` | UUID | PK | Budget identifier |
| `user_id` | UUID | FK → users.id, NOT NULL | Owner |
| `category_id` | UUID | FK → categories.id, NULL | Optional category target |
| `name` | VARCHAR(120) | NOT NULL | User-facing budget name |
| `amount` | NUMERIC(12,2) | NOT NULL, > 0 | Budget limit |
| `period` | VARCHAR(20) | NOT NULL | MVP period such as monthly |
| `start_date` | DATE | NOT NULL | Period start |
| `end_date` | DATE | NOT NULL | Period end |
| `created_at` | TIMESTAMPTZ | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last modification |

Constraints:

- `end_date >= start_date`.
- `amount > 0`.
- `period` is constrained to the supported MVP values; initially `monthly` is sufficient.
- If `category_id` is non-null, the category must belong to the same user.

Do **not** store `spent_amount` or `remaining_amount` as authoritative columns. They are calculated from expenses for the budget period.

### 3.6 savings_goals

| Column | Type | Rules | Purpose |
|---|---|---|---|
| `id` | UUID | PK | Goal identifier |
| `user_id` | UUID | FK → users.id, NOT NULL | Owner |
| `name` | VARCHAR(120) | NOT NULL | Goal name |
| `target_amount` | NUMERIC(12,2) | NOT NULL, > 0 | Desired amount |
| `current_amount` | NUMERIC(12,2) | NOT NULL, >= 0 | User-recorded progress |
| `target_date` | DATE | NULL | Optional deadline |
| `created_at` | TIMESTAMPTZ | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last modification |

Constraint: `current_amount <= target_amount` for the MVP unless we later decide to support overachievement explicitly.

The current amount is persisted because it represents an explicit user-managed goal balance, unlike dashboard spending totals that can be derived from transactions.

### 3.7 financial_insights

| Column | Type | Rules | Purpose |
|---|---|---|---|
| `id` | UUID | PK | Insight identifier |
| `user_id` | UUID | FK → users.id, NOT NULL | Owner |
| `insight_type` | VARCHAR(60) | NOT NULL | e.g. money_leak, forecast, monthly_story |
| `title` | VARCHAR(160) | NOT NULL | Display title |
| `content` | TEXT | NOT NULL | Human-readable insight/explanation |
| `metadata` | JSONB | NULL | Structured supporting context, not authoritative financial totals |
| `generated_at` | TIMESTAMPTZ | NOT NULL | Generation time |
| `expires_at` | TIMESTAMPTZ | NULL | Optional freshness boundary |

This table stores generated insight artifacts, not the source of financial truth. AI-generated numeric claims must be traceable to fresh financial data and should not be trusted as authoritative merely because they are persisted here.

## 4. Money representation

All authoritative monetary columns use PostgreSQL `NUMERIC(12,2)` for the MVP.

Why:

- Avoids binary floating-point rounding issues.
- Gives predictable two-decimal currency behavior.
- Maps cleanly to Python `Decimal` and SQLAlchemy numeric types.
- Keeps financial calculations deterministic.

The application must not use Python `float` for authoritative money calculations or persistence.

## 5. Dates and timestamps

- Use `DATE` for financial event dates such as `expense_date`, `income_date`, and budget boundaries.
- Use `TIMESTAMPTZ` for audit/system timestamps such as `created_at`, `updated_at`, and AI generation timestamps.
- Do not convert a date-only financial event into an arbitrary timestamp merely for storage convenience.

## 6. Ownership and referential integrity

Every user-owned resource must be queryable by `user_id`.

Deletion behavior:

- Deleting a user should cascade to their categories, expenses, income, budgets, savings goals, and financial insights.
- Deleting a category should **not** silently delete expenses. Category deletion should either be rejected while referenced or handled by an explicit reassignment/archive workflow. For the MVP, prefer rejecting deletion when expenses reference the category.
- Deleting a budget or goal removes only that planning record; it must not affect expenses or income.
- Deleting an insight removes only the generated artifact.

Cross-user references are invalid. For example, User A must never be able to attach User B's category to an expense.

## 7. Indexes

Initial indexes:

- `users(email)` — login lookup; unique.
- `categories(user_id, name)` — user category lookup and uniqueness.
- `expenses(user_id, expense_date DESC)` — dashboard/history queries.
- `expenses(user_id, category_id, expense_date DESC)` — category analytics.
- `income(user_id, income_date DESC)` — income history.
- `budgets(user_id, start_date, end_date)` — active-period lookup.
- `budgets(user_id, category_id)` — category budget lookup.
- `savings_goals(user_id, target_date)` — goal dashboard sorting.
- `financial_insights(user_id, generated_at DESC)` — latest insights.

Indexes should be added for demonstrated query patterns rather than indiscriminately indexing every column.

## 8. Calculated vs persisted data

### Calculate from source records

- Total income for a period.
- Total expenses for a period.
- Net cash flow.
- Category spending totals.
- Spending percentage by category.
- Budget spent/remaining/progress.
- Month-over-month comparisons.
- Spending trends and forecast inputs.
- Money-leak signals.
- Goal progress percentage.

### Persist

- User/account data.
- Expense and income transactions.
- User category definitions.
- Budget definitions.
- Savings-goal state.
- AI insight artifacts and metadata.

Avoid storing derived totals such as `monthly_total`, `spent_amount`, `remaining_amount`, or `net_balance` in core transaction tables. Duplicate totals create synchronization problems and can make analytics incorrect after edits/deletes.

## 9. Future-ready decisions intentionally deferred

The MVP does **not** introduce:

- bank/UPI transaction synchronization tables;
- shared/family accounts;
- investment portfolios;
- receipt/OCR entities;
- recurring-payment engines;
- complex ML prediction tables;
- separate AI conversation-history tables unless the Ask Your Money feature demonstrates a real persistence requirement.

These can be added later without weakening the core model.

## 10. ER-style view

```text
USER
 │
 ├────< CATEGORY
 │          │
 │          └────< EXPENSE
 │
 ├────< EXPENSE
 │
 ├────< INCOME
 │
 ├────< BUDGET >──── CATEGORY (optional)
 │
 ├────< SAVINGS_GOAL
 │
 └────< FINANCIAL_INSIGHT
```

The central rule is simple: **transactions are the facts; analytics are derived; AI explains those facts.**

## 11. Implementation gate

This schema must be explicitly approved before creating or modifying SQLAlchemy models and Alembic migrations. Once approved, Step 5 will implement the model exactly against this contract and verify the resulting database schema.
