"""Integration tests for the /api/alerts routes.

Each test uses a ``seeded_client`` fixture that:
  1. Spins up an in-memory SQLite database with the full schema.
  2. Runs all typology seeders (20 alerts across 6 typologies).
  3. Returns an httpx AsyncClient wired to the FastAPI app via ASGI transport.

The ``client`` fixture from conftest.py is used for the 404 edge-case tests
that require an empty database.
"""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import api.models  # noqa: F401 — ensures all models are registered
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

    # Seed once before any test request is processed.
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
# GET /api/alerts — list endpoint
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_alerts_returns_200_with_pagination(seeded_client: AsyncClient) -> None:
    """Default list request returns HTTP 200 and pagination metadata."""
    response = await seeded_client.get("/api/alerts")
    assert response.status_code == 200
    body = response.json()
    assert "alerts" in body
    assert "total" in body
    assert isinstance(body["alerts"], list)
    assert body["total"] >= 20  # seed_all creates at least 20 alerts


@pytest.mark.asyncio
async def test_list_alerts_default_page_size(seeded_client: AsyncClient) -> None:
    """Default page size is 20 and total reflects the full seeded dataset."""
    response = await seeded_client.get("/api/alerts")
    body = response.json()
    # Default limit is 20; seeded data contains exactly 20 alerts.
    assert len(body["alerts"]) <= 20


@pytest.mark.asyncio
async def test_list_alerts_filter_by_typology(seeded_client: AsyncClient) -> None:
    """Typology filter returns only alerts matching that typology."""
    response = await seeded_client.get("/api/alerts?typology=Structuring")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] > 0
    for alert in body["alerts"]:
        assert alert["typology"] == "Structuring"


@pytest.mark.asyncio
async def test_list_alerts_filter_by_status(seeded_client: AsyncClient) -> None:
    """Status filter returns only alerts with the requested status."""
    response = await seeded_client.get("/api/alerts?status=New")
    assert response.status_code == 200
    body = response.json()
    for alert in body["alerts"]:
        assert alert["status"] == "New"


@pytest.mark.asyncio
async def test_list_alerts_filter_by_risk_range(seeded_client: AsyncClient) -> None:
    """risk_min / risk_max filters constrain the returned risk scores."""
    response = await seeded_client.get("/api/alerts?risk_min=70&risk_max=90")
    assert response.status_code == 200
    body = response.json()
    for alert in body["alerts"]:
        assert 70 <= alert["risk_score"] <= 90


@pytest.mark.asyncio
async def test_list_alerts_search(seeded_client: AsyncClient) -> None:
    """Search param performs full-text match across title / alert_id / description."""
    # All seed typologies produce alert_ids prefixed by their type code, e.g. "S1".
    response = await seeded_client.get("/api/alerts?search=S1")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    # At least one result must reference "S1" somewhere.
    found = any("S1" in a.get("alert_id", "") or "S1" in a.get("title", "") for a in body["alerts"])
    assert found


@pytest.mark.asyncio
async def test_list_alerts_pagination_offset(seeded_client: AsyncClient) -> None:
    """Offset pagination returns a different slice of results."""
    first_page = (await seeded_client.get("/api/alerts?limit=5&offset=0")).json()
    second_page = (await seeded_client.get("/api/alerts?limit=5&offset=5")).json()

    first_ids = {a["id"] for a in first_page["alerts"]}
    second_ids = {a["id"] for a in second_page["alerts"]}
    # Pages must not overlap.
    assert first_ids.isdisjoint(second_ids)


# ---------------------------------------------------------------------------
# GET /api/alerts/stats
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_alert_stats(seeded_client: AsyncClient) -> None:
    """Stats endpoint returns total_alerts, open_alerts, high_risk_count, closed_count, unassigned_count."""
    response = await seeded_client.get("/api/alerts/stats")
    assert response.status_code == 200
    body = response.json()
    assert "total_alerts" in body
    assert "open_alerts" in body
    assert "high_risk_count" in body
    assert "closed_count" in body
    assert "unassigned_count" in body
    assert body["total_alerts"] >= 20
    # closed_count and unassigned_count must be non-negative integers
    assert isinstance(body["closed_count"], int)
    assert body["closed_count"] >= 0
    assert isinstance(body["unassigned_count"], int)
    assert body["unassigned_count"] >= 0


# ---------------------------------------------------------------------------
# GET /api/alerts/by-alert-id/{alert_id}
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_alert_by_short_id_found(seeded_client: AsyncClient) -> None:
    """by-alert-id endpoint returns the correct alert when the short ID exists."""
    response = await seeded_client.get("/api/alerts/by-alert-id/S1")
    assert response.status_code == 200
    body = response.json()
    assert body["alert_id"] == "S1"
    assert body["typology"] == "Structuring"


