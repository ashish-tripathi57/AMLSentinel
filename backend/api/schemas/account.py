from pydantic import BaseModel


class AccountBase(BaseModel):
    """Shared account fields."""

    account_number: str
    account_type: str
    branch: str | None = None
    opening_date: str | None = None
    status: str = "Active"
    current_balance: float = 0.0
    currency: str = "INR"


class AccountResponse(AccountBase):
    """Account data returned from API."""

    id: str
    customer_id: str

    model_config = {"from_attributes": True}
