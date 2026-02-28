import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.alert import Alert
from api.models.customer import Customer
from api.repositories.alert import AlertRepository


async def _seed_alerts(db_session: AsyncSession) -> list[Alert]:
    """Helper: create a customer and multiple alerts for testing."""
    customer = Customer(full_name="Test Customer")
    db_session.add(customer)
    await db_session.flush()

    alerts = []
    test_data = [
        ("S1", "Structuring", 85, "New", "Structuring alert 1"),
        ("S2", "Structuring", 72, "In Progress", "Structuring alert 2"),
        ("G1", "Unusual Geographic Activity", 60, "New", "Geographic alert"),
        ("R1", "Rapid Fund Movement", 90, "Review", "Rapid movement alert"),
    ]
    for alert_id, typology, risk, status, title in test_data:
        alert = Alert(
            alert_id=alert_id,
            customer_id=customer.id,
            typology=typology,
            risk_score=risk,
            status=status,
            title=title,
            triggered_date="2025-01-20",
        )
        db_session.add(alert)
        alerts.append(alert)
    await db_session.commit()
    return alerts


@pytest.mark.asyncio
async def test_get_all_no_filters(db_session: AsyncSession):
    await _seed_alerts(db_session)
    repo = AlertRepository(db_session)
    alerts, total = await repo.get_all()
    assert total == 4
    assert len(alerts) == 4


@pytest.mark.asyncio
async def test_get_all_filter_typology(db_session: AsyncSession):
    await _seed_alerts(db_session)
    repo = AlertRepository(db_session)
    alerts, total = await repo.get_all(typology="Structuring")
    assert total == 2
    assert all(a.typology == "Structuring" for a in alerts)


@pytest.mark.asyncio
async def test_get_all_filter_status(db_session: AsyncSession):
    await _seed_alerts(db_session)
    repo = AlertRepository(db_session)
    alerts, total = await repo.get_all(status="New")
    assert total == 2


@pytest.mark.asyncio
async def test_get_all_filter_risk_range(db_session: AsyncSession):
    await _seed_alerts(db_session)
    repo = AlertRepository(db_session)
    alerts, total = await repo.get_all(risk_min=80)
    assert total == 2
    assert all(a.risk_score >= 80 for a in alerts)


@pytest.mark.asyncio
async def test_get_all_search(db_session: AsyncSession):
    await _seed_alerts(db_session)
    repo = AlertRepository(db_session)
    alerts, total = await repo.get_all(search="Geographic")
    assert total == 1
    assert alerts[0].alert_id == "G1"


@pytest.mark.asyncio
async def test_get_all_pagination(db_session: AsyncSession):
    await _seed_alerts(db_session)
    repo = AlertRepository(db_session)
    alerts, total = await repo.get_all(limit=2, offset=0)
    assert total == 4
    assert len(alerts) == 2


@pytest.mark.asyncio
async def test_get_by_id(db_session: AsyncSession):
    seeded = await _seed_alerts(db_session)
    repo = AlertRepository(db_session)
    alert = await repo.get_by_id(seeded[0].id)
    assert alert is not None
    assert alert.alert_id == "S1"


@pytest.mark.asyncio
async def test_get_by_id_not_found(db_session: AsyncSession):
    repo = AlertRepository(db_session)
    alert = await repo.get_by_id("nonexistent-uuid")
    assert alert is None


@pytest.mark.asyncio
async def test_get_by_alert_id(db_session: AsyncSession):
    await _seed_alerts(db_session)
    repo = AlertRepository(db_session)
    alert = await repo.get_by_alert_id("G1")
    assert alert is not None
    assert alert.typology == "Unusual Geographic Activity"


@pytest.mark.asyncio
async def test_update_status(db_session: AsyncSession):
    seeded = await _seed_alerts(db_session)
    repo = AlertRepository(db_session)
    updated = await repo.update_status(seeded[0].id, "In Progress", "sarah.chen")
    assert updated.status == "In Progress"
    assert updated.assigned_analyst == "sarah.chen"


@pytest.mark.asyncio
async def test_get_all_filter_risk_max(db_session: AsyncSession):
    await _seed_alerts(db_session)
    repo = AlertRepository(db_session)
    alerts, total = await repo.get_all(risk_max=75)
    assert total == 2  # S2=72, G1=60
    assert all(a.risk_score <= 75 for a in alerts)


@pytest.mark.asyncio
async def test_get_all_sort_asc(db_session: AsyncSession):
    await _seed_alerts(db_session)
    repo = AlertRepository(db_session)
    alerts, total = await repo.get_all(sort_by="risk_score", sort_order="asc")
    assert total == 4
    scores = [a.risk_score for a in alerts]
    assert scores == sorted(scores)


