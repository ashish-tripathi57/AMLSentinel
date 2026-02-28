"""Integration tests for POST /api/sar/bulk-export.

Verifies the bulk SAR export endpoint returns a valid ZIP archive
containing one STR PDF per requested alert ID.
"""

import io
import zipfile

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
# Helpers
# ---------------------------------------------------------------------------


async def _get_alert_ids(client: AsyncClient, count: int = 2) -> list[str]:
    """Fetch the first N alert IDs via the alerts API."""
    response = await client.get(f"/api/alerts?limit={count}")
    assert response.status_code == 200
    return [alert["id"] for alert in response.json()["alerts"][:count]]


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_bulk_export_returns_200(seeded_client: AsyncClient) -> None:
    """POST /api/sar/bulk-export returns HTTP 200 with valid alert IDs."""
    alert_ids = await _get_alert_ids(seeded_client, count=2)
    response = await seeded_client.post(
        "/api/sar/bulk-export", json={"alert_ids": alert_ids}
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_bulk_export_content_type(seeded_client: AsyncClient) -> None:
    """Response content-type is application/zip."""
    alert_ids = await _get_alert_ids(seeded_client, count=1)
    response = await seeded_client.post(
        "/api/sar/bulk-export", json={"alert_ids": alert_ids}
    )
    content_type = response.headers["content-type"]
    assert "application/zip" in content_type


@pytest.mark.asyncio
async def test_bulk_export_content_disposition(seeded_client: AsyncClient) -> None:
    """Response includes Content-Disposition attachment header with .zip extension."""
    alert_ids = await _get_alert_ids(seeded_client, count=1)
    response = await seeded_client.post(
        "/api/sar/bulk-export", json={"alert_ids": alert_ids}
    )
    assert "content-disposition" in response.headers
    disposition = response.headers["content-disposition"]
    assert "attachment" in disposition
    assert ".zip" in disposition


@pytest.mark.asyncio
async def test_bulk_export_zip_contains_expected_pdfs(seeded_client: AsyncClient) -> None:
    """ZIP archive contains one PDF file per requested alert ID."""
    alert_ids = await _get_alert_ids(seeded_client, count=2)
    response = await seeded_client.post(
        "/api/sar/bulk-export", json={"alert_ids": alert_ids}
    )

    zip_buffer = io.BytesIO(response.content)
    assert zipfile.is_zipfile(zip_buffer)

    with zipfile.ZipFile(zip_buffer, "r") as zf:
        filenames = zf.namelist()
        assert len(filenames) == len(alert_ids)
        for name in filenames:
            assert name.endswith(".pdf")


@pytest.mark.asyncio
async def test_bulk_export_pdfs_contain_valid_pdf_bytes(seeded_client: AsyncClient) -> None:
    """Each file inside the ZIP starts with the PDF magic bytes."""
    alert_ids = await _get_alert_ids(seeded_client, count=1)
    response = await seeded_client.post(
        "/api/sar/bulk-export", json={"alert_ids": alert_ids}
    )

    zip_buffer = io.BytesIO(response.content)
    with zipfile.ZipFile(zip_buffer, "r") as zf:
        for name in zf.namelist():
            pdf_data = zf.read(name)
            assert pdf_data[:5] == b"%PDF-", f"{name} is not a valid PDF"


@pytest.mark.asyncio
async def test_bulk_export_empty_alert_ids(seeded_client: AsyncClient) -> None:
    """POST with empty alert_ids returns 200 with an empty ZIP."""
    response = await seeded_client.post(
        "/api/sar/bulk-export", json={"alert_ids": []}
    )
    assert response.status_code == 200

    zip_buffer = io.BytesIO(response.content)
    assert zipfile.is_zipfile(zip_buffer)
    with zipfile.ZipFile(zip_buffer, "r") as zf:
        assert len(zf.namelist()) == 0


@pytest.mark.asyncio
async def test_bulk_export_skips_invalid_ids(seeded_client: AsyncClient) -> None:
    """Invalid alert IDs are skipped; valid ones still produce PDFs."""
    alert_ids = await _get_alert_ids(seeded_client, count=1)
    mixed_ids = alert_ids + ["00000000-0000-0000-0000-000000000000"]
    response = await seeded_client.post(
        "/api/sar/bulk-export", json={"alert_ids": mixed_ids}
    )
    assert response.status_code == 200

    zip_buffer = io.BytesIO(response.content)
    with zipfile.ZipFile(zip_buffer, "r") as zf:
        assert len(zf.namelist()) == 1


@pytest.mark.asyncio
async def test_bulk_export_missing_body_returns_422(seeded_client: AsyncClient) -> None:
    """POST without request body returns 422 Unprocessable Entity."""
    response = await seeded_client.post("/api/sar/bulk-export")
    assert response.status_code == 422
