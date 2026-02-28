from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.models.customer import Customer


class CustomerRepository:
    """Async CRUD operations for Customer entities."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, customer_id: str) -> Customer | None:
        """Fetch a customer by UUID with related accounts."""
        result = await self.session.execute(
            select(Customer)
            .options(selectinload(Customer.accounts))
            .where(Customer.id == customer_id)
        )
        return result.scalar_one_or_none()

    async def get_all(self) -> list[Customer]:
        """Fetch all customers."""
        result = await self.session.execute(select(Customer))
        return list(result.scalars().all())

    async def create(self, **kwargs) -> Customer:
        """Create a new customer."""
        customer = Customer(**kwargs)
        self.session.add(customer)
        await self.session.commit()
        await self.session.refresh(customer)
        return customer
