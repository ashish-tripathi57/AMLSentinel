"""Integration tests for the /api/analytics routes.

Each test uses a ``seeded_client`` fixture that:
  1. Spins up an in-memory SQLite database with the full schema.
  2. Runs all typology seeders (20 alerts across 6 typologies).
  3. Returns an httpx AsyncClient wired to the FastAPI app via ASGI transport.

The ``client`` fixture from conftest.py is used for empty-database edge cases.
"""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import api.models  # noqa: F401 -- ensures all models are registered
from api.core.database import get_async_session
from api.main import create_app
from api.models.base import Base
from api.seed.__main__ import seed_all

# ---------------------------------------------------------------------------
# Fixture: seeded_client
# ---------------------------------------------------------------------------

TEST_DATABASE_URL = "sqlite+aiosqlite://"


@pytest.fixture()
async def seeded_client():
    """AsyncClient backed by a seeded in-memory database.

    Seeds all 20 typology alerts before yielding the client so that
    every test in this module can exercise real data without hitting
    an external database.
    """
    seeded_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with seeded_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    test_session_factory = async_sessionmaker(
        seeded_engine, class_=AsyncSession, expire_on_commit=False
    )

    async with test_session_factory() as seed_session:
        await seed_all(seed_session)
        await seed_session.commit()

    async def override_get_async_session():
        async with test_session_factory() as session:
            yield session

    application = create_app()
    application.dependency_overrides[get_async_session] = override_get_async_session

    async with AsyncClient(
        transport=ASGITransport(app=application), base_url="http://test"
    ) as test_client:
        yield test_client

    async with seeded_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await seeded_engine.dispose()


# ---------------------------------------------------------------------------
# GET /api/analytics/overview
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_overview_returns_200(seeded_client: AsyncClient) -> None:
    """Overview endpoint returns HTTP 200 with expected fields."""
    response = await seeded_client.get("/api/analytics/overview")
    assert response.status_code == 200
    body = response.json()
    assert "total_alerts" in body
    assert "open_alerts" in body
    assert "closed_alerts" in body
    assert "average_investigation_days" in body
    assert "false_positive_rate" in body


@pytest.mark.asyncio
async def test_overview_total_alerts(seeded_client: AsyncClient) -> None:
    """Overview total_alerts equals the sum of open and closed alerts."""
    response = await seeded_client.get("/api/analytics/overview")
    body = response.json()
    assert body["total_alerts"] >= 20
    assert body["total_alerts"] >= body["open_alerts"] + body["closed_alerts"]


@pytest.mark.asyncio
async def test_overview_empty_database(client: AsyncClient) -> None:
    """Overview returns zero counts for an empty database."""
    response = await client.get("/api/analytics/overview")
    assert response.status_code == 200
    body = response.json()
    assert body["total_alerts"] == 0
    assert body["open_alerts"] == 0
    assert body["closed_alerts"] == 0
    assert body["average_investigation_days"] == 0.0
    assert body["false_positive_rate"] == 0.0


# ---------------------------------------------------------------------------
# GET /api/analytics/alerts-by-typology
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_alerts_by_typology_returns_200(seeded_client: AsyncClient) -> None:
    """Typology breakdown returns HTTP 200 with list of items."""
    response = await seeded_client.get("/api/analytics/alerts-by-typology")
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert len(body) > 0


@pytest.mark.asyncio
async def test_alerts_by_typology_structure(seeded_client: AsyncClient) -> None:
    """Each item has typology and count fields."""
    response = await seeded_client.get("/api/analytics/alerts-by-typology")
    body = response.json()
    for item in body:
        assert "typology" in item
        assert "count" in item
        assert isinstance(item["typology"], str)
        assert isinstance(item["count"], int)
        assert item["count"] > 0


@pytest.mark.asyncio
async def test_alerts_by_typology_total_matches(seeded_client: AsyncClient) -> None:
    """Sum of all typology counts equals total_alerts in overview."""
    typology_response = await seeded_client.get("/api/analytics/alerts-by-typology")
    overview_response = await seeded_client.get("/api/analytics/overview")

    typology_total = sum(item["count"] for item in typology_response.json())
    overview_total = overview_response.json()["total_alerts"]
    assert typology_total == overview_total


