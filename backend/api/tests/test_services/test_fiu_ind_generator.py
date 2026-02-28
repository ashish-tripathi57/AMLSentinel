"""Unit tests for the FIU-IND STR PDF generator service.

Validates that the generator produces valid PDF bytes from seeded alert data,
and raises appropriate errors for non-existent alerts.
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import api.models  # noqa: F401 — registers all ORM models
from api.models.base import Base
from api.seed.__main__ import seed_all
from api.services.fiu_ind_generator import generate_str_pdf

TEST_DATABASE_URL = "sqlite+aiosqlite://"


@pytest.fixture()
async def seeded_session():
    """Provide an async session backed by a fully-seeded in-memory SQLite database."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        await seed_all(session)
        await session.commit()

    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


async def _get_first_alert_id(session: AsyncSession) -> str:
    """Return the UUID of the first seeded alert."""
    from api.repositories.alert import AlertRepository

    repo = AlertRepository(session)
    alerts, _ = await repo.get_all(limit=1)
    assert len(alerts) > 0, "Seeder must produce at least one alert"
    return alerts[0].id


@pytest.mark.asyncio
async def test_generate_str_pdf_returns_bytes(seeded_session: AsyncSession) -> None:
    """STR PDF generator returns bytes that start with the PDF magic header."""
    alert_id = await _get_first_alert_id(seeded_session)
    pdf_bytes = await generate_str_pdf(alert_id, seeded_session)

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0
    assert pdf_bytes[:5] == b"%PDF-"


@pytest.mark.asyncio
async def test_generate_str_pdf_raises_for_unknown_alert(seeded_session: AsyncSession) -> None:
    """STR PDF generator raises ValueError for a non-existent alert UUID."""
    with pytest.raises(ValueError, match="not found"):
        await generate_str_pdf("00000000-0000-0000-0000-000000000000", seeded_session)
