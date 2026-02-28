import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from api.repositories.customer import CustomerRepository


@pytest.mark.asyncio
async def test_customer_create(db_session: AsyncSession):
    repo = CustomerRepository(db_session)
    customer = await repo.create(full_name="Rajesh Kumar", risk_category="High")
    assert customer.id is not None
    assert customer.full_name == "Rajesh Kumar"


@pytest.mark.asyncio
async def test_customer_get_by_id(db_session: AsyncSession):
    repo = CustomerRepository(db_session)
    created = await repo.create(full_name="Priya Sharma")
    fetched = await repo.get_by_id(created.id)
    assert fetched is not None
    assert fetched.full_name == "Priya Sharma"


@pytest.mark.asyncio
async def test_customer_get_by_id_not_found(db_session: AsyncSession):
    repo = CustomerRepository(db_session)
    fetched = await repo.get_by_id("nonexistent-uuid")
    assert fetched is None


@pytest.mark.asyncio
async def test_customer_get_all(db_session: AsyncSession):
    repo = CustomerRepository(db_session)
    await repo.create(full_name="Customer 1")
    await repo.create(full_name="Customer 2")
    customers = await repo.get_all()
    assert len(customers) == 2