@pytest.mark.asyncio
async def test_get_stats(db_session: AsyncSession):
    await _seed_alerts(db_session)
    repo = AlertRepository(db_session)
    stats = await repo.get_stats()
    assert stats["total_alerts"] == 4
    # open_alerts counts New, In Progress, Review, Escalated
    assert stats["open_alerts"] == 4  # S1=New, S2=In Progress, G1=New, R1=Review
    assert stats["high_risk_count"] == 3  # S1=85, S2=72, R1=90 (all >= 70)
    assert stats["closed_count"] == 0  # no alerts are Closed in seed data
    assert stats["unassigned_count"] == 4  # all open alerts have no assigned_analyst


@pytest.mark.asyncio
async def test_update_status_with_resolution_on_close(db_session: AsyncSession):
    """Closing an alert sets resolution and closed_at."""
    seeded = await _seed_alerts(db_session)
    repo = AlertRepository(db_session)
    updated = await repo.update_status(
        seeded[0].id, "Closed", "sarah.chen", resolution="No Suspicion"
    )
    assert updated.status == "Closed"
    assert updated.resolution == "No Suspicion"
    assert updated.closed_at is not None


@pytest.mark.asyncio
async def test_update_status_without_resolution_no_closed_at(db_session: AsyncSession):
    """Non-close status transition does not set resolution or closed_at."""
    seeded = await _seed_alerts(db_session)
    repo = AlertRepository(db_session)
    updated = await repo.update_status(seeded[0].id, "In Progress", "sarah.chen")
    assert updated.status == "In Progress"
    assert updated.resolution is None
    assert updated.closed_at is None


@pytest.mark.asyncio
async def test_get_all_filter_resolution(db_session: AsyncSession):
    """Resolution filter returns only alerts with matching resolution."""
    customer = Customer(full_name="Resolution Test Customer")
    db_session.add(customer)
    await db_session.flush()

    alert1 = Alert(
        alert_id="CL1", customer_id=customer.id, typology="Structuring",
        risk_score=80, status="Closed", title="Closed alert 1",
        triggered_date="2025-01-20", resolution="No Suspicion",
        closed_at="2025-02-01T12:00:00Z",
    )
    alert2 = Alert(
        alert_id="CL2", customer_id=customer.id, typology="Structuring",
        risk_score=70, status="Closed", title="Closed alert 2",
        triggered_date="2025-01-21", resolution="SAR Filed",
        closed_at="2025-02-02T12:00:00Z",
    )
    alert3 = Alert(
        alert_id="OP1", customer_id=customer.id, typology="Structuring",
        risk_score=60, status="New", title="Open alert",
        triggered_date="2025-01-22",
    )
    db_session.add_all([alert1, alert2, alert3])
    await db_session.commit()

    repo = AlertRepository(db_session)
    alerts, total = await repo.get_all(resolution="No Suspicion")
    assert total == 1
    assert alerts[0].alert_id == "CL1"


@pytest.mark.asyncio
async def test_get_all_filter_assigned_analyst(db_session: AsyncSession):
    """assigned_analyst filter returns only matching alerts."""
    customer = Customer(full_name="Analyst Test Customer")
    db_session.add(customer)
    await db_session.flush()

    alert1 = Alert(
        alert_id="AN1", customer_id=customer.id, typology="Structuring",
        risk_score=80, status="In Progress", title="Analyst alert 1",
        triggered_date="2025-01-20", assigned_analyst="sarah.chen",
    )
    alert2 = Alert(
        alert_id="AN2", customer_id=customer.id, typology="Structuring",
        risk_score=70, status="New", title="Analyst alert 2",
        triggered_date="2025-01-21",
    )
    db_session.add_all([alert1, alert2])
    await db_session.commit()

    repo = AlertRepository(db_session)
    alerts, total = await repo.get_all(assigned_analyst="sarah.chen")
    assert total == 1
    assert alerts[0].alert_id == "AN1"


# ---------------------------------------------------------------------------
# bulk_update_status
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_bulk_update_status_closes_multiple(db_session: AsyncSession):
    """Bulk close 2 out of 3 alerts; verify only the targeted alerts are closed."""
    seeded = await _seed_alerts(db_session)
    repo = AlertRepository(db_session)

    target_ids = [seeded[0].id, seeded[1].id]
    closed_count, failed_ids = await repo.bulk_update_status(
        alert_ids=target_ids,
        status="Closed",
        analyst="sarah.chen",
        resolution="No Suspicion",
    )
    assert closed_count == 2
    assert failed_ids == []

    # Verify the targeted alerts are closed
    closed_alert_1 = await repo.get_by_id(seeded[0].id)
    assert closed_alert_1.status == "Closed"
    assert closed_alert_1.resolution == "No Suspicion"
    assert closed_alert_1.closed_at is not None

    closed_alert_2 = await repo.get_by_id(seeded[1].id)
    assert closed_alert_2.status == "Closed"

    # Verify the non-targeted alert is unchanged
    untouched_alert = await repo.get_by_id(seeded[2].id)
    assert untouched_alert.status == "New"


