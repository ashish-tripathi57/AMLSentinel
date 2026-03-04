"""Tests verifying that PII is masked in AI prompt-building helper functions.

These are pure unit tests — no database, no AI API calls. Each test builds a
simple mock customer or account object with realistic PII values and asserts
that the returned prompt block contains the masked representation, not the
raw PII.
"""

from types import SimpleNamespace

import pytest

from api.services.chat import (
    _build_accounts_block,
    _build_customer_block,
    _build_network_block,
)
from api.services.checklist_ai import (
    _build_account_block,
    _build_customer_profile_block,
)


# ---------------------------------------------------------------------------
# Helpers — lightweight stand-ins for ORM objects
# ---------------------------------------------------------------------------


def _make_customer(**overrides) -> SimpleNamespace:
    """Return a mock customer with realistic PII defaults."""
    defaults = dict(
        full_name="Rajesh Kumar Sharma",
        date_of_birth="1982-07-15",
        nationality="Indian",
        occupation="Business Owner",
        employer="Self-Employed",
        declared_annual_income=1_200_000.0,
        risk_category="High",
        pep_status=False,
        previous_alert_count=2,
        customer_since="2018-03-01",
        id_type="PAN",
        id_number="ABCDE1234R",
        address="42 MG Road, Surat, Gujarat",
        phone="+91-9876-543210",
        email="rajesh.sharma@example.com",
        kyc_verification_date="2023-01-10",
        kyc_last_update_date="2024-06-20",
        income_verification_notes="ITR submitted",
        accounts=[],
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _make_account(**overrides) -> SimpleNamespace:
    """Return a mock bank account with realistic values."""
    defaults = dict(
        id="acc-001",
        account_number="ACC-123-456789",
        account_type="Savings",
        branch="Surat Main Branch",
        status="Active",
        current_balance=250_000.0,
        opening_date="2018-03-15",
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _make_transaction(**overrides) -> SimpleNamespace:
    """Return a mock transaction."""
    defaults = dict(
        account_id="acc-001",
        transaction_date="2024-01-10",
        transaction_type="NEFT",
        direction="credit",
        amount=50_000.0,
        counterparty_name="Global Exports Pvt Ltd",
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


# ---------------------------------------------------------------------------
# chat._build_customer_block
# ---------------------------------------------------------------------------


class TestBuildCustomerBlock:
    def test_full_name_is_not_masked(self):
        """Full name must appear unmasked — required for investigation context."""
        customer = _make_customer()
        block = _build_customer_block(customer)
        assert "Rajesh Kumar Sharma" in block

    def test_dob_is_fully_masked(self):
        """Date of birth must be replaced with XXXX-XX-XX."""
        customer = _make_customer(date_of_birth="1982-07-15")
        block = _build_customer_block(customer)
        assert "1982-07-15" not in block
        assert "XXXX-XX-XX" in block

    def test_id_number_shows_last_four_only(self):
        """PAN/ID number must show only the last 4 characters."""
        customer = _make_customer(id_type="PAN", id_number="ABCDE1234R")
        block = _build_customer_block(customer)
        assert "ABCDE1234R" not in block
        # Last 4 chars of "ABCDE1234R" are "234R"
        assert "234R" in block
        # Leading characters should be masked
        assert "XXXXXX234R" in block

    def test_address_shows_city_state_only(self):
        """Street number must be masked; city and state must remain."""
        customer = _make_customer(address="42 MG Road, Surat, Gujarat")
        block = _build_customer_block(customer)
        assert "42 MG Road" not in block
        assert "Surat" in block
        assert "Gujarat" in block
        assert "******" in block

    def test_phone_shows_last_four_digits_only(self):
        """All digits except the last 4 must be replaced with X."""
        customer = _make_customer(phone="+91-9876-543210")
        block = _build_customer_block(customer)
        assert "9876-543210" not in block
        # Last 4 digits of "+91-9876-543210" are "3210"
        assert "3210" in block

    def test_email_shows_first_char_and_domain(self):
        """Email local part must be masked, keeping only the first character."""
        customer = _make_customer(email="rajesh.sharma@example.com")
        block = _build_customer_block(customer)
        assert "rajesh.sharma@example.com" not in block
        assert "r*****@example.com" in block

    def test_none_dob_renders_as_na(self):
        """When date_of_birth is None, the block must show 'N/A'."""
        customer = _make_customer(date_of_birth=None)
        block = _build_customer_block(customer)
        assert "Date of Birth: N/A" in block

    def test_none_id_number_renders_as_na(self):
        """When id_number is None, the block must show 'N/A'."""
        customer = _make_customer(id_number=None, id_type=None)
        block = _build_customer_block(customer)
        assert "N/A — N/A" in block

    def test_none_address_renders_as_na(self):
        """When address is None, the block must show 'N/A'."""
        customer = _make_customer(address=None)
        block = _build_customer_block(customer)
        assert "Address: N/A" in block

    def test_none_phone_renders_as_na(self):
        """When phone is None, the block must show 'N/A'."""
        customer = _make_customer(phone=None)
        block = _build_customer_block(customer)
        assert "Phone: N/A" in block

    def test_none_email_renders_as_na(self):
        """When email is None, the block must show 'N/A'."""
        customer = _make_customer(email=None)
        block = _build_customer_block(customer)
        assert "Email: N/A" in block

    def test_none_customer_returns_not_found_string(self):
        """A None customer must return the 'not found' sentinel string."""
        block = _build_customer_block(None)
        assert "not found" in block


# ---------------------------------------------------------------------------
# chat._build_accounts_block
# ---------------------------------------------------------------------------


class TestBuildAccountsBlock:
    def test_account_number_is_masked(self):
        """Raw account number must not appear; last 4 chars must be visible."""
        account = _make_account(account_number="ACC-123-456789")
        customer = _make_customer(accounts=[account])
        block = _build_accounts_block(customer)
        assert "ACC-123-456789" not in block
        # Last 4 alnum chars of "ACC-123-456789" are "6789"
        assert "6789" in block

    def test_non_pii_account_fields_are_present(self):
        """Account type, branch, status, and balance must be unmasked."""
        account = _make_account(
            account_type="Savings",
            branch="Surat Main Branch",
            status="Active",
            current_balance=250_000.0,
        )
        customer = _make_customer(accounts=[account])
        block = _build_accounts_block(customer)
        assert "Savings" in block
        assert "Surat Main Branch" in block
        assert "Active" in block

    def test_no_accounts_returns_placeholder(self):
        """Customer with no accounts must return the 'no bank accounts' string."""
        customer = _make_customer(accounts=[])
        block = _build_accounts_block(customer)
        assert "no bank accounts" in block

    def test_multiple_accounts_all_masked(self):
        """Each account's number must be independently masked."""
        acc1 = _make_account(id="acc-001", account_number="SB-000-000001")
        acc2 = _make_account(id="acc-002", account_number="CC-000-000002")
        customer = _make_customer(accounts=[acc1, acc2])
        block = _build_accounts_block(customer)
        assert "SB-000-000001" not in block
        assert "CC-000-000002" not in block
        # Last 4 alnum chars
        assert "0001" in block
        assert "0002" in block


# ---------------------------------------------------------------------------
# chat._build_network_block
# ---------------------------------------------------------------------------


class TestBuildNetworkBlock:
    def test_account_labels_use_masked_account_numbers(self):
        """Counterparty flow lines must reference masked account numbers only."""
        account = _make_account(id="acc-001", account_number="ACC-123-456789")
        customer = _make_customer(accounts=[account])
        txn = _make_transaction(account_id="acc-001", direction="credit", amount=50_000.0)

        block = _build_network_block(customer, [txn])

        assert "ACC-123-456789" not in block
        # Last 4 alnum chars of "ACC-123-456789" are "6789"
        assert "6789" in block

    def test_counterparty_name_is_not_masked(self):
        """Counterparty names must appear verbatim — needed for analysis."""
        account = _make_account(id="acc-001", account_number="ACC-123-456789")
        customer = _make_customer(accounts=[account])
        txn = _make_transaction(
            account_id="acc-001",
            counterparty_name="Global Exports Pvt Ltd",
            direction="debit",
            amount=75_000.0,
        )

        block = _build_network_block(customer, [txn])
        assert "Global Exports Pvt Ltd" in block

    def test_no_transactions_returns_placeholder(self):
        """Empty transaction list must return 'no transaction network'."""
        customer = _make_customer()
        block = _build_network_block(customer, [])
        assert "no transaction network" in block


# ---------------------------------------------------------------------------
# checklist_ai._build_customer_profile_block
# ---------------------------------------------------------------------------


class TestChecklistBuildCustomerProfileBlock:
    def test_id_number_is_masked(self):
        """ID number must show only last 4 characters in the checklist block."""
        customer = _make_customer(id_type="Aadhaar", id_number="1234-5678-9012")
        block = _build_customer_profile_block(customer)
        assert "1234-5678-9012" not in block
        # Last 4 alnum chars of "123456789012" are "9012"
        assert "9012" in block

    def test_address_is_masked_in_checklist_block(self):
        """Street-level address detail must be masked; city and state preserved."""
        customer = _make_customer(address="15 Nariman Point, Mumbai, Maharashtra")
        block = _build_customer_profile_block(customer)
        assert "15 Nariman Point" not in block
        assert "Mumbai" in block
        assert "Maharashtra" in block

    def test_full_name_is_not_masked_in_checklist_block(self):
        """Full name must remain visible in the checklist prompt block."""
        customer = _make_customer(full_name="Priya Mehta")
        block = _build_customer_profile_block(customer)
        assert "Priya Mehta" in block

    def test_none_id_number_renders_as_na_in_checklist(self):
        """None id_number must render as 'N/A' without raising an error."""
        customer = _make_customer(id_number=None, id_type=None)
        block = _build_customer_profile_block(customer)
        assert "N/A" in block

    def test_none_address_renders_as_not_on_file(self):
        """None address must render as 'Not on file' without raising an error."""
        customer = _make_customer(address=None)
        block = _build_customer_profile_block(customer)
        assert "Not on file" in block

    def test_none_customer_returns_unknown(self):
        """None customer must return the 'unknown' sentinel string."""
        block = _build_customer_profile_block(None)
        assert "unknown" in block


# ---------------------------------------------------------------------------
# checklist_ai._build_account_block
# ---------------------------------------------------------------------------


class TestChecklistBuildAccountBlock:
    def test_account_number_is_masked_in_checklist_block(self):
        """Raw account number must not appear in the checklist account block."""
        account = _make_account(account_number="SB-987-654321")
        customer = _make_customer(accounts=[account])
        block = _build_account_block(customer)
        assert "SB-987-654321" not in block
        # Last 4 alnum chars of "SB987654321" are "4321"
        assert "4321" in block

    def test_non_pii_account_fields_present_in_checklist(self):
        """Account type, branch, status, and balance must be unmasked in checklist block."""
        account = _make_account(
            account_number="SB-987-654321",
            account_type="Current",
            branch="Mumbai Fort",
            status="Active",
            current_balance=500_000.0,
        )
        customer = _make_customer(accounts=[account])
        block = _build_account_block(customer)
        assert "Current" in block
        assert "Mumbai Fort" in block
        assert "Active" in block

    def test_no_accounts_returns_placeholder_in_checklist(self):
        """Customer with no accounts must return 'no accounts on file'."""
        customer = _make_customer(accounts=[])
        block = _build_account_block(customer)
        assert "no accounts on file" in block

    def test_none_customer_returns_placeholder_in_checklist(self):
        """None customer must return 'no accounts on file'."""
        block = _build_account_block(None)
        assert "no accounts on file" in block
