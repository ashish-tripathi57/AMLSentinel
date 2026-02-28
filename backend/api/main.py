from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


def create_app() -> FastAPI:
    """Create and configure the AML Sentinel FastAPI application."""
    application = FastAPI(
        title="AML Sentinel API",
        version="1.0.0",
        description="AI-powered Anti-Money Laundering Alert Investigation Assistant",
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
