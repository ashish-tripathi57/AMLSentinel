"""Tests for the checklist AI auto-check service.

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
from api.models.investigation import ChecklistItem
from api.seed.__main__ import seed_all
from api.services.checklist_ai import auto_check_item
from api.tests.test_services.conftest import skip_on_ai_transient_error

# ---------------------------------------------------------------------------
# Skip marker
# ---------------------------------------------------------------------------
requires_api_key = pytest.mark.skipif(
    not os.environ.get("RUN_REAL_API_TESTS"),
    reason="Skipped by default. Set RUN_REAL_API_TESTS=1 to run.",
)


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
# Helpers
# ---------------------------------------------------------------------------


async def _get_alert_and_checklist_item(session: AsyncSession) -> tuple[str, str]:
    """Return (alert_id, item_id) for the first seeded alert that has a checklist item."""
    alert_result = await session.execute(select(Alert).limit(1))
    alert = alert_result.scalar_one()

    item_result = await session.execute(
        select(ChecklistItem).where(ChecklistItem.alert_id == alert.id).limit(1)
    )
    item = item_result.scalar_one()
    return alert.id, item.id


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@requires_api_key
@pytest.mark.asyncio
@skip_on_ai_transient_error
async def test_auto_check_item_returns_expected_shape(seeded_session: AsyncSession) -> None:
    """auto_check_item returns a dict with 'is_checked' (bool) and 'rationale' (str)."""
    alert_id, item_id = await _get_alert_and_checklist_item(seeded_session)
    result = await auto_check_item(alert_id, item_id, seeded_session)

    assert isinstance(result, dict), "Result must be a dict"
    assert "is_checked" in result, "Result must contain 'is_checked'"
    assert "rationale" in result, "Result must contain 'rationale'"
    assert isinstance(result["is_checked"], bool), "'is_checked' must be a boolean"
    assert isinstance(result["rationale"], str), "'rationale' must be a string"
    assert len(result["rationale"]) > 0, "'rationale' must be non-empty"


@requires_api_key
@pytest.mark.asyncio
@skip_on_ai_transient_error
async def test_auto_check_item_persists_result(seeded_session: AsyncSession) -> None:
    """auto_check_item persists the AI verdict to the database via ChecklistRepository."""
    alert_id, item_id = await _get_alert_and_checklist_item(seeded_session)
    result = await auto_check_item(alert_id, item_id, seeded_session)

    # Re-fetch the item directly to verify persistence.
    refreshed = await seeded_session.execute(
        select(ChecklistItem).where(ChecklistItem.id == item_id)
    )
    item = refreshed.scalar_one()

    assert item.is_checked == result["is_checked"]
    assert item.checked_by == "ai"
    assert item.ai_rationale == result["rationale"]


@requires_api_key
@pytest.mark.asyncio
async def test_auto_check_item_raises_for_unknown_alert(seeded_session: AsyncSession) -> None:
    """auto_check_item raises ValueError for a non-existent alert."""
    with pytest.raises(ValueError, match="not found"):
        await auto_check_item(
            "00000000-0000-0000-0000-000000000000",
            "00000000-0000-0000-0000-000000000001",
            seeded_session,
        )


@requires_api_key
@pytest.mark.asyncio
async def test_auto_check_item_raises_for_unknown_item(seeded_session: AsyncSession) -> None:
    """auto_check_item raises ValueError when the checklist item does not exist."""
    alert_result = await seeded_session.execute(select(Alert).limit(1))
    alert_id = alert_result.scalar_one().id

    with pytest.raises(ValueError, match="not found"):
        await auto_check_item(
            alert_id,
            "00000000-0000-0000-0000-000000000000",
            seeded_session,
        )
