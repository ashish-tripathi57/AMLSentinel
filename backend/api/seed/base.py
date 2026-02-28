"""Base seeder utilities shared across all typology seeders."""

from sqlalchemy.ext.asyncio import AsyncSession

from api.models.account import Account
from api.models.alert import Alert
from api.models.customer import Customer
from api.models.investigation import ChecklistItem
from api.models.transaction import Transaction
from api.seed.data_spec import CHECKLIST_TEMPLATES


async def seed_customer(session: AsyncSession, **kwargs) -> Customer:
    """Create and persist a customer record."""
    customer = Customer(**kwargs)
    session.add(customer)
    await session.flush()
    return customer


async def seed_account(session: AsyncSession, customer_id: str, **kwargs) -> Account:
    """Create and persist an account record."""
    account = Account(customer_id=customer_id, **kwargs)
    session.add(account)
    await session.flush()
    return account


async def seed_transaction(session: AsyncSession, account_id: str, **kwargs) -> Transaction:
    """Create and persist a transaction record."""
    txn = Transaction(account_id=account_id, **kwargs)
    session.add(txn)
    await session.flush()
    return txn


async def seed_alert(
    session: AsyncSession,
    customer_id: str,
    flagged_txn_ids: list[str],
    **kwargs,
) -> Alert:
    """Create an alert and link flagged transactions via junction table."""
    alert = Alert(customer_id=customer_id, **kwargs)
    session.add(alert)
    await session.flush()

    # Link flagged transactions
    for txn_id in flagged_txn_ids:
        from api.models.alert import alert_transactions
        await session.execute(
            alert_transactions.insert().values(alert_id=alert.id, transaction_id=txn_id)
        )

    return alert


async def seed_checklist(session: AsyncSession, alert_id: str, typology: str) -> list[ChecklistItem]:
    """Create checklist items from the typology template."""
    descriptions = CHECKLIST_TEMPLATES.get(typology, [])
    items = []
    for i, desc in enumerate(descriptions):
        item = ChecklistItem(alert_id=alert_id, description=desc, sort_order=i)
        session.add(item)
        items.append(item)
    await session.flush()
    return items
