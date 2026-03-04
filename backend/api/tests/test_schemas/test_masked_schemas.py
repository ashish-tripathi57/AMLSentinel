"""Unit tests for masked Pydantic response schemas.

Validates that MaskedCustomerResponse, MaskedAccountResponse, and
MaskedTransactionResponse automatically apply PII masking via their
model validators, while preserving unmasked fields (full_name,
counterparty_name, etc.).
"""

import pytest

from api.schemas.account import MaskedAccountResponse
from api.schemas.customer import MaskedCustomerResponse
from api.schemas.transaction import MaskedTransactionResponse


# ---------------------------------------------------------------------------
# MaskedCustomerResponse
# ---------------------------------------------------------------------------


class TestMaskedCustomerResponse:
    """Tests for the masked customer schema."""

    def _build_customer_data(self, **overrides) -> dict:
        """Return base customer data with optional overrides."""
        base = {
            "id": "cust-001",
            "full_name": "Rajesh Sharma",
            "date_of_birth": "1985-03-15",
            "nationality": "Indian",
            "occupation": "Business Owner",
            "employer": "Self",
            "declared_annual_income": 1200000.0,
            "risk_category": "High",
            "customer_since": "2018-01-10",
            "id_type": "PAN",
            "id_number": "ABCDE1234R",
            "address": "42 MG Road, Surat, Gujarat",
            "phone": "+91-9876-543210",
            "email": "rajesh.sharma@email.com",
            "pep_status": False,
            "previous_alert_count": 2,
            "kyc_verification_date": "2023-06-01",
            "kyc_last_update_date": "2024-01-15",
            "income_verification_notes": "ITR filed",
        }
        base.update(overrides)
        return base

    def test_masks_dob(self) -> None:
        customer = MaskedCustomerResponse(**self._build_customer_data())
        assert customer.date_of_birth == "XXXX-XX-XX"

    def test_masks_id_number(self) -> None:
        customer = MaskedCustomerResponse(**self._build_customer_data())
        assert customer.id_number == "XXXXXX234R"

    def test_masks_address(self) -> None:
        customer = MaskedCustomerResponse(**self._build_customer_data())
        assert customer.address == "******, Surat, Gujarat"

    def test_masks_phone(self) -> None:
        customer = MaskedCustomerResponse(**self._build_customer_data())
        assert customer.phone == "+XX-XXXX-XX3210"

    def test_masks_email(self) -> None:
        customer = MaskedCustomerResponse(**self._build_customer_data())
        assert customer.email == "r*****@email.com"

    def test_preserves_full_name(self) -> None:
        customer = MaskedCustomerResponse(**self._build_customer_data())
        assert customer.full_name == "Rajesh Sharma"

    def test_preserves_non_pii_fields(self) -> None:
        customer = MaskedCustomerResponse(**self._build_customer_data())
        assert customer.nationality == "Indian"
        assert customer.occupation == "Business Owner"
        assert customer.risk_category == "High"
        assert customer.declared_annual_income == 1200000.0
        assert customer.pep_status is False
        assert customer.id == "cust-001"

    def test_handles_none_pii_fields(self) -> None:
        customer = MaskedCustomerResponse(
            **self._build_customer_data(
                date_of_birth=None,
                id_number=None,
                address=None,
                phone=None,
                email=None,
            )
        )
        assert customer.date_of_birth is None
        assert customer.id_number is None
        assert customer.address is None
        assert customer.phone is None
        assert customer.email is None

    def test_model_dump_contains_masked_values(self) -> None:
        customer = MaskedCustomerResponse(**self._build_customer_data())
        data = customer.model_dump()
        assert data["date_of_birth"] == "XXXX-XX-XX"
        assert data["id_number"] == "XXXXXX234R"
        assert data["full_name"] == "Rajesh Sharma"


# ---------------------------------------------------------------------------
# MaskedAccountResponse
# ---------------------------------------------------------------------------


class TestMaskedAccountResponse:
    """Tests for the masked account schema."""

    def _build_account_data(self, **overrides) -> dict:
        base = {
            "id": "acc-001",
            "customer_id": "cust-001",
            "account_number": "SB-00123456",
            "account_type": "savings",
            "branch": "Surat Main",
            "opening_date": "2018-02-15",
            "status": "Active",
            "current_balance": 500000.0,
            "currency": "INR",
        }
        base.update(overrides)
        return base

    def test_masks_account_number(self) -> None:
        account = MaskedAccountResponse(**self._build_account_data())
        assert account.account_number == "XX-XXXX3456"

    def test_preserves_other_fields(self) -> None:
        account = MaskedAccountResponse(**self._build_account_data())
        assert account.account_type == "savings"
        assert account.branch == "Surat Main"
        assert account.current_balance == 500000.0
        assert account.id == "acc-001"
        assert account.customer_id == "cust-001"

    def test_short_account_number_unchanged(self) -> None:
        account = MaskedAccountResponse(
            **self._build_account_data(account_number="1234")
        )
        assert account.account_number == "1234"

    def test_model_dump_contains_masked_value(self) -> None:
        account = MaskedAccountResponse(**self._build_account_data())
        data = account.model_dump()
        assert data["account_number"] == "XX-XXXX3456"


# ---------------------------------------------------------------------------
# MaskedTransactionResponse
# ---------------------------------------------------------------------------


class TestMaskedTransactionResponse:
    """Tests for the masked transaction schema."""

    def _build_txn_data(self, **overrides) -> dict:
        base = {
            "id": "txn-001",
            "account_id": "acc-001",
            "transaction_date": "2024-12-01",
            "transaction_type": "wire",
            "amount": 250000.0,
            "currency": "INR",
            "direction": "debit",
            "channel": "internet_banking",
            "counterparty_name": "Shell Corp Ltd",
            "counterparty_account": "ACC-789-012345",
            "counterparty_bank": "Other Bank",
            "location": "Mumbai",
            "country": "India",
            "reference_number": "REF-001",
            "description": "Wire transfer",
            "is_flagged": True,
        }
        base.update(overrides)
        return base

    def test_masks_counterparty_account(self) -> None:
        txn = MaskedTransactionResponse(**self._build_txn_data())
        assert txn.counterparty_account == "XXX-XXX-XX2345"

    def test_preserves_counterparty_name(self) -> None:
        txn = MaskedTransactionResponse(**self._build_txn_data())
        assert txn.counterparty_name == "Shell Corp Ltd"

    def test_preserves_other_fields(self) -> None:
        txn = MaskedTransactionResponse(**self._build_txn_data())
        assert txn.amount == 250000.0
        assert txn.direction == "debit"
        assert txn.transaction_type == "wire"
        assert txn.id == "txn-001"

    def test_none_counterparty_account(self) -> None:
        txn = MaskedTransactionResponse(
            **self._build_txn_data(counterparty_account=None)
        )
        assert txn.counterparty_account is None

    def test_model_dump_contains_masked_value(self) -> None:
        txn = MaskedTransactionResponse(**self._build_txn_data())
        data = txn.model_dump()
        assert data["counterparty_account"] == "XXX-XXX-XX2345"
        assert data["counterparty_name"] == "Shell Corp Ltd"
