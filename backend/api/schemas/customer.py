from pydantic import BaseModel, model_validator

from api.core.pii_masker import (
    mask_address,
    mask_dob,
    mask_email,
    mask_id_number,
    mask_phone,
)


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


class MaskedCustomerResponse(CustomerResponse):
    """Customer response with PII fields masked for DPDP Act compliance.

    Masks: date_of_birth, id_number, address, phone, email.
    Preserves: full_name (needed for investigation).
    """

    @model_validator(mode="after")
    def apply_pii_masking(self) -> "MaskedCustomerResponse":
        """Mask sensitive PII fields after model validation."""
        self.date_of_birth = mask_dob(self.date_of_birth)
        self.id_number = mask_id_number(self.id_number)
        self.address = mask_address(self.address)
        self.phone = mask_phone(self.phone)
        self.email = mask_email(self.email)
        return self
