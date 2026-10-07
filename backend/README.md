# Smart Expense Tracker — Backend

FastAPI backend for the Smart Expense Tracker. See the [project root README](../README.md) for the full architecture, API overview, and setup walkthrough.

## Quick start

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows; `source .venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
cp .env.example .env          # then fill in real values
alembic upgrade head
uvicorn app.main:app --reload
```

- API: `http://localhost:8000`
- Interactive docs: `http://localhost:8000/docs`
- Health check: `GET /health`

## Tests

```bash
python -m pytest -q
```

AI tests use a fake provider — no Gemini API key is required to run the suite.
