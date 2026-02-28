import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.account import Account
from api.models.customer import Customer


@pytest.mark.asyncio
async def test_account_create(db_session: AsyncSession):
    """Verify account can be created with customer FK."""
    customer = Customer(full_name="Rajesh Kumar")
    db_session.add(customer)
    await db_session.flush()

    account = Account(
        customer_id=customer.id,
        account_number="ACC-001",
        account_type="Savings",
        branch="Mumbai Main",
        current_balance=500000.0,
    )
    db_session.add(account)
    await db_session.commit()

    result = await db_session.execute(select(Account).where(Account.account_number == "ACC-001"))
    saved = result.scalar_one()
    assert saved.customer_id == customer.id
    assert saved.account_type == "Savings"
    assert saved.current_balance == 500000.0


@pytest.mark.asyncio
async def test_account_defaults(db_session: AsyncSession):
    """Verify default values are applied correctly."""
    customer = Customer(full_name="Test Customer")
    db_session.add(customer)
    await db_session.flush()

    account = Account(
        customer_id=customer.id,
        account_number="ACC-002",
        account_type="Current",
    )
    db_session.add(account)
    await db_session.commit()

    result = await db_session.execute(select(Account).where(Account.account_number == "ACC-002"))
    saved = result.scalar_one()
    assert saved.status == "Active"
    assert saved.current_balance == 0.0
    assert saved.currency == "INR"


from api.schemas.account import AccountResponse


def test_account_response_schema():
    """Verify AccountResponse schema validates correctly."""
    data = AccountResponse(
        id="test-uuid",
        customer_id="cust-uuid",
        account_number="ACC-001",
        account_type="Savings",
    )
    assert data.account_number == "ACC-001"
    assert data.customer_id == "cust-uuid"