@pytest.mark.asyncio
async def test_bulk_update_status_returns_failed_for_invalid_ids(db_session: AsyncSession):
    """Pass an invalid UUID; verify it appears in the failed_ids list."""
    seeded = await _seed_alerts(db_session)
    repo = AlertRepository(db_session)

    invalid_id = "nonexistent-uuid-00000"
    closed_count, failed_ids = await repo.bulk_update_status(
        alert_ids=[seeded[0].id, invalid_id],
        status="Closed",
        analyst="sarah.chen",
        resolution="No Suspicion",
    )
    assert closed_count == 1
    assert failed_ids == [invalid_id]


# ---------------------------------------------------------------------------
# get_stats — closed_count and unassigned_count
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_stats_closed_and_unassigned_counts(db_session: AsyncSession):
    """Stats include closed_count and unassigned_count with mixed alert states."""
    customer = Customer(full_name="Stats Test Customer")
    db_session.add(customer)
    await db_session.flush()

    alerts_data = [
        ("ST1", 80, "New", None),
        ("ST2", 70, "In Progress", "sarah.chen"),
        ("ST3", 60, "Review", None),
        ("ST4", 90, "Closed", "sarah.chen"),
        ("ST5", 55, "Escalated", None),
        ("ST6", 75, "Closed", "sarah.chen"),
    ]
    for alert_id, risk, status, analyst in alerts_data:
        alert = Alert(
            alert_id=alert_id,
            customer_id=customer.id,
            typology="Structuring",
            risk_score=risk,
            status=status,
            title=f"Stats test alert {alert_id}",
            triggered_date="2025-01-20",
            assigned_analyst=analyst,
        )
        db_session.add(alert)
    await db_session.commit()

    repo = AlertRepository(db_session)
    stats = await repo.get_stats()
    assert stats["total_alerts"] == 6
    # Open statuses: New, In Progress, Review, Escalated → ST1, ST2, ST3, ST5
    assert stats["open_alerts"] == 4
    assert stats["closed_count"] == 2  # ST4, ST6
    # Unassigned among open: ST1(New, None), ST3(Review, None), ST5(Escalated, None)
    assert stats["unassigned_count"] == 3
    assert stats["high_risk_count"] == 4  # ST1=80, ST2=70, ST4=90, ST6=75 (all >= 70)


# ---------------------------------------------------------------------------
# get_all — __unassigned__ filter
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_all_filter_unassigned_analyst(db_session: AsyncSession):
    """assigned_analyst='__unassigned__' returns only alerts with NULL assigned_analyst."""
    customer = Customer(full_name="Unassigned Filter Customer")
    db_session.add(customer)
    await db_session.flush()

    alert_assigned = Alert(
        alert_id="UA1",
        customer_id=customer.id,
        typology="Structuring",
        risk_score=80,
        status="In Progress",
        title="Assigned alert",
        triggered_date="2025-01-20",
        assigned_analyst="sarah.chen",
    )
    alert_unassigned_1 = Alert(
        alert_id="UA2",
        customer_id=customer.id,
        typology="Structuring",
        risk_score=70,
        status="New",
        title="Unassigned alert 1",
        triggered_date="2025-01-21",
        assigned_analyst=None,
    )
    alert_unassigned_2 = Alert(
        alert_id="UA3",
        customer_id=customer.id,
        typology="Structuring",
        risk_score=60,
        status="New",
        title="Unassigned alert 2",
        triggered_date="2025-01-22",
        assigned_analyst=None,
    )
    db_session.add_all([alert_assigned, alert_unassigned_1, alert_unassigned_2])
    await db_session.commit()

    repo = AlertRepository(db_session)
    alerts, total = await repo.get_all(assigned_analyst="__unassigned__")
    assert total == 2
    assert all(a.assigned_analyst is None for a in alerts)
    returned_ids = {a.alert_id for a in alerts}
    assert returned_ids == {"UA2", "UA3"}


# ---------------------------------------------------------------------------
# get_all — comma-separated status filter
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_all_filter_comma_separated_status(db_session: AsyncSession):
    """Comma-separated status values filter with an IN clause."""
    customer = Customer(full_name="Multi-Status Filter Customer")
    db_session.add(customer)
    await db_session.flush()

    statuses_data = [
        ("MS1", "New"),
        ("MS2", "In Progress"),
        ("MS3", "Review"),
        ("MS4", "Closed"),
        ("MS5", "Escalated"),
    ]
    for alert_id, status in statuses_data:
        alert = Alert(
            alert_id=alert_id,
            customer_id=customer.id,
            typology="Structuring",
            risk_score=75,
            status=status,
            title=f"Multi-status alert {alert_id}",
            triggered_date="2025-01-20",
        )
        db_session.add(alert)
    await db_session.commit()

    repo = AlertRepository(db_session)

    # Filter for two statuses
    alerts, total = await repo.get_all(status="New,In Progress")
    assert total == 2
    returned_statuses = {a.status for a in alerts}
    assert returned_statuses == {"New", "In Progress"}

    # Filter for three statuses
    alerts, total = await repo.get_all(status="New,Review,Escalated")
    assert total == 3
    returned_statuses = {a.status for a in alerts}
    assert returned_statuses == {"New", "Review", "Escalated"}
