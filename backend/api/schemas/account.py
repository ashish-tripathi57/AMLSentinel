from pydantic import BaseModel, model_validator

from api.core.pii_masker import mask_account_number


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


class MaskedAccountResponse(AccountResponse):
    """Account response with account_number masked for DPDP Act compliance."""

    @model_validator(mode="after")
    def apply_pii_masking(self) -> "MaskedAccountResponse":
        """Mask the account number, preserving separators."""
        self.account_number = mask_account_number(self.account_number) or self.account_number
        return self
