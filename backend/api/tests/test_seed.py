"""Validation tests for the database seeding pipeline.

Runs the full seeding pipeline against an in-memory SQLite database and
verifies that all 20 alerts, expected customers, accounts, transactions,
and checklist items are created correctly across the 6 typologies.
"""

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.account import Account
from api.models.alert import Alert, alert_transactions
from api.models.customer import Customer
from api.models.investigation import ChecklistItem
from api.models.transaction import Transaction
from api.seed.__main__ import TYPOLOGY_SEEDERS, seed_all
from api.seed.data_spec import (
    ALL_TYPOLOGIES,
    CHECKLIST_TEMPLATES,
    TYPOLOGY_GEOGRAPHIC,
    TYPOLOGY_LARGE_CASH,
    TYPOLOGY_RAPID_MOVEMENT,
    TYPOLOGY_ROUND_TRIP,
    TYPOLOGY_STRUCTURING,
    TYPOLOGY_SUDDEN_ACTIVITY,
)
from api.seed.geographic import seed_geographic
from api.seed.large_cash import seed_large_cash
from api.seed.rapid_movement import seed_rapid_movement
from api.seed.round_trip import seed_round_trip
from api.seed.structuring import seed_structuring
from api.seed.sudden_activity import seed_sudden_activity


async def _run_all_seeders(session: AsyncSession) -> None:
    """Execute all typology seeders via the seed_all orchestrator, then commit."""
    count = await seed_all(session)
    assert count == len(TYPOLOGY_SEEDERS)
    await session.commit()


@pytest.mark.asyncio
async def test_seed_creates_20_alerts(db_session: AsyncSession):
    await _run_all_seeders(db_session)
    result = await db_session.execute(select(func.count(Alert.id)))
    assert result.scalar() == 20


@pytest.mark.asyncio
async def test_seed_alert_ids_are_unique(db_session: AsyncSession):
    await _run_all_seeders(db_session)
    result = await db_session.execute(select(Alert.alert_id))
    alert_ids = [row[0] for row in result.all()]
    assert len(alert_ids) == len(set(alert_ids)), "Duplicate alert_id values found"


@pytest.mark.asyncio
async def test_seed_expected_alert_ids(db_session: AsyncSession):
    await _run_all_seeders(db_session)
    result = await db_session.execute(select(Alert.alert_id))
    alert_ids = sorted([row[0] for row in result.all()])
    expected = sorted([
        "S1", "S2", "S3", "S4", "S5",
        "G1", "G2", "G3",
        "R1", "R2", "R3",
        "RT1", "RT2", "RT3",
        "SA1", "SA2", "SA3",
        "LC1", "LC2", "LC3",
    ])
    assert alert_ids == expected


@pytest.mark.asyncio
async def test_seed_typology_distribution(db_session: AsyncSession):
    await _run_all_seeders(db_session)
    expected_counts = {
        TYPOLOGY_STRUCTURING: 5,
        TYPOLOGY_GEOGRAPHIC: 3,
        TYPOLOGY_RAPID_MOVEMENT: 3,
        TYPOLOGY_ROUND_TRIP: 3,
        TYPOLOGY_SUDDEN_ACTIVITY: 3,
        TYPOLOGY_LARGE_CASH: 3,
    }
    for typology, expected_count in expected_counts.items():
        result = await db_session.execute(
            select(func.count(Alert.id)).where(Alert.typology == typology)
        )
        actual = result.scalar()
        assert actual == expected_count, (
            f"Expected {expected_count} alerts for {typology}, got {actual}"
        )


@pytest.mark.asyncio
async def test_seed_creates_customers(db_session: AsyncSession):
    """Each alert should have a distinct customer (20 total)."""
    await _run_all_seeders(db_session)
    result = await db_session.execute(select(func.count(Customer.id)))
    assert result.scalar() == 20


@pytest.mark.asyncio
async def test_seed_creates_accounts(db_session: AsyncSession):
    """At least one account per customer, some have multiple."""
    await _run_all_seeders(db_session)
    result = await db_session.execute(select(func.count(Account.id)))
    count = result.scalar()
    # 20 customers, some with 2 accounts (G2: Arjun Reddy, G3: Kavita Nair)
    assert count >= 20


@pytest.mark.asyncio
async def test_seed_creates_transactions(db_session: AsyncSession):
    """All alerts should have associated transactions."""
    await _run_all_seeders(db_session)
    result = await db_session.execute(select(func.count(Transaction.id)))
    count = result.scalar()
    # 20 alerts with multiple transactions each — should be well over 100
    assert count > 100


@pytest.mark.asyncio
async def test_seed_all_alerts_have_flagged_transactions(db_session: AsyncSession):
    """Every alert must have at least one flagged transaction linked."""
    await _run_all_seeders(db_session)
    result = await db_session.execute(select(Alert.id))
    alert_ids = [row[0] for row in result.all()]
    for alert_id in alert_ids:
        junction_result = await db_session.execute(
            select(func.count(alert_transactions.c.transaction_id)).where(
                alert_transactions.c.alert_id == alert_id
            )
        )
        linked_count = junction_result.scalar()
        assert linked_count > 0, f"Alert {alert_id} has no linked flagged transactions"


