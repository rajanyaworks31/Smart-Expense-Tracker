# API Contract Checklist

This checklist is the verification gate for the API-contract step.

## Contract coverage

- [x] Authentication and user profile
- [x] Categories
- [x] Expenses
- [x] Income
- [x] Budgets
- [x] Savings goals
- [x] Analytics summary
- [x] AI ask/insight
- [x] Standard errors
- [x] Pagination metadata
- [x] Ownership rules
- [x] Money/date representation
- [x] Frontend TypeScript equivalents

## Verification commands

From `backend` with the virtual environment active:

```powershell
pip install -r requirements.txt
python -c "from app.schemas import *; print('API schemas imported successfully')"
```

Expected:

```text
API schemas imported successfully
```

From `frontend`:

```powershell
npm run build
```

Expected: TypeScript compilation and Vite production build complete successfully.

Must-fail checks:

- Schema imports raise an exception.
- Frontend TypeScript build fails because the shared API types contain invalid syntax or incompatible types.
- API contract omits a required MVP domain.
- Money is represented as authoritative binary floating-point data.
- Client-supplied `user_id` is used as the ownership authority.

## Current status

Contract design and implementation are complete. Runtime verification is the only remaining gate for this step. Do not mark the step done until both verification commands pass.