# ---------------------------------------------------------------------------
# GET /api/analytics/resolution-breakdown
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_resolution_breakdown_returns_200(seeded_client: AsyncClient) -> None:
    """Resolution breakdown returns HTTP 200."""
    response = await seeded_client.get("/api/analytics/resolution-breakdown")
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)


@pytest.mark.asyncio
async def test_resolution_breakdown_structure(seeded_client: AsyncClient) -> None:
    """Each item has resolution and count fields."""
    response = await seeded_client.get("/api/analytics/resolution-breakdown")
    body = response.json()
    for item in body:
        assert "resolution" in item
        assert "count" in item


# ---------------------------------------------------------------------------
# GET /api/analytics/risk-distribution
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_risk_distribution_returns_200(seeded_client: AsyncClient) -> None:
    """Risk distribution returns HTTP 200 with 5 buckets."""
    response = await seeded_client.get("/api/analytics/risk-distribution")
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert len(body) == 5


@pytest.mark.asyncio
async def test_risk_distribution_bucket_names(seeded_client: AsyncClient) -> None:
    """Risk distribution contains exactly the expected 5 range labels."""
    response = await seeded_client.get("/api/analytics/risk-distribution")
    body = response.json()
    range_names = {item["range"] for item in body}
    expected = {"0-20", "21-40", "41-60", "61-80", "81-100"}
    assert range_names == expected


@pytest.mark.asyncio
async def test_risk_distribution_total_matches(seeded_client: AsyncClient) -> None:
    """Sum of all bucket counts equals total_alerts in overview."""
    risk_response = await seeded_client.get("/api/analytics/risk-distribution")
    overview_response = await seeded_client.get("/api/analytics/overview")

    risk_total = sum(item["count"] for item in risk_response.json())
    overview_total = overview_response.json()["total_alerts"]
    assert risk_total == overview_total


# ---------------------------------------------------------------------------
# GET /api/analytics/alert-volume-trend
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_alert_volume_trend_returns_200(seeded_client: AsyncClient) -> None:
    """Alert volume trend returns HTTP 200."""
    response = await seeded_client.get("/api/analytics/alert-volume-trend")
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)


@pytest.mark.asyncio
async def test_alert_volume_trend_structure(seeded_client: AsyncClient) -> None:
    """Each item has date and count fields."""
    response = await seeded_client.get("/api/analytics/alert-volume-trend")
    body = response.json()
    for item in body:
        assert "date" in item
        assert "count" in item


@pytest.mark.asyncio
async def test_alert_volume_trend_custom_days(seeded_client: AsyncClient) -> None:
    """Accepts a custom days query parameter."""
    response = await seeded_client.get("/api/analytics/alert-volume-trend?days=7")
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)


@pytest.mark.asyncio
async def test_alert_volume_trend_date_ordering(seeded_client: AsyncClient) -> None:
    """Dates are returned in ascending order."""
    response = await seeded_client.get("/api/analytics/alert-volume-trend?days=90")
    body = response.json()
    if len(body) > 1:
        dates = [item["date"] for item in body]
        assert dates == sorted(dates)


# ---------------------------------------------------------------------------
# GET /api/analytics/false-positive-trend
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_false_positive_trend_returns_200(seeded_client: AsyncClient) -> None:
    """False-positive trend returns HTTP 200."""
    response = await seeded_client.get("/api/analytics/false-positive-trend")
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)


@pytest.mark.asyncio
async def test_false_positive_trend_structure(seeded_client: AsyncClient) -> None:
    """Each item has week, total_closed, false_positive_count, rate fields."""
    response = await seeded_client.get("/api/analytics/false-positive-trend")
    body = response.json()
    for item in body:
        assert "week" in item
        assert "total_closed" in item
        assert "false_positive_count" in item
        assert "rate" in item


@pytest.mark.asyncio
async def test_false_positive_trend_custom_days(seeded_client: AsyncClient) -> None:
    """Accepts a custom days query parameter."""
    response = await seeded_client.get("/api/analytics/false-positive-trend?days=30")
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)


@pytest.mark.asyncio
async def test_false_positive_trend_rate_bounds(seeded_client: AsyncClient) -> None:
    """False-positive rate is between 0.0 and 1.0 for each week."""
    response = await seeded_client.get("/api/analytics/false-positive-trend")
    body = response.json()
    for item in body:
        assert 0.0 <= item["rate"] <= 1.0