@pytest.mark.asyncio
async def test_seed_all_alerts_have_checklist_items(db_session: AsyncSession):
    """Every alert must have checklist items from its typology template."""
    await _run_all_seeders(db_session)
    result = await db_session.execute(select(Alert))
    alerts = result.scalars().all()
    for alert in alerts:
        checklist_result = await db_session.execute(
            select(func.count(ChecklistItem.id)).where(
                ChecklistItem.alert_id == alert.id
            )
        )
        checklist_count = checklist_result.scalar()
        expected_count = len(CHECKLIST_TEMPLATES.get(alert.typology, []))
        assert checklist_count == expected_count, (
            f"Alert {alert.alert_id} ({alert.typology}): "
            f"expected {expected_count} checklist items, got {checklist_count}"
        )


@pytest.mark.asyncio
async def test_seed_all_typologies_covered(db_session: AsyncSession):
    """Every defined typology must appear in the seeded alerts."""
    await _run_all_seeders(db_session)
    result = await db_session.execute(select(Alert.typology).distinct())
    seeded_typologies = sorted([row[0] for row in result.all()])
    assert seeded_typologies == sorted(ALL_TYPOLOGIES)


@pytest.mark.asyncio
async def test_seed_all_alerts_have_risk_scores(db_session: AsyncSession):
    """Every alert must have a risk score between 0 and 100."""
    await _run_all_seeders(db_session)
    result = await db_session.execute(select(Alert))
    alerts = result.scalars().all()
    for alert in alerts:
        assert 0 <= alert.risk_score <= 100, (
            f"Alert {alert.alert_id} has invalid risk_score: {alert.risk_score}"
        )


VALID_ALERT_STATUSES = {"New", "In Progress", "Review", "Escalated", "Closed"}

# Alerts seeded with Closed status and a resolution
CLOSED_ALERT_IDS = {"S5", "LC3", "G3"}


@pytest.mark.asyncio
async def test_seed_all_alerts_have_valid_status(db_session: AsyncSession):
    """All seeded alerts should have a valid status."""
    await _run_all_seeders(db_session)
    result = await db_session.execute(select(Alert))
    alerts = result.scalars().all()
    for alert in alerts:
        assert alert.status in VALID_ALERT_STATUSES, (
            f"Alert {alert.alert_id} has invalid status '{alert.status}'"
        )


@pytest.mark.asyncio
async def test_seed_closed_alerts_have_resolution(db_session: AsyncSession):
    """Alerts seeded as Closed should have a resolution and closed_at."""
    await _run_all_seeders(db_session)
    result = await db_session.execute(
        select(Alert).where(Alert.alert_id.in_(CLOSED_ALERT_IDS))
    )
    alerts = result.scalars().all()
    assert len(alerts) == len(CLOSED_ALERT_IDS)
    for alert in alerts:
        assert alert.status == "Closed", f"{alert.alert_id} should be Closed"
        assert alert.resolution is not None, f"{alert.alert_id} missing resolution"
        assert alert.closed_at is not None, f"{alert.alert_id} missing closed_at"


@pytest.mark.asyncio
async def test_seed_structuring_has_5_alerts(db_session: AsyncSession):
    await seed_structuring(db_session)
    await db_session.commit()
    result = await db_session.execute(
        select(func.count(Alert.id)).where(Alert.typology == TYPOLOGY_STRUCTURING)
    )
    assert result.scalar() == 5


@pytest.mark.asyncio
async def test_seed_geographic_has_3_alerts(db_session: AsyncSession):
    await seed_geographic(db_session)
    await db_session.commit()
    result = await db_session.execute(
        select(func.count(Alert.id)).where(Alert.typology == TYPOLOGY_GEOGRAPHIC)
    )
    assert result.scalar() == 3


@pytest.mark.asyncio
async def test_seed_rapid_movement_has_3_alerts(db_session: AsyncSession):
    await seed_rapid_movement(db_session)
    await db_session.commit()
    result = await db_session.execute(
        select(func.count(Alert.id)).where(Alert.typology == TYPOLOGY_RAPID_MOVEMENT)
    )
    assert result.scalar() == 3


@pytest.mark.asyncio
async def test_seed_round_trip_has_3_alerts(db_session: AsyncSession):
    await seed_round_trip(db_session)
    await db_session.commit()
    result = await db_session.execute(
        select(func.count(Alert.id)).where(Alert.typology == TYPOLOGY_ROUND_TRIP)
    )
    assert result.scalar() == 3


@pytest.mark.asyncio
async def test_seed_sudden_activity_has_3_alerts(db_session: AsyncSession):
    await seed_sudden_activity(db_session)
    await db_session.commit()
    result = await db_session.execute(
        select(func.count(Alert.id)).where(Alert.typology == TYPOLOGY_SUDDEN_ACTIVITY)
    )
    assert result.scalar() == 3


@pytest.mark.asyncio
async def test_seed_large_cash_has_3_alerts(db_session: AsyncSession):
    await seed_large_cash(db_session)
    await db_session.commit()
    result = await db_session.execute(
        select(func.count(Alert.id)).where(Alert.typology == TYPOLOGY_LARGE_CASH)
    )
    assert result.scalar() == 3
