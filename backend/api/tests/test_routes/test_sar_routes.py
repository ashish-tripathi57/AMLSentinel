"""Integration tests for the SAR (Suspicious Activity Report) endpoints.

Test matrix:
  - POST /sar/generate  — requires AI (guarded by requires_api_key)
  - GET  /sar           — no AI; tests standard CRUD (no skip marker)
  - PATCH /sar/{id}     — no AI; tests standard CRUD (no skip marker)
"""

import os

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import api.models  # noqa: F401 — registers all ORM models
from api.core.database import get_async_session
from api.main import create_app
from api.models.base import Base
from api.repositories.investigation import SARDraftRepository
from api.seed.__main__ import seed_all

# ---------------------------------------------------------------------------
# Skip marker — only for tests that call the real Claude API
# ---------------------------------------------------------------------------
requires_api_key = pytest.mark.skipif(
    not os.environ.get("RUN_REAL_API_TESTS"),
    reason="Skipped by default. Set RUN_REAL_API_TESTS=1 to run.",
)


# ---------------------------------------------------------------------------
# Shared fixture
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
        yield c, test_session_factory  # expose factory so tests can seed SAR drafts

    async with seeded_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await seeded_engine.dispose()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _get_first_alert_id(client: AsyncClient) -> str:
    response = await client.get("/api/alerts?limit=1")
    assert response.status_code == 200
    return response.json()["alerts"][0]["id"]


async def _seed_sar_draft(session_factory, alert_id: str) -> str:
    """Directly create a SAR draft in the database; returns its UUID."""
    async with session_factory() as session:
        sar_repo = SARDraftRepository(session)
        draft = await sar_repo.create(
            alert_id=alert_id,
            generated_by="ai",
            subject_info="Test subject info",
            activity_description="Test activity description",
            narrative="Test narrative",
            reason_for_suspicion="Test reason",
            action_taken="Test action",
        )
        return draft.id


# ---------------------------------------------------------------------------
# GET /sar — list SAR drafts (no AI, no skip marker)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_sar_drafts_returns_empty_initially(seeded_client) -> None:
    """GET /sar returns an empty list when no drafts have been generated."""
    client, _ = seeded_client
    alert_id = await _get_first_alert_id(client)
    response = await client.get(f"/api/alerts/{alert_id}/sar")

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_list_sar_drafts_returns_seeded_draft(seeded_client) -> None:
    """GET /sar returns the draft after it has been seeded directly in the DB."""
    client, session_factory = seeded_client
    alert_id = await _get_first_alert_id(client)
    await _seed_sar_draft(session_factory, alert_id)

    response = await client.get(f"/api/alerts/{alert_id}/sar")
    assert response.status_code == 200

    drafts = response.json()
    assert len(drafts) == 1
    assert drafts[0]["alert_id"] == alert_id
    assert drafts[0]["version"] == 1


@pytest.mark.asyncio
async def test_list_sar_drafts_returns_newest_first(seeded_client) -> None:
    """GET /sar orders drafts by version descending (newest first)."""
    client, session_factory = seeded_client
    alert_id = await _get_first_alert_id(client)

    # Seed two drafts; version numbers are auto-incremented.
    await _seed_sar_draft(session_factory, alert_id)
    await _seed_sar_draft(session_factory, alert_id)

    drafts = (await client.get(f"/api/alerts/{alert_id}/sar")).json()
    assert len(drafts) == 2
    assert drafts[0]["version"] > drafts[1]["version"], "Newest version must come first"


@pytest.mark.asyncio
async def test_list_sar_drafts_response_shape(seeded_client) -> None:
    """Each draft in the list includes the required response fields."""
    client, session_factory = seeded_client
    alert_id = await _get_first_alert_id(client)
    await _seed_sar_draft(session_factory, alert_id)

    draft = (await client.get(f"/api/alerts/{alert_id}/sar")).json()[0]

    required_fields = [
        "id", "alert_id", "version", "generated_by", "created_at",
        "subject_info", "activity_description", "narrative",
        "reason_for_suspicion", "action_taken",
    ]
    for field in required_fields:
        assert field in draft, f"Draft response must contain '{field}'"


