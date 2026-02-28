"""Tests for the false positive detection service."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import api.models  # noqa: F401 — registers all models
from api.models.base import Base
from api.seed.__main__ import seed_all
from api.services.false_positive_detector import detect_false_positives

TEST_DATABASE_URL = "sqlite+aiosqlite://"


@pytest.fixture()
async def seeded_session():
    """Provide a seeded async database session for service-level tests."""
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


@pytest.mark.asyncio
async def test_detect_false_positives_returns_results(seeded_session: AsyncSession):
    """detect_false_positives returns a list of result dicts for each analyzed alert."""
    from sqlalchemy import select

    from api.models.alert import Alert

    # Grab two alert UUIDs from seeded data
    result = await seeded_session.execute(select(Alert).limit(2))
    alerts = list(result.scalars().all())
    alert_ids = [a.id for a in alerts]

    results = await detect_false_positives(alert_ids, seeded_session)

    assert isinstance(results, list)
    assert len(results) == 2
    for item in results:
        assert "alert_id" in item
        assert "alert_short_id" in item
        assert "title" in item
        assert "confidence" in item
        assert "reasoning" in item
        assert "suggested_resolution" in item
        assert 0.0 <= item["confidence"] <= 1.0
