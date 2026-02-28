"""Unit tests for the bulk SAR ZIP export service.

Verifies that generate_bulk_sar_zip produces a valid in-memory ZIP
archive containing one STR PDF per alert ID.
"""

import zipfile
import io

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import api.models  # noqa: F401 -- ensures all models are registered
from api.models.base import Base
from api.seed.__main__ import seed_all
from api.services.bulk_export import generate_bulk_sar_zip


TEST_DATABASE_URL = "sqlite+aiosqlite://"


# ---------------------------------------------------------------------------
# Fixture: seeded database session
# ---------------------------------------------------------------------------


@pytest.fixture()
async def seeded_session():
    """Provide an async session backed by a fully seeded in-memory database."""
    seeded_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with seeded_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    test_session_factory = async_sessionmaker(
        seeded_engine, class_=AsyncSession, expire_on_commit=False
    )

    async with test_session_factory() as seed_session:
        await seed_all(seed_session)
        await seed_session.commit()

    async with test_session_factory() as session:
        yield session

    async with seeded_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await seeded_engine.dispose()


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


async def _get_alert_ids(session: AsyncSession, count: int = 2) -> list[str]:
    """Fetch the first N alert IDs from the seeded database."""
    from api.repositories.alert import AlertRepository
    repo = AlertRepository(session)
    alerts, _total = await repo.get_all(limit=count, offset=0)
    return [a.id for a in alerts]


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_bulk_export_returns_bytes(seeded_session: AsyncSession) -> None:
    """generate_bulk_sar_zip returns bytes."""
    alert_ids = await _get_alert_ids(seeded_session, count=1)
    result = await generate_bulk_sar_zip(alert_ids, seeded_session)
    assert isinstance(result, bytes)


@pytest.mark.asyncio
async def test_bulk_export_is_valid_zip(seeded_session: AsyncSession) -> None:
    """The returned bytes form a valid ZIP archive."""
    alert_ids = await _get_alert_ids(seeded_session, count=1)
    result = await generate_bulk_sar_zip(alert_ids, seeded_session)
    zip_buffer = io.BytesIO(result)
    assert zipfile.is_zipfile(zip_buffer)


@pytest.mark.asyncio
async def test_bulk_export_contains_expected_pdfs(seeded_session: AsyncSession) -> None:
    """ZIP contains one PDF file per alert ID."""
    alert_ids = await _get_alert_ids(seeded_session, count=2)
    result = await generate_bulk_sar_zip(alert_ids, seeded_session)

    zip_buffer = io.BytesIO(result)
    with zipfile.ZipFile(zip_buffer, "r") as zf:
        filenames = zf.namelist()
        assert len(filenames) == len(alert_ids)
        for name in filenames:
            assert name.endswith(".pdf")


@pytest.mark.asyncio
async def test_bulk_export_pdf_filenames_include_alert_id(seeded_session: AsyncSession) -> None:
    """Each PDF filename contains the corresponding alert ID."""
    alert_ids = await _get_alert_ids(seeded_session, count=2)
    result = await generate_bulk_sar_zip(alert_ids, seeded_session)

    zip_buffer = io.BytesIO(result)
    with zipfile.ZipFile(zip_buffer, "r") as zf:
        filenames = zf.namelist()
        for alert_id in alert_ids:
            matching = [f for f in filenames if alert_id in f]
            assert len(matching) == 1, f"Expected PDF for alert {alert_id}"


@pytest.mark.asyncio
async def test_bulk_export_pdfs_are_valid(seeded_session: AsyncSession) -> None:
    """Each file inside the ZIP starts with the PDF magic bytes."""
    alert_ids = await _get_alert_ids(seeded_session, count=2)
    result = await generate_bulk_sar_zip(alert_ids, seeded_session)

    zip_buffer = io.BytesIO(result)
    with zipfile.ZipFile(zip_buffer, "r") as zf:
        for name in zf.namelist():
            pdf_data = zf.read(name)
            assert pdf_data[:5] == b"%PDF-", f"{name} does not start with PDF header"


@pytest.mark.asyncio
async def test_bulk_export_empty_list(seeded_session: AsyncSession) -> None:
    """An empty alert_ids list produces a valid but empty ZIP."""
    result = await generate_bulk_sar_zip([], seeded_session)
    zip_buffer = io.BytesIO(result)
    assert zipfile.is_zipfile(zip_buffer)
    with zipfile.ZipFile(zip_buffer, "r") as zf:
        assert len(zf.namelist()) == 0


@pytest.mark.asyncio
async def test_bulk_export_skips_invalid_alert_id(seeded_session: AsyncSession) -> None:
    """Invalid alert IDs are skipped without raising an error."""
    alert_ids = await _get_alert_ids(seeded_session, count=1)
    mixed_ids = alert_ids + ["00000000-0000-0000-0000-000000000000"]
    result = await generate_bulk_sar_zip(mixed_ids, seeded_session)

    zip_buffer = io.BytesIO(result)
    with zipfile.ZipFile(zip_buffer, "r") as zf:
        # Only the valid alert should be in the ZIP
        assert len(zf.namelist()) == 1
