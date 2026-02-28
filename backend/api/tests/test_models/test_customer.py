import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.customer import Customer
from api.schemas.customer import CustomerResponse


@pytest.mark.asyncio
async def test_customer_create(db_session: AsyncSession):
    """Verify customer can be created and persisted."""
    customer = Customer(
        full_name="Rajesh Kumar",
        nationality="Indian",
        occupation="Business Owner",
        risk_category="High",
        declared_annual_income=5000000.0,
        pep_status=False,
    )
    db_session.add(customer)
    await db_session.commit()

    result = await db_session.execute(select(Customer).where(Customer.full_name == "Rajesh Kumar"))
    saved = result.scalar_one()
    assert saved.full_name == "Rajesh Kumar"
    assert saved.risk_category == "High"
    assert saved.declared_annual_income == 5000000.0
    assert saved.id is not None
    assert saved.created_at is not None


@pytest.mark.asyncio
async def test_customer_defaults(db_session: AsyncSession):
    """Verify default values are applied correctly."""
    customer = Customer(full_name="Test Customer")
    db_session.add(customer)
    await db_session.commit()

    result = await db_session.execute(select(Customer).where(Customer.full_name == "Test Customer"))
    saved = result.scalar_one()
    assert saved.risk_category == "Medium"
    assert saved.pep_status is False
    assert saved.previous_alert_count == 0


def test_customer_response_schema():
    """Verify CustomerResponse schema validates correctly."""
    data = CustomerResponse(
        id="test-uuid",
        full_name="Rajesh Kumar",
        nationality="Indian",
        occupation="Business Owner",
        risk_category="High",
    )
    assert data.full_name == "Rajesh Kumar"
    assert data.id == "test-uuid"
