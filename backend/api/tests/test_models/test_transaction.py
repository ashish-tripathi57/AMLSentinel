import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.account import Account
from api.models.customer import Customer
from api.models.transaction import Transaction


@pytest.mark.asyncio
async def test_transaction_create(db_session: AsyncSession):
    """Verify transaction can be created with account FK."""
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
        channel="cash",
        location="Mumbai Branch",
        is_flagged=True,
    )
    db_session.add(txn)
    await db_session.commit()

    result = await db_session.execute(select(Transaction).where(Transaction.account_id == account.id))
    saved = result.scalar_one()
    assert saved.amount == 490000.0
    assert saved.direction == "credit"
    assert saved.is_flagged is True
    assert saved.channel == "cash"


@pytest.mark.asyncio
async def test_transaction_defaults(db_session: AsyncSession):
    """Verify default values are applied correctly."""
    customer = Customer(full_name="Test Customer")
    db_session.add(customer)
    await db_session.flush()

    account = Account(customer_id=customer.id, account_number="ACC-002", account_type="Current")
    db_session.add(account)
    await db_session.flush()

    txn = Transaction(
        account_id=account.id,
        transaction_date="2025-02-01",
        transaction_type="Wire Transfer",
        amount=1000000.0,
        direction="debit",
    )
    db_session.add(txn)
    await db_session.commit()

    result = await db_session.execute(select(Transaction).where(Transaction.amount == 1000000.0))
    saved = result.scalar_one()
    assert saved.currency == "INR"
    assert saved.is_flagged is False


from api.schemas.transaction import TransactionResponse


def test_transaction_response_schema():
    """Verify TransactionResponse schema validates correctly."""
    data = TransactionResponse(
        id="txn-uuid",
        account_id="acc-uuid",
        transaction_date="2025-01-15",
        transaction_type="Cash Deposit",
        amount=490000.0,
        direction="credit",
    )
    assert data.amount == 490000.0
    assert data.direction == "credit"
