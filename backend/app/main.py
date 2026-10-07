from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers.ai import router as ai_router
from app.routers.analytics import router as analytics_router
from app.routers.auth import router as auth_router
from app.routers.budgets import router as budgets_router
from app.routers.goals import router as goals_router
from app.routers.income import router as income_router
from app.routers.categories import router as categories_router
from app.routers.expenses import router as expenses_router


app = FastAPI(title="Smart Expense Tracker API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router, prefix="/api/v1")
app.include_router(categories_router, prefix="/api/v1")
app.include_router(expenses_router, prefix="/api/v1")
app.include_router(ai_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(budgets_router, prefix="/api/v1")
app.include_router(goals_router, prefix="/api/v1")
app.include_router(income_router, prefix="/api/v1")


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
