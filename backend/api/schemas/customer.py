from pydantic import BaseModel


class CustomerBase(BaseModel):
    """Shared customer fields."""

    full_name: str
    date_of_birth: str | None = None
    nationality: str | None = None
    occupation: str | None = None
    employer: str | None = None
    declared_annual_income: float | None = None
    risk_category: str = "Medium"
    customer_since: str | None = None
    id_type: str | None = None
    id_number: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    pep_status: bool = False
    previous_alert_count: int = 0
    kyc_verification_date: str | None = None
    kyc_last_update_date: str | None = None
    income_verification_notes: str | None = None


class CustomerResponse(CustomerBase):
    """Customer data returned from API."""

    id: str

    model_config = {"from_attributes": True}
