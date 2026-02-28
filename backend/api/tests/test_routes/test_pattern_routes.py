"""Integration tests for GET /api/alerts/{alert_id}/patterns.

The pattern analysis endpoint calls the real Claude API, so all tests are
guarded by the ``requires_api_key`` skip marker.
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
async def test_get_patterns_returns_200(seeded_client: AsyncClient) -> None:
    """GET /patterns returns HTTP 200 for a valid alert (or 502 on transient AI failure)."""
    alert_id = await _get_first_alert_id(seeded_client)
    response = await seeded_client.get(f"/api/alerts/{alert_id}/patterns")
    assert response.status_code in (200, 502), (
        f"Expected 200 or 502, got {response.status_code}: {response.text}"
    )


@requires_api_key
@pytest.mark.asyncio
async def test_get_patterns_response_has_required_keys(seeded_client: AsyncClient) -> None:
    """GET /patterns returns a JSON object with 'patterns', 'risk_indicators', and 'summary'."""
    alert_id = await _get_first_alert_id(seeded_client)
    response = await seeded_client.get(f"/api/alerts/{alert_id}/patterns")
    if response.status_code == 502:
        pytest.skip("Transient AI service error; skipping response shape assertion.")
    body = response.json()

    assert "patterns" in body
    assert "risk_indicators" in body
    assert "summary" in body


@requires_api_key
@pytest.mark.asyncio
async def test_get_patterns_value_types(seeded_client: AsyncClient) -> None:
    """'patterns' and 'risk_indicators' are lists; 'summary' is a non-empty string."""
    alert_id = await _get_first_alert_id(seeded_client)
    response = await seeded_client.get(f"/api/alerts/{alert_id}/patterns")
    if response.status_code == 502:
        pytest.skip("Transient AI service error; skipping type assertions.")
    body = response.json()

    assert isinstance(body["patterns"], list)
    assert isinstance(body["risk_indicators"], list)
    assert isinstance(body["summary"], str)
    assert len(body["summary"]) > 0


@requires_api_key
@pytest.mark.asyncio
async def test_get_patterns_returns_404_for_unknown_alert(seeded_client: AsyncClient) -> None:
    """GET /patterns returns 404 when the alert does not exist."""
    response = await seeded_client.get(
        "/api/alerts/00000000-0000-0000-0000-000000000000/patterns"
    )
    assert response.status_code == 404