@pytest.mark.asyncio
async def test_list_sar_drafts_returns_404_for_unknown_alert(seeded_client) -> None:
    """GET /sar returns 404 when the alert does not exist."""
    client, _ = seeded_client
    response = await client.get("/api/alerts/00000000-0000-0000-0000-000000000000/sar")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# PATCH /sar/{draft_id} — manual edit (no AI, no skip marker)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_patch_sar_draft_updates_section(seeded_client) -> None:
    """PATCH /sar/{id} applies partial updates and returns the updated draft."""
    client, session_factory = seeded_client
    alert_id = await _get_first_alert_id(client)
    draft_id = await _seed_sar_draft(session_factory, alert_id)

    response = await client.patch(
        f"/api/alerts/{alert_id}/sar/{draft_id}",
        json={"narrative": "Updated narrative by analyst."},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["narrative"] == "Updated narrative by analyst."
    # Other sections must remain unchanged.
    assert body["subject_info"] == "Test subject info"


@pytest.mark.asyncio
async def test_patch_sar_draft_updates_multiple_sections(seeded_client) -> None:
    """PATCH /sar/{id} can update multiple sections in a single request."""
    client, session_factory = seeded_client
    alert_id = await _get_first_alert_id(client)
    draft_id = await _seed_sar_draft(session_factory, alert_id)

    response = await client.patch(
        f"/api/alerts/{alert_id}/sar/{draft_id}",
        json={
            "narrative": "Revised narrative.",
            "action_taken": "Reported to compliance team.",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["narrative"] == "Revised narrative."
    assert body["action_taken"] == "Reported to compliance team."


@pytest.mark.asyncio
async def test_patch_sar_draft_returns_404_for_unknown_draft(seeded_client) -> None:
    """PATCH /sar/{id} returns 404 when the draft does not exist."""
    client, _ = seeded_client
    alert_id = await _get_first_alert_id(client)

    response = await client.patch(
        f"/api/alerts/{alert_id}/sar/00000000-0000-0000-0000-000000000000",
        json={"narrative": "This should not be saved."},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_patch_sar_draft_returns_404_for_unknown_alert(seeded_client) -> None:
    """PATCH /sar/{id} returns 404 when the parent alert does not exist."""
    client, _ = seeded_client
    response = await client.patch(
        "/api/alerts/00000000-0000-0000-0000-000000000000/sar/any-id",
        json={"narrative": "Should not reach DB."},
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# POST /sar/generate — AI-driven (requires_api_key)
# ---------------------------------------------------------------------------


@requires_api_key
@pytest.mark.asyncio
async def test_generate_sar_returns_201_with_draft(seeded_client) -> None:
    """POST /sar/generate returns HTTP 201 and a SAR draft with all five sections."""
    client, _ = seeded_client
    alert_id = await _get_first_alert_id(client)

    response = await client.post(f"/api/alerts/{alert_id}/sar/generate")
    assert response.status_code in (201, 502), (
        f"Expected 201 or 502, got {response.status_code}: {response.text}"
    )
    if response.status_code == 502:
        pytest.skip("Transient AI service error; skipping SAR content assertion.")

    body = response.json()
    for section in [
        "subject_info", "activity_description", "narrative",
        "reason_for_suspicion", "action_taken",
    ]:
        assert body.get(section), f"Generated SAR must have a non-empty '{section}'"


@requires_api_key
@pytest.mark.asyncio
async def test_generate_sar_version_increments_on_repeat(seeded_client) -> None:
    """POST /sar/generate increments the version number on each call."""
    client, _ = seeded_client
    alert_id = await _get_first_alert_id(client)

    r1 = await client.post(f"/api/alerts/{alert_id}/sar/generate")
    r2 = await client.post(f"/api/alerts/{alert_id}/sar/generate")
    if r1.status_code == 502 or r2.status_code == 502:
        pytest.skip("Transient AI service error; skipping version increment assertion.")

    v1 = r1.json()
    v2 = r2.json()
    assert v2["version"] == v1["version"] + 1


@requires_api_key
@pytest.mark.asyncio
async def test_generate_sar_returns_404_for_unknown_alert(seeded_client) -> None:
    """POST /sar/generate returns 404 when the alert does not exist."""
    client, _ = seeded_client
    response = await client.post(
        "/api/alerts/00000000-0000-0000-0000-000000000000/sar/generate"
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# GET /{alert_id}/str/pdf — FIU-IND STR PDF download
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_download_str_pdf_returns_200(seeded_client) -> None:
    """GET /str/pdf returns 200 with application/pdf for a valid alert."""
    client, _ = seeded_client
    alert_id = await _get_first_alert_id(client)

    response = await client.get(f"/api/alerts/{alert_id}/str/pdf")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content[:5] == b"%PDF-"
    assert "content-disposition" in response.headers


@pytest.mark.asyncio
async def test_download_str_pdf_returns_404_for_unknown_alert(seeded_client) -> None:
    """GET /str/pdf returns 404 when the alert does not exist."""
    client, _ = seeded_client
    response = await client.get(
        "/api/alerts/00000000-0000-0000-0000-000000000000/str/pdf"
    )
    assert response.status_code == 404
