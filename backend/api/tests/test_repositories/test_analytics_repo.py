"""Unit tests for the AnalyticsRepository.

Each test seeds minimal data into an in-memory SQLite database and asserts
that the analytics queries return the correct aggregated results.
"""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.alert import Alert
from api.models.customer import Customer
from api.repositories.analytics import AnalyticsRepository


async def _create_customer(session: AsyncSession) -> Customer:
    """Helper: create a single customer and return it after flushing."""
    customer = Customer(full_name="Analytics Test Customer")
    session.add(customer)
    await session.flush()
    return customer


async def _seed_analytics_alerts(session: AsyncSession) -> list[Alert]:
    """Seed a varied set of alerts suitable for all analytics queries.

    Creates 6 alerts across different typologies, risk scores, statuses,
    resolutions, and dates to exercise every analytics method.
    """
    customer = await _create_customer(session)
    now = datetime.now(timezone.utc)

    alerts_data = [
        {
            "alert_id": "A1",
            "typology": "Structuring",
            "risk_score": 15,
            "status": "New",
            "title": "Low risk structuring",
            "triggered_date": (now - timedelta(days=5)).strftime("%Y-%m-%d"),
        },
        {
            "alert_id": "A2",
            "typology": "Structuring",
            "risk_score": 45,
            "status": "Closed",
            "title": "Medium risk structuring",
            "triggered_date": (now - timedelta(days=10)).strftime("%Y-%m-%d"),
            "resolution": "No Suspicion",
            "closed_at": (now + timedelta(days=5)).isoformat(),
            "created_at": now - timedelta(days=10),
        },
        {
            "alert_id": "A3",
            "typology": "Rapid Fund Movement",
            "risk_score": 75,
            "status": "Closed",
            "title": "High risk rapid movement",
            "triggered_date": (now - timedelta(days=20)).strftime("%Y-%m-%d"),
            "resolution": "SAR Filed",
            "closed_at": (now + timedelta(days=3)).isoformat(),
            "created_at": now - timedelta(days=20),
        },
        {
            "alert_id": "A4",
            "typology": "Unusual Geographic Activity",
            "risk_score": 92,
            "status": "In Progress",
            "title": "Very high risk geographic",
            "triggered_date": (now - timedelta(days=15)).strftime("%Y-%m-%d"),
        },
        {
            "alert_id": "A5",
            "typology": "Structuring",
            "risk_score": 55,
            "status": "Closed",
            "title": "Another structuring",
            "triggered_date": (now - timedelta(days=8)).strftime("%Y-%m-%d"),
            "resolution": "No Suspicion",
            "closed_at": (now + timedelta(days=7)).isoformat(),
            "created_at": now - timedelta(days=8),
        },
        {
            "alert_id": "A6",
            "typology": "Rapid Fund Movement",
            "risk_score": 30,
            "status": "New",
            "title": "Low risk rapid movement",
            "triggered_date": (now - timedelta(days=2)).strftime("%Y-%m-%d"),
        },
    ]

    alerts = []
    for data in alerts_data:
        alert = Alert(customer_id=customer.id, **data)
        session.add(alert)
        alerts.append(alert)
    await session.commit()
    return alerts


# ---------------------------------------------------------------------------
# get_alerts_by_typology
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_alerts_by_typology(db_session: AsyncSession) -> None:
    """Groups alerts by typology and returns correct counts."""
    await _seed_analytics_alerts(db_session)
    repo = AnalyticsRepository(db_session)
    result = await repo.get_alerts_by_typology()

    typology_map = {item["typology"]: item["count"] for item in result}
    assert typology_map["Structuring"] == 3
    assert typology_map["Rapid Fund Movement"] == 2
    assert typology_map["Unusual Geographic Activity"] == 1


@pytest.mark.asyncio
async def test_alerts_by_typology_empty_database(db_session: AsyncSession) -> None:
    """Returns an empty list when no alerts exist."""
    repo = AnalyticsRepository(db_session)
    result = await repo.get_alerts_by_typology()
    assert result == []


# ---------------------------------------------------------------------------
# get_resolution_breakdown
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_resolution_breakdown(db_session: AsyncSession) -> None:
    """Counts closed alerts grouped by resolution value."""
    await _seed_analytics_alerts(db_session)
    repo = AnalyticsRepository(db_session)
    result = await repo.get_resolution_breakdown()

    resolution_map = {item["resolution"]: item["count"] for item in result}
    assert resolution_map["No Suspicion"] == 2
    assert resolution_map["SAR Filed"] == 1


@pytest.mark.asyncio
async def test_resolution_breakdown_no_closed_alerts(db_session: AsyncSession) -> None:
    """Returns empty list when no closed alerts exist."""
    customer = await _create_customer(db_session)
    alert = Alert(
        alert_id="OPEN1",
        customer_id=customer.id,
        typology="Structuring",
        risk_score=50,
        status="New",
        title="Open alert",
        triggered_date="2025-01-20",
    )
    db_session.add(alert)
    await db_session.commit()

    repo = AnalyticsRepository(db_session)
    result = await repo.get_resolution_breakdown()
    assert result == []


