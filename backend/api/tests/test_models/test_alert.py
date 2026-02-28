import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.account import Account
from api.models.alert import Alert, alert_transactions
from api.models.customer import Customer
from api.models.transaction import Transaction


@pytest.mark.asyncio
async def test_alert_create(db_session: AsyncSession):
    """Verify alert can be created with customer FK."""
    customer = Customer(full_name="Rajesh Kumar")
    db_session.add(customer)
    await db_session.flush()

    alert = Alert(
        alert_id="S1",
        customer_id=customer.id,
        typology="Structuring",
        risk_score=85,
        title="Potential structuring detected",
        triggered_date="2025-01-20",
        total_flagged_amount=2450000.0,
        flagged_transaction_count=5,
    )
    db_session.add(alert)
    await db_session.commit()

    result = await db_session.execute(select(Alert).where(Alert.alert_id == "S1"))
    saved = result.scalar_one()
    assert saved.typology == "Structuring"
    assert saved.risk_score == 85
    assert saved.status == "New"


@pytest.mark.asyncio
async def test_alert_transaction_junction(db_session: AsyncSession):
    """Verify many-to-many relationship between alerts and transactions."""
    customer = Customer(full_name="Rajesh Kumar")
    db_session.add(customer)
    await db_session.flush()

    account = Account(customer_id=customer.id, account_number="ACC-001", account_type="Savings")
    db_session.add(account)
    await db_session.flush()

    txn = Transaction(
        account_id=account.id,
        transaction_date="2025-01-15",
        transaction_type="Cash Deposit",
        amount=490000.0,
        direction="credit",
    )
    db_session.add(txn)
    await db_session.flush()

    alert = Alert(
        alert_id="S1",
        customer_id=customer.id,
        typology="Structuring",
        risk_score=85,
        title="Potential structuring detected",
        triggered_date="2025-01-20",
    )
    alert.flagged_transactions.append(txn)
    db_session.add(alert)
    await db_session.commit()

    result = await db_session.execute(select(Alert).where(Alert.alert_id == "S1"))
    saved = result.scalar_one()
    assert len(saved.flagged_transactions) == 1
    assert saved.flagged_transactions[0].amount == 490000.0


from api.schemas.alert import AlertListItem, AlertStatusUpdate


def test_alert_list_item_schema():
    """Verify AlertListItem schema validates correctly."""
    data = AlertListItem(
        id="alert-uuid",
        customer_id="cust-uuid",
        alert_id="S1",
        typology="Structuring",
        risk_score=85,
        title="Test alert",
        triggered_date="2025-01-20",
    )
    assert data.alert_id == "S1"
    assert data.risk_score == 85


def test_alert_status_update_schema():
    """Verify AlertStatusUpdate schema validates correctly."""
    data = AlertStatusUpdate(status="In Progress", rationale="Starting investigation")
    assert data.status == "In Progress"


@pytest.mark.asyncio
async def test_alert_resolution_defaults_to_none(db_session: AsyncSession):
    """Verify resolution and closed_at default to None on new alerts."""
    customer = Customer(full_name="Test User")
    db_session.add(customer)
    await db_session.flush()

    alert = Alert(
        alert_id="RES1",
        customer_id=customer.id,
        typology="Structuring",
        risk_score=80,
        title="Resolution test alert",
        triggered_date="2025-02-01",
    )
    db_session.add(alert)
    await db_session.commit()

    result = await db_session.execute(select(Alert).where(Alert.alert_id == "RES1"))
    saved = result.scalar_one()
    assert saved.resolution is None
    assert saved.closed_at is None


@pytest.mark.asyncio
async def test_alert_resolution_can_be_set(db_session: AsyncSession):
    """Verify resolution and closed_at can be explicitly set."""
    customer = Customer(full_name="Test User")
    db_session.add(customer)
    await db_session.flush()

    alert = Alert(
        alert_id="RES2",
        customer_id=customer.id,
        typology="Structuring",
        risk_score=75,
        title="Resolution set test",
        triggered_date="2025-02-01",
        resolution="No Suspicion",
        closed_at="2025-02-15T10:30:00Z",
    )
    db_session.add(alert)
    await db_session.commit()

    result = await db_session.execute(select(Alert).where(Alert.alert_id == "RES2"))
    saved = result.scalar_one()
    assert saved.resolution == "No Suspicion"
    assert saved.closed_at == "2025-02-15T10:30:00Z"


def test_alert_list_item_schema_with_resolution():
    """Verify AlertListItem includes resolution and closed_at fields."""
    data = AlertListItem(
        id="alert-uuid",
        customer_id="cust-uuid",
        alert_id="S1",
        typology="Structuring",
        risk_score=85,
        title="Test alert",
        triggered_date="2025-01-20",
        resolution="SAR Filed",
        closed_at="2025-02-01T12:00:00Z",
    )
    assert data.resolution == "SAR Filed"
    assert data.closed_at == "2025-02-01T12:00:00Z"


def test_alert_status_update_schema_with_resolution():
    """Verify AlertStatusUpdate accepts optional resolution."""
    data = AlertStatusUpdate(status="Closed", rationale="No suspicious activity", resolution="No Suspicion")
    assert data.resolution == "No Suspicion"


def test_alert_status_update_schema_resolution_defaults_none():
    """Verify AlertStatusUpdate resolution defaults to None."""
    data = AlertStatusUpdate(status="In Progress", rationale="Starting")
    assert data.resolution is None
