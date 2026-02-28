"""Integration tests for GET /api/analytics/export/csv.

Verifies the CSV export endpoint returns a well-formed CSV file
containing all four analytics sections: typology breakdown,
resolution breakdown, risk distribution, and overview stats.
"""

import csv
import io

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
    """AsyncClient backed by a seeded in-memory database."""
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
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_csv_export_returns_200(seeded_client: AsyncClient) -> None:
    """GET /api/analytics/export/csv returns HTTP 200."""
    response = await seeded_client.get("/api/analytics/export/csv")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_csv_export_content_type(seeded_client: AsyncClient) -> None:
    """Response content-type is text/csv."""
    response = await seeded_client.get("/api/analytics/export/csv")
    content_type = response.headers["content-type"]
    assert "text/csv" in content_type


@pytest.mark.asyncio
async def test_csv_export_content_disposition(seeded_client: AsyncClient) -> None:
    """Response includes Content-Disposition attachment header."""
    response = await seeded_client.get("/api/analytics/export/csv")
    assert "content-disposition" in response.headers
    disposition = response.headers["content-disposition"]
    assert "attachment" in disposition
    assert ".csv" in disposition


@pytest.mark.asyncio
async def test_csv_export_contains_typology_section(seeded_client: AsyncClient) -> None:
    """CSV contains the Typology Breakdown section with expected headers."""
    response = await seeded_client.get("/api/analytics/export/csv")
    text = response.text
    assert "Typology Breakdown" in text
    assert "Typology" in text
    assert "Count" in text


@pytest.mark.asyncio
async def test_csv_export_contains_resolution_section(seeded_client: AsyncClient) -> None:
    """CSV contains the Resolution Breakdown section."""
    response = await seeded_client.get("/api/analytics/export/csv")
    text = response.text
    assert "Resolution Breakdown" in text
    assert "Resolution" in text


@pytest.mark.asyncio
async def test_csv_export_contains_risk_distribution_section(seeded_client: AsyncClient) -> None:
    """CSV contains the Risk Distribution section with expected headers."""
    response = await seeded_client.get("/api/analytics/export/csv")
    text = response.text
    assert "Risk Score Distribution" in text
    assert "Range" in text


@pytest.mark.asyncio
async def test_csv_export_contains_overview_section(seeded_client: AsyncClient) -> None:
    """CSV contains the Overview Statistics section with key metrics."""
    response = await seeded_client.get("/api/analytics/export/csv")
    text = response.text
    assert "Overview Statistics" in text
    assert "Total Alerts" in text
    assert "Open Alerts" in text
    assert "Closed Alerts" in text
    assert "Average Investigation Days" in text
    assert "False Positive Rate" in text


@pytest.mark.asyncio
async def test_csv_export_is_parseable_csv(seeded_client: AsyncClient) -> None:
    """The response body is valid CSV that can be parsed by Python csv module."""
    response = await seeded_client.get("/api/analytics/export/csv")
    reader = csv.reader(io.StringIO(response.text))
    rows = list(reader)
    # Must have multiple rows across all sections
    assert len(rows) > 10


@pytest.mark.asyncio
async def test_csv_export_typology_data_present(seeded_client: AsyncClient) -> None:
    """Typology section contains actual seeded data rows (not just headers)."""
    response = await seeded_client.get("/api/analytics/export/csv")
    reader = csv.reader(io.StringIO(response.text))
    rows = list(reader)

    # Find the typology header row
    typology_header_idx = None
    for i, row in enumerate(rows):
        if len(row) >= 2 and row[0] == "Typology" and row[1] == "Count":
            typology_header_idx = i
            break

    assert typology_header_idx is not None, "Typology header row not found"
    # At least one data row after the header
    data_row = rows[typology_header_idx + 1]
    assert len(data_row) >= 2
    assert data_row[0] != ""  # typology name present
    assert int(data_row[1]) > 0  # count is a positive integer


@pytest.mark.asyncio
async def test_csv_export_empty_database(client: AsyncClient) -> None:
    """CSV export on an empty database still returns 200 with section headers."""
    response = await client.get("/api/analytics/export/csv")
    assert response.status_code == 200
    text = response.text
    assert "Typology Breakdown" in text
    assert "Overview Statistics" in text
