import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.account import Account
from api.models.alert import Alert
from api.models.customer import Customer
from api.models.transaction import Transaction
from api.repositories.transaction import TransactionRepository


async def _seed_transactions(db_session: AsyncSession):
    customer = Customer(full_name="Test Customer")
    db_session.add(customer)
    await db_session.flush()

    account = Account(customer_id=customer.id, account_number="ACC-001", account_type="Savings")
    db_session.add(account)
    await db_session.flush()

    txn1 = Transaction(
        account_id=account.id, transaction_date="2025-01-15",
        transaction_type="Cash Deposit", amount=490000.0, direction="credit",
    )
    txn2 = Transaction(
        account_id=account.id, transaction_date="2025-01-16",
        transaction_type="Cash Deposit", amount=480000.0, direction="credit",
    )
    db_session.add_all([txn1, txn2])
    await db_session.flush()

    alert = Alert(
        alert_id="S1", customer_id=customer.id, typology="Structuring",
        risk_score=85, title="Test", triggered_date="2025-01-20",
    )
    alert.flagged_transactions.append(txn1)
    db_session.add(alert)
    await db_session.commit()
    return customer, account, alert, [txn1, txn2]


@pytest.mark.asyncio
async def test_get_by_account(db_session: AsyncSession):
    _, account, _, txns = await _seed_transactions(db_session)
    repo = TransactionRepository(db_session)
    result = await repo.get_by_account(account.id)
    assert len(result) == 2


@pytest.mark.asyncio
async def test_get_by_alert(db_session: AsyncSession):
    _, _, alert, _ = await _seed_transactions(db_session)
    repo = TransactionRepository(db_session)
    result = await repo.get_by_alert(alert.id)
    assert len(result) == 1
    assert result[0].amount == 490000.0


@pytest.mark.asyncio
async def test_get_all_for_customer(db_session: AsyncSession):
    customer, _, _, _ = await _seed_transactions(db_session)
    repo = TransactionRepository(db_session)
    result = await repo.get_all_for_customer_alerts(customer.id)
    assert len(result) == 2
