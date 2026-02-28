from pydantic import BaseModel


class TransactionBase(BaseModel):
    """Shared transaction fields."""

    transaction_date: str
    transaction_type: str
    amount: float
    currency: str = "INR"
    direction: str
    channel: str | None = None
    counterparty_name: str | None = None
    counterparty_account: str | None = None
    counterparty_bank: str | None = None
    location: str | None = None
    country: str | None = None
    reference_number: str | None = None
    description: str | None = None
    is_flagged: bool = False


class TransactionResponse(TransactionBase):
    """Transaction data returned from API."""

    id: str
    account_id: str

    model_config = {"from_attributes": True}
