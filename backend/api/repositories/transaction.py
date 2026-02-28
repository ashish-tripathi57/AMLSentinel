from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.transaction import Transaction


class TransactionRepository:
    """Async CRUD operations for Transaction entities."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_account(self, account_id: str) -> list[Transaction]:
        """Fetch all transactions for an account, ordered by date descending."""
        result = await self.session.execute(
            select(Transaction)
            .where(Transaction.account_id == account_id)
            .order_by(Transaction.transaction_date.desc())
        )
        return list(result.scalars().all())

    async def get_by_alert(self, alert_id: str) -> list[Transaction]:
        """Fetch all flagged transactions for an alert via the junction table."""
        from api.models.alert import alert_transactions

        result = await self.session.execute(
            select(Transaction)
            .join(alert_transactions, Transaction.id == alert_transactions.c.transaction_id)
            .where(alert_transactions.c.alert_id == alert_id)
            .order_by(Transaction.transaction_date.asc())
        )
        return list(result.scalars().all())

    async def get_all_for_customer_alerts(self, customer_id: str) -> list[Transaction]:
        """Fetch all transactions across all accounts for a customer."""
        from api.models.account import Account

        result = await self.session.execute(
            select(Transaction)
            .join(Account, Transaction.account_id == Account.id)
            .where(Account.customer_id == customer_id)
            .order_by(Transaction.transaction_date.desc())
        )
        return list(result.scalars().all())