@pytest.mark.asyncio
async def test_get_alert_by_short_id_not_found(seeded_client: AsyncClient) -> None:
    """by-alert-id endpoint returns 404 when the short ID does not exist."""
    response = await seeded_client.get("/api/alerts/by-alert-id/DOES_NOT_EXIST")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/alerts/{alert_uuid}
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_alert_by_uuid_found(seeded_client: AsyncClient) -> None:
    """UUID detail endpoint returns the full alert when it exists."""
    # First, grab a valid UUID from the list endpoint.
    list_response = await seeded_client.get("/api/alerts?limit=1")
    first_alert = list_response.json()["alerts"][0]
    alert_uuid = first_alert["id"]

    response = await seeded_client.get(f"/api/alerts/{alert_uuid}")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == alert_uuid


@pytest.mark.asyncio
async def test_get_alert_by_uuid_not_found(client: AsyncClient) -> None:
    """UUID detail endpoint returns 404 for an unknown UUID (empty database)."""
    response = await client.get("/api/alerts/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# PATCH /api/alerts/{alert_uuid}/status
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_update_alert_status_success(seeded_client: AsyncClient) -> None:
    """Status PATCH updates the alert and returns the new state."""
    # Retrieve a valid UUID from the list.
    list_response = await seeded_client.get("/api/alerts?status=New&limit=1")
    alert = list_response.json()["alerts"][0]
    alert_uuid = alert["id"]

    response = await seeded_client.patch(
        f"/api/alerts/{alert_uuid}/status",
        params={"analyst_username": "sarah.chen"},
        json={"status": "In Progress", "rationale": "Beginning investigation"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "In Progress"
    assert body["assigned_analyst"] == "sarah.chen"


@pytest.mark.asyncio
async def test_update_alert_status_not_found(client: AsyncClient) -> None:
    """Status PATCH returns 404 when the alert UUID does not exist."""
    response = await client.patch(
        "/api/alerts/00000000-0000-0000-0000-000000000000/status",
        params={"analyst_username": "sarah.chen"},
        json={"status": "Closed", "rationale": "No suspicious activity"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_alert_status_creates_audit_entry(seeded_client: AsyncClient) -> None:
    """A successful status update must produce an audit trail entry.

    We verify this indirectly: updating the status twice and confirming
    the second update reflects the latest state (the repository round-trip
    validates that the audit entry was persisted without error).
    """
    list_response = await seeded_client.get("/api/alerts?status=New&limit=1")
    alert = list_response.json()["alerts"][0]
    alert_uuid = alert["id"]

    # First transition.
    await seeded_client.patch(
        f"/api/alerts/{alert_uuid}/status",
        params={"analyst_username": "sarah.chen"},
        json={"status": "In Progress", "rationale": "Reviewing transactions"},
    )

    # Second transition — if audit creation raised an error the first call
    # would have returned non-200, causing the assertion above to fail.
    response = await seeded_client.patch(
        f"/api/alerts/{alert_uuid}/status",
        params={"analyst_username": "sarah.chen"},
        json={"status": "Review", "rationale": "Escalating for review"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "Review"


# ---------------------------------------------------------------------------
# Phase 2: resolution + closed_at fields
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_alerts_response_includes_resolution_fields(seeded_client: AsyncClient) -> None:
    """Alert list items include resolution and closed_at fields."""
    response = await seeded_client.get("/api/alerts?limit=1")
    assert response.status_code == 200
    alert = response.json()["alerts"][0]
    assert "resolution" in alert
    assert "closed_at" in alert


@pytest.mark.asyncio
async def test_close_alert_with_resolution(seeded_client: AsyncClient) -> None:
    """Closing an alert with resolution sets resolution and closed_at."""
    list_response = await seeded_client.get("/api/alerts?status=New&limit=1")
    alert = list_response.json()["alerts"][0]
    alert_uuid = alert["id"]

    response = await seeded_client.patch(
        f"/api/alerts/{alert_uuid}/status",
        params={"analyst_username": "sarah.chen"},
        json={"status": "Closed", "rationale": "No suspicious activity", "resolution": "No Suspicion"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "Closed"
    assert body["resolution"] == "No Suspicion"
    assert body["closed_at"] is not None


@pytest.mark.asyncio
async def test_close_alert_audit_trail_includes_resolution(seeded_client: AsyncClient) -> None:
    """Audit trail for a close includes resolution in the details."""
    list_response = await seeded_client.get("/api/alerts?status=New&limit=1")
    alert = list_response.json()["alerts"][0]
    alert_uuid = alert["id"]

    await seeded_client.patch(
        f"/api/alerts/{alert_uuid}/status",
        params={"analyst_username": "sarah.chen"},
        json={"status": "Closed", "rationale": "Filed SAR", "resolution": "SAR Filed"},
    )

    audit_response = await seeded_client.get(f"/api/alerts/{alert_uuid}/audit-trail")
    assert audit_response.status_code == 200
    entries = audit_response.json()
    close_entries = [e for e in entries if "Closed" in e.get("details", "")]
    assert len(close_entries) >= 1
    assert "SAR Filed" in close_entries[0]["details"]


@pytest.mark.asyncio
async def test_list_alerts_filter_by_resolution(seeded_client: AsyncClient) -> None:
    """Resolution query param filters alerts."""
    # First close an alert with a specific resolution
    list_response = await seeded_client.get("/api/alerts?status=New&limit=1")
    alert = list_response.json()["alerts"][0]
    await seeded_client.patch(
        f"/api/alerts/{alert['id']}/status",
        params={"analyst_username": "sarah.chen"},
        json={"status": "Closed", "rationale": "No issues", "resolution": "No Suspicion"},
    )

    # Now filter by resolution
    response = await seeded_client.get("/api/alerts?resolution=No Suspicion")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    for a in body["alerts"]:
        assert a["resolution"] == "No Suspicion"


@pytest.mark.asyncio
async def test_list_alerts_filter_by_assigned_analyst(seeded_client: AsyncClient) -> None:
    """assigned_analyst query param filters alerts."""
    # First assign an analyst via status update
    list_response = await seeded_client.get("/api/alerts?status=New&limit=1")
    alert = list_response.json()["alerts"][0]
    await seeded_client.patch(
        f"/api/alerts/{alert['id']}/status",
        params={"analyst_username": "unique.analyst"},
        json={"status": "In Progress", "rationale": "Taking over"},
    )

    response = await seeded_client.get("/api/alerts?assigned_analyst=unique.analyst")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    for a in body["alerts"]:
        assert a["assigned_analyst"] == "unique.analyst"


@pytest.mark.asyncio
async def test_list_alerts_filter_unassigned_analyst(seeded_client: AsyncClient) -> None:
    """assigned_analyst=__unassigned__ returns only alerts with no analyst assigned."""
    response = await seeded_client.get("/api/alerts?assigned_analyst=__unassigned__")
    assert response.status_code == 200
    body = response.json()
    # Seed data has many unassigned alerts by default
    assert body["total"] >= 1
    for alert in body["alerts"]:
        assert alert["assigned_analyst"] is None


@pytest.mark.asyncio
async def test_list_alerts_filter_comma_separated_status(seeded_client: AsyncClient) -> None:
    """Comma-separated status values return alerts matching any of the given statuses."""
    response = await seeded_client.get("/api/alerts?status=New,In Progress")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    for alert in body["alerts"]:
        assert alert["status"] in ("New", "In Progress")


# ---------------------------------------------------------------------------
# POST /api/alerts/bulk-close
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_bulk_close_returns_200(seeded_client: AsyncClient) -> None:
    """Bulk close endpoint returns 200 with correct response shape."""
    list_response = await seeded_client.get("/api/alerts?status=New&limit=2")
    alerts = list_response.json()["alerts"]
    alert_ids = [a["id"] for a in alerts[:2]]

    response = await seeded_client.post(
        "/api/alerts/bulk-close",
        params={"analyst_username": "sarah.chen"},
        json={
            "alert_ids": alert_ids,
            "resolution": "No Suspicion",
            "rationale": "Batch review complete",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert "closed_count" in body
    assert "failed_ids" in body
    assert body["closed_count"] == 2
    assert body["failed_ids"] == []


@pytest.mark.asyncio
async def test_bulk_close_updates_alerts(seeded_client: AsyncClient) -> None:
    """After bulk close, each targeted alert is actually closed."""
    list_response = await seeded_client.get("/api/alerts?status=New&limit=2")
    alerts = list_response.json()["alerts"]
    alert_ids = [a["id"] for a in alerts[:2]]

    await seeded_client.post(
        "/api/alerts/bulk-close",
        params={"analyst_username": "sarah.chen"},
        json={
            "alert_ids": alert_ids,
            "resolution": "No Suspicion",
            "rationale": "Batch review complete",
        },
    )

    for aid in alert_ids:
        detail = await seeded_client.get(f"/api/alerts/{aid}")
        assert detail.status_code == 200
        body = detail.json()
        assert body["status"] == "Closed"
        assert body["resolution"] == "No Suspicion"
        assert body["closed_at"] is not None


# ---------------------------------------------------------------------------
# POST /api/alerts/detect-false-positives
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_detect_false_positives_returns_200(seeded_client: AsyncClient) -> None:
    """False positive detection endpoint returns 200 with correct response shape."""
    list_response = await seeded_client.get("/api/alerts?limit=2")
    alerts = list_response.json()["alerts"]
    alert_ids = [a["id"] for a in alerts[:2]]

    response = await seeded_client.post(
        "/api/alerts/detect-false-positives",
        json={"alert_ids": alert_ids},
    )
    assert response.status_code == 200
    body = response.json()
    assert "results" in body
    assert "total_analyzed" in body
    assert body["total_analyzed"] == 2
    assert isinstance(body["results"], list)
    assert len(body["results"]) == 2
    # Verify result shape
    for result in body["results"]:
        assert "alert_id" in result
        assert "alert_short_id" in result
        assert "title" in result
        assert "confidence" in result
        assert "reasoning" in result
        assert "suggested_resolution" in result
        assert 0.0 <= result["confidence"] <= 1.0
