"""Tests for the investigation chat AI service.

Real-API tests are guarded by the ``requires_api_key`` marker and skipped
in CI unless ``RUN_REAL_API_TESTS=1`` is set in the environment.
"""

import os

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import api.models  # noqa: F401 — registers all ORM models
from api.models.base import Base
from api.seed.__main__ import seed_all
from api.services.chat import get_chat_response
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
# Helper
# ---------------------------------------------------------------------------


async def _first_alert_id(session: AsyncSession) -> str:
    from sqlalchemy import select
    from api.models.alert import Alert

    result = await session.execute(select(Alert).limit(1))
    return result.scalar_one().id


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@requires_api_key
@pytest.mark.asyncio
@skip_on_ai_transient_error
async def test_get_chat_response_yields_chunks(seeded_session: AsyncSession) -> None:
    """get_chat_response returns an async iterator that yields at least one string chunk."""
    alert_id = await _first_alert_id(seeded_session)
    stream = await get_chat_response(
        alert_id=alert_id,
        user_message="What are the main red flags in this alert?",
        analyst_username="test.analyst",
        session=seeded_session,
    )

    chunks: list[str] = []
    async for chunk in stream:
        assert isinstance(chunk, str), "Each yielded chunk must be a string"
        chunks.append(chunk)

    assert len(chunks) > 0, "Stream must yield at least one text chunk"


@requires_api_key
@pytest.mark.asyncio
@skip_on_ai_transient_error
async def test_get_chat_response_full_text_is_non_empty(seeded_session: AsyncSession) -> None:
    """Concatenated stream chunks form a non-empty response."""
    alert_id = await _first_alert_id(seeded_session)
    stream = await get_chat_response(
        alert_id=alert_id,
        user_message="Summarise the alert in one sentence.",
        analyst_username="test.analyst",
        session=seeded_session,
    )

    full_text = "".join([chunk async for chunk in stream])
    assert len(full_text) > 0, "Full streamed response must not be empty"


@requires_api_key
@pytest.mark.asyncio
async def test_get_chat_response_raises_for_unknown_alert(seeded_session: AsyncSession) -> None:
    """get_chat_response raises ValueError for a non-existent alert UUID."""
    with pytest.raises(ValueError, match="not found"):
        await get_chat_response(
            alert_id="00000000-0000-0000-0000-000000000000",
            user_message="Hello",
            analyst_username="test.analyst",
            session=seeded_session,
        )
