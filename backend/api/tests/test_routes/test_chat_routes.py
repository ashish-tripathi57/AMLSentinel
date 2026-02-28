"""Integration tests for POST /api/alerts/{alert_id}/chat (SSE streaming).

The chat endpoint calls the real Claude API, so all tests are guarded by
the ``requires_api_key`` skip marker.  Route-level tests that only check
the request/response shape without hitting the AI are not applicable here
because the entire endpoint is AI-driven.
"""

import os

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import api.models  # noqa: F401 — registers all ORM models
from api.core.database import get_async_session
from api.main import create_app
from api.models.base import Base
from api.seed.__main__ import seed_all

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
async def seeded_client():
    """AsyncClient backed by a fully seeded in-memory SQLite database."""
    seeded_engine = create_async_engine("sqlite+aiosqlite://", echo=False)
    async with seeded_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    test_session_factory = async_sessionmaker(
        seeded_engine, class_=AsyncSession, expire_on_commit=False
    )

    async with test_session_factory() as seed_session:
        await seed_all(seed_session)
        await seed_session.commit()

    async def override():
        async with test_session_factory() as session:
            yield session

    application = create_app()
    application.dependency_overrides[get_async_session] = override

    async with AsyncClient(
        transport=ASGITransport(app=application), base_url="http://test"
    ) as c:
        yield c

    async with seeded_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await seeded_engine.dispose()


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


async def _get_first_alert_id(client: AsyncClient) -> str:
    response = await client.get("/api/alerts?limit=1")
    assert response.status_code == 200
    return response.json()["alerts"][0]["id"]


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@requires_api_key
@pytest.mark.asyncio
async def test_chat_endpoint_returns_sse_stream(seeded_client: AsyncClient) -> None:
    """POST /chat returns an SSE stream that contains at least one data frame."""
    alert_id = await _get_first_alert_id(seeded_client)

    # Use stream=True to consume the SSE response incrementally.
    async with seeded_client.stream(
        "POST",
        f"/api/alerts/{alert_id}/chat",
        params={"analyst_username": "test.analyst"},
        json={"content": "What are the key risk indicators for this alert?"},
    ) as response:
        assert response.status_code == 200
        assert "text/event-stream" in response.headers.get("content-type", "")

        lines = []
        async for line in response.aiter_lines():
            lines.append(line)

    data_lines = [l for l in lines if l.startswith("data:")]
    assert len(data_lines) > 0, "SSE stream must contain at least one data frame"


@requires_api_key
@pytest.mark.asyncio
async def test_chat_endpoint_stream_ends_with_done(seeded_client: AsyncClient) -> None:
    """The SSE stream ends with 'data: [DONE]' sentinel."""
    alert_id = await _get_first_alert_id(seeded_client)

    async with seeded_client.stream(
        "POST",
        f"/api/alerts/{alert_id}/chat",
        params={"analyst_username": "test.analyst"},
        json={"content": "List the flagged transactions."},
    ) as response:
        assert response.status_code == 200
        lines = []
        async for line in response.aiter_lines():
            lines.append(line)

    data_lines = [l for l in lines if l.startswith("data:")]
    assert data_lines[-1] == "data: [DONE]", "Last SSE frame must be 'data: [DONE]'"


@pytest.mark.asyncio
async def test_chat_endpoint_returns_404_for_unknown_alert(seeded_client: AsyncClient) -> None:
    """POST /chat returns 404 when the alert does not exist."""
    response = await seeded_client.post(
        "/api/alerts/00000000-0000-0000-0000-000000000000/chat",
        params={"analyst_username": "test.analyst"},
        json={"content": "Hello"},
    )
    assert response.status_code == 404
