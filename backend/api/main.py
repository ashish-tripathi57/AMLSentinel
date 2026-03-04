from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from api.core.config import settings
from api.routes.alerts import router as alerts_router
from api.routes.analytics import router as analytics_router
from api.routes.auth import router as auth_router
from api.routes.chat import router as chat_router
from api.routes.health import router as health_router
from api.routes.investigation import router as investigation_router
from api.routes.pattern_analysis import router as pattern_analysis_router
from api.routes.sar import bulk_router as bulk_sar_router
from api.routes.sar import router as sar_router


async def _seed_if_empty() -> None:
    """Initialise the database schema and seed synthetic data if the alerts table is empty.

    This runs once on startup so a fresh clone works without any manual seed step.
    """
    from api.core.database import async_session_factory, init_db
    from api.seed.__main__ import seed_all

    await init_db()

    async with async_session_factory() as session:
        result = await session.execute(text("SELECT COUNT(*) FROM alerts"))
        alert_count = result.scalar_one()

        if alert_count == 0:
            print("Empty database detected — seeding synthetic AML data...")
            await seed_all(session)
            await session.commit()
            print("Auto-seed complete: 20 alerts across 6 typologies.")
        else:
            print(f"Database already contains {alert_count} alerts — skipping seed.")


@asynccontextmanager
async def lifespan(application: FastAPI):
    await _seed_if_empty()
    yield


def create_app() -> FastAPI:
    """Create and configure the AML Sentinel FastAPI application."""
    application = FastAPI(
        title="AML Sentinel API",
        version="1.0.0",
        description="AI-powered Anti-Money Laundering Alert Investigation Assistant",
        lifespan=lifespan,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_origin_regex=settings.CORS_ORIGIN_REGEX,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(auth_router)
    application.include_router(alerts_router)
    application.include_router(analytics_router)
    application.include_router(health_router)
    application.include_router(investigation_router)
    application.include_router(chat_router)
    application.include_router(sar_router)
    application.include_router(bulk_sar_router)
    application.include_router(pattern_analysis_router)
    return application


app = create_app()