# ---------------------------------------------------------------------------
# get_average_investigation_time
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_average_investigation_time(db_session: AsyncSession) -> None:
    """Computes average days between created_at and closed_at for closed alerts."""
    await _seed_analytics_alerts(db_session)
    repo = AnalyticsRepository(db_session)
    result = await repo.get_average_investigation_time()

    assert "average_days" in result
    # All 3 closed alerts have positive investigation times
    assert result["average_days"] > 0.0


@pytest.mark.asyncio
async def test_average_investigation_time_no_closed(db_session: AsyncSession) -> None:
    """Returns 0.0 when no closed alerts exist."""
    customer = await _create_customer(db_session)
    alert = Alert(
        alert_id="OPEN2",
        customer_id=customer.id,
        typology="Structuring",
        risk_score=50,
        status="New",
        title="Open alert",
        triggered_date="2025-01-20",
    )
    db_session.add(alert)
    await db_session.commit()

    repo = AnalyticsRepository(db_session)
    result = await repo.get_average_investigation_time()
    assert result == {"average_days": 0.0}


# ---------------------------------------------------------------------------
# get_risk_score_distribution
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_risk_score_distribution(db_session: AsyncSession) -> None:
    """Buckets alerts into 5 risk ranges and returns all buckets."""
    await _seed_analytics_alerts(db_session)
    repo = AnalyticsRepository(db_session)
    result = await repo.get_risk_score_distribution()

    # Should always return 5 buckets
    assert len(result) == 5
    range_map = {item["range"]: item["count"] for item in result}
    assert range_map["0-20"] == 1   # A1: 15
    assert range_map["21-40"] == 1  # A6: 30
    assert range_map["41-60"] == 2  # A2: 45, A5: 55
    assert range_map["61-80"] == 1  # A3: 75
    assert range_map["81-100"] == 1 # A4: 92


@pytest.mark.asyncio
async def test_risk_score_distribution_empty(db_session: AsyncSession) -> None:
    """Returns all 5 buckets with zero counts when no alerts exist."""
    repo = AnalyticsRepository(db_session)
    result = await repo.get_risk_score_distribution()

    assert len(result) == 5
    for bucket in result:
        assert bucket["count"] == 0


# ---------------------------------------------------------------------------
# get_alert_volume_trend
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_alert_volume_trend(db_session: AsyncSession) -> None:
    """Returns daily alert counts for the requested window."""
    await _seed_analytics_alerts(db_session)
    repo = AnalyticsRepository(db_session)
    result = await repo.get_alert_volume_trend(days=30)

    assert len(result) > 0
    total_from_trend = sum(item["count"] for item in result)
    assert total_from_trend == 6  # All 6 alerts triggered within 30 days

    # Verify date ordering (ascending)
    dates = [item["date"] for item in result]
    assert dates == sorted(dates)


@pytest.mark.asyncio
async def test_alert_volume_trend_narrow_window(db_session: AsyncSession) -> None:
    """A narrow window excludes older alerts."""
    await _seed_analytics_alerts(db_session)
    repo = AnalyticsRepository(db_session)
    result = await repo.get_alert_volume_trend(days=3)

    total = sum(item["count"] for item in result)
    # Only A6 (2 days ago) should be in range
    assert total >= 1


@pytest.mark.asyncio
async def test_alert_volume_trend_empty(db_session: AsyncSession) -> None:
    """Returns empty list when no alerts exist in the window."""
    repo = AnalyticsRepository(db_session)
    result = await repo.get_alert_volume_trend(days=30)
    assert result == []


# ---------------------------------------------------------------------------
# get_false_positive_trend
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_false_positive_trend(db_session: AsyncSession) -> None:
    """Returns weekly false-positive rates for closed alerts."""
    await _seed_analytics_alerts(db_session)
    repo = AnalyticsRepository(db_session)
    result = await repo.get_false_positive_trend(days=90)

    assert len(result) > 0
    for week_data in result:
        assert "week" in week_data
        assert "total_closed" in week_data
        assert "false_positive_count" in week_data
        assert "rate" in week_data
        assert week_data["total_closed"] >= week_data["false_positive_count"]
        if week_data["total_closed"] > 0:
            expected_rate = week_data["false_positive_count"] / week_data["total_closed"]
            assert abs(week_data["rate"] - expected_rate) < 0.01


@pytest.mark.asyncio
async def test_false_positive_trend_empty(db_session: AsyncSession) -> None:
    """Returns empty list when no closed alerts exist in the window."""
    repo = AnalyticsRepository(db_session)
    result = await repo.get_false_positive_trend(days=90)
    assert result == []
