import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from api.core.database import get_async_session
from api.main import create_app
import api.models  # noqa: F401 — registers all models with SQLAlchemy
from api.models.base import Base

TEST_DATABASE_URL = "sqlite+aiosqlite://"


@pytest.fixture()
async def engine():
    """Create an async engine using in-memory SQLite for test isolation."""
    test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield test_engine
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest.fixture()
async def db_session(engine):
    """Provide an async database session that rolls back after each test."""
    test_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with test_session_factory() as session:
        yield session
        await session.rollback()


@pytest.fixture()
async def client(engine):
    """Provide an httpx AsyncClient wired to the test FastAPI app."""
    test_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_async_session():
        async with test_session_factory() as session:
            yield session

    application = create_app()
    application.dependency_overrides[get_async_session] = override_get_async_session

    async with AsyncClient(
        transport=ASGITransport(app=application),
        base_url="http://test",
    ) as test_client:
        yield test_client
