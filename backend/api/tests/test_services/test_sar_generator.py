"""Tests for the SAR draft generation AI service.

Real-API tests are guarded by the ``requires_api_key`` marker and skipped
in CI unless ``RUN_REAL_API_TESTS=1`` is set in the environment.
"""

import os

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import api.models  # noqa: F401 — registers all ORM models
from api.models.alert import Alert
from api.models.base import Base
from api.models.investigation import SARDraft
from api.seed.__main__ import seed_all
from api.services.sar_generator import generate_sar_draft
from api.tests.test_services.conftest import skip_on_ai_transient_error

# ---------------------------------------------------------------------------
# Skip marker
# ---------------------------------------------------------------------------
requires_api_key = pytest.mark.skipif(
    not os.environ.get("RUN_REAL_API_TESTS"),
    reason="Skipped by default. Set RUN_REAL_API_TESTS=1 to run.",
)

# SAR sections that Claude must populate for a valid draft.
SAR_SECTIONS = [
    "subject_info",
    "activity_description",
    "narrative",
    "reason_for_suspicion",
    "action_taken",
]


# ---------------------------------------------------------------------------
# Fixture
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
    result = await session.execute(select(Alert).limit(1))
    return result.scalar_one().id


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@requires_api_key
@pytest.mark.asyncio
@skip_on_ai_transient_error
async def test_generate_sar_draft_returns_sar_draft_model(seeded_session: AsyncSession) -> None:
    """generate_sar_draft returns a SARDraft ORM model instance."""
    alert_id = await _first_alert_id(seeded_session)
    draft = await generate_sar_draft(alert_id, seeded_session)

    assert isinstance(draft, SARDraft), f"Expected SARDraft, got {type(draft)}"


@requires_api_key
@pytest.mark.asyncio
@skip_on_ai_transient_error
async def test_generate_sar_draft_all_sections_filled(seeded_session: AsyncSession) -> None:
    """All five SAR sections are non-empty strings in the returned draft."""
    alert_id = await _first_alert_id(seeded_session)
    draft = await generate_sar_draft(alert_id, seeded_session)

    for section in SAR_SECTIONS:
        value = getattr(draft, section, None)
        assert value is not None, f"Section '{section}' must not be None"
        assert isinstance(value, str), f"Section '{section}' must be a string"
        assert len(value.strip()) > 0, f"Section '{section}' must not be empty"


@requires_api_key
@pytest.mark.asyncio
@skip_on_ai_transient_error
async def test_generate_sar_draft_version_increments(seeded_session: AsyncSession) -> None:
    """Each call to generate_sar_draft increments the version number by 1."""
    alert_id = await _first_alert_id(seeded_session)

    first_draft = await generate_sar_draft(alert_id, seeded_session)
    second_draft = await generate_sar_draft(alert_id, seeded_session)

    assert second_draft.version == first_draft.version + 1


@requires_api_key
@pytest.mark.asyncio
@skip_on_ai_transient_error
async def test_generate_sar_draft_generated_by_ai(seeded_session: AsyncSession) -> None:
    """The generated_by field is set to 'ai'."""
    alert_id = await _first_alert_id(seeded_session)
    draft = await generate_sar_draft(alert_id, seeded_session)

    assert draft.generated_by == "ai"


@requires_api_key
@pytest.mark.asyncio
async def test_generate_sar_draft_raises_for_unknown_alert(seeded_session: AsyncSession) -> None:
    """generate_sar_draft raises ValueError for a non-existent alert."""
    with pytest.raises(ValueError, match="not found"):
        await generate_sar_draft("00000000-0000-0000-0000-000000000000", seeded_session)
