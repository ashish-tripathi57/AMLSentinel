"""Tests for the pattern analysis AI service.

Real-API tests are guarded by the ``requires_api_key`` marker and skipped
in CI unless ``RUN_REAL_API_TESTS=1`` is set in the environment.
"""

import os

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import api.models  # noqa: F401 — registers all ORM models
from api.models.base import Base
from api.seed.__main__ import seed_all
from api.services.pattern_analysis import analyze_patterns
from api.tests.test_services.conftest import skip_on_ai_transient_error

# ---------------------------------------------------------------------------
# Skip marker — applied to every test that calls the real Claude API
# ---------------------------------------------------------------------------
requires_api_key = pytest.mark.skipif(
    not os.environ.get("RUN_REAL_API_TESTS"),
    reason="Skipped by default. Set RUN_REAL_API_TESTS=1 to run.",
)


# ---------------------------------------------------------------------------
# Fixture — seeded in-memory database
# ---------------------------------------------------------------------------


@pytest.fixture()
async def seeded_session():
    """Yield an AsyncSession backed by a fully seeded in-memory SQLite database."""
    engine = create_async_engine("sqlite+aiosqlite://", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as seed_session:
        await seed_all(seed_session)
        await seed_session.commit()

    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


async def _first_alert_id(session: AsyncSession) -> str:
    """Return the UUID of the first seeded alert."""
    from sqlalchemy import select
    from api.models.alert import Alert

    result = await session.execute(select(Alert).limit(1))
    alert = result.scalar_one()
    return alert.id


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@requires_api_key
@pytest.mark.asyncio
@skip_on_ai_transient_error
async def test_analyze_patterns_returns_expected_keys(seeded_session: AsyncSession) -> None:
    """analyze_patterns returns a dict with 'patterns', 'risk_indicators', and 'summary'."""
    alert_id = await _first_alert_id(seeded_session)
    result = await analyze_patterns(alert_id, seeded_session)

    assert isinstance(result, dict), "Result must be a dict"
    assert "patterns" in result, "Result must contain 'patterns'"
    assert "risk_indicators" in result, "Result must contain 'risk_indicators'"
    assert "summary" in result, "Result must contain 'summary'"


@requires_api_key
@pytest.mark.asyncio
@skip_on_ai_transient_error
async def test_analyze_patterns_returns_lists_and_string(seeded_session: AsyncSession) -> None:
    """'patterns' and 'risk_indicators' are lists; 'summary' is a non-empty string."""
    alert_id = await _first_alert_id(seeded_session)
    result = await analyze_patterns(alert_id, seeded_session)

    assert isinstance(result["patterns"], list)
    assert isinstance(result["risk_indicators"], list)
    assert isinstance(result["summary"], str)
    assert len(result["summary"]) > 0, "Summary must be non-empty"


@requires_api_key
@pytest.mark.asyncio
async def test_analyze_patterns_raises_for_unknown_alert(seeded_session: AsyncSession) -> None:
    """analyze_patterns raises ValueError for a non-existent alert UUID."""
    with pytest.raises(ValueError, match="not found"):
        await analyze_patterns("00000000-0000-0000-0000-000000000000", seeded_session)
