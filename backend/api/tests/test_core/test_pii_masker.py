"""Unit tests for the PII masking utility module.

Validates all masking functions handle normal cases, edge cases, and None
inputs per DPDP Act 2023 compliance requirements.
"""

import pytest

from api.core.pii_masker import (
    mask_account_for_ai,
    mask_account_number,
    mask_address,
    mask_customer_for_ai,
    mask_dob,
    mask_email,
    mask_id_number,
    mask_phone,
)


# ---------------------------------------------------------------------------
# mask_phone
# ---------------------------------------------------------------------------


class TestMaskPhone:
    """Tests for phone number masking — show last 4 digits only."""

    def test_indian_mobile_with_country_code(self) -> None:
        assert mask_phone("+91-9876-543210") == "+XX-XXXX-XX3210"

    def test_plain_ten_digit_number(self) -> None:
        assert mask_phone("9876543210") == "XXXXXX3210"

    def test_with_spaces(self) -> None:
        assert mask_phone("+91 98765 43210") == "+XX XXXXX X3210"

    def test_short_number_four_or_fewer_digits(self) -> None:
        assert mask_phone("1234") == "1234"

    def test_very_short_number(self) -> None:
        assert mask_phone("12") == "12"

    def test_none_returns_none(self) -> None:
        assert mask_phone(None) is None

    def test_empty_string(self) -> None:
        assert mask_phone("") == ""

    def test_landline_with_area_code(self) -> None:
        assert mask_phone("022-24567890") == "XXX-XXXX7890"


# ---------------------------------------------------------------------------
# mask_email
# ---------------------------------------------------------------------------


class TestMaskEmail:
    """Tests for email masking — show first char + domain."""

    def test_standard_email(self) -> None:
        assert mask_email("rajesh.sharma@email.com") == "r*****@email.com"

    def test_single_char_local(self) -> None:
        assert mask_email("a@b.com") == "a*****@b.com"

    def test_none_returns_none(self) -> None:
        assert mask_email(None) is None

    def test_no_at_sign(self) -> None:
        """Input without @ is returned as-is (defensive)."""
        assert mask_email("invalidemail") == "invalidemail"

    def test_email_with_subdomain(self) -> None:
        assert mask_email("user@mail.corp.com") == "u*****@mail.corp.com"

    def test_empty_string(self) -> None:
        assert mask_email("") == ""

    def test_uppercase_email(self) -> None:
        assert mask_email("User@Domain.COM") == "U*****@Domain.COM"


# ---------------------------------------------------------------------------
# mask_id_number
# ---------------------------------------------------------------------------


class TestMaskIdNumber:
    """Tests for ID number masking — show last 4 characters."""

    def test_pan_card(self) -> None:
        assert mask_id_number("ABCDE1234R") == "XXXXXX234R"

    def test_aadhaar_number(self) -> None:
        assert mask_id_number("123456789012") == "XXXXXXXX9012"

    def test_four_chars_or_fewer(self) -> None:
        assert mask_id_number("1234") == "1234"
        assert mask_id_number("AB") == "AB"

    def test_none_returns_none(self) -> None:
        assert mask_id_number(None) is None

    def test_passport(self) -> None:
        assert mask_id_number("J12345678") == "XXXXX5678"

    def test_empty_string(self) -> None:
        assert mask_id_number("") == ""


# ---------------------------------------------------------------------------
# mask_address
# ---------------------------------------------------------------------------


class TestMaskAddress:
    """Tests for address masking — show city/state only."""

    def test_three_part_address(self) -> None:
        assert mask_address("42 MG Road, Surat, Gujarat") == "******, Surat, Gujarat"

    def test_four_part_address(self) -> None:
        result = mask_address("Flat 301, MG Road, Surat, Gujarat")
        assert result == "******, Surat, Gujarat"

    def test_two_parts_kept_as_is(self) -> None:
        assert mask_address("Surat, Gujarat") == "Surat, Gujarat"

    def test_single_part_masked(self) -> None:
        assert mask_address("Some Address") == "******"

    def test_none_returns_none(self) -> None:
        assert mask_address(None) is None

    def test_five_part_address(self) -> None:
        result = mask_address("Apt 5, Floor 3, 42 MG Road, Surat, Gujarat")
        assert result == "******, Surat, Gujarat"

    def test_empty_string(self) -> None:
        assert mask_address("") == "******"


# ---------------------------------------------------------------------------
# mask_dob
# ---------------------------------------------------------------------------


class TestMaskDob:
    """Tests for DOB masking — fully mask all digits."""

    def test_iso_format(self) -> None:
        assert mask_dob("1985-03-15") == "XXXX-XX-XX"

    def test_slash_format(self) -> None:
        assert mask_dob("15/03/1985") == "XX/XX/XXXX"

    def test_none_returns_none(self) -> None:
        assert mask_dob(None) is None

    def test_empty_string(self) -> None:
        assert mask_dob("") == ""

    def test_full_datetime(self) -> None:
        assert mask_dob("1985-03-15T00:00:00") == "XXXX-XX-XXTXX:XX:XX"


# ---------------------------------------------------------------------------
# mask_account_number
# ---------------------------------------------------------------------------


class TestMaskAccountNumber:
    """Tests for account number masking — show last 4, preserve separators."""

    def test_hyphenated_account(self) -> None:
        assert mask_account_number("ACC-123-456789") == "XXX-XXX-XX6789"

    def test_plain_numeric(self) -> None:
        assert mask_account_number("1234567890") == "XXXXXX7890"

    def test_four_or_fewer_chars(self) -> None:
        assert mask_account_number("1234") == "1234"

    def test_none_returns_none(self) -> None:
        assert mask_account_number(None) is None

    def test_with_spaces(self) -> None:
        assert mask_account_number("1234 5678 9012") == "XXXX XXXX 9012"

    def test_alphanumeric_prefix(self) -> None:
        assert mask_account_number("SB-00123456") == "XX-XXXX3456"

    def test_empty_string(self) -> None:
        assert mask_account_number("") == ""

    def test_short_three_chars(self) -> None:
        assert mask_account_number("ABC") == "ABC"


# ---------------------------------------------------------------------------
# mask_customer_for_ai
# ---------------------------------------------------------------------------


class TestMaskCustomerForAi:
    """Tests for the convenience wrapper that masks customer PII fields."""

    def test_masks_all_pii_fields(self) -> None:
        class FakeCustomer:
            date_of_birth = "1990-01-15"
            id_number = "ABCDE1234R"
            address = "42 MG Road, Surat, Gujarat"
            phone = "+91-9876-543210"
            email = "test@example.com"

        result = mask_customer_for_ai(FakeCustomer())
        assert result["date_of_birth"] == "XXXX-XX-XX"
        assert result["id_number"] == "XXXXXX234R"
        assert result["address"] == "******, Surat, Gujarat"
        assert result["phone"] == "+XX-XXXX-XX3210"
        assert result["email"] == "t*****@example.com"

    def test_handles_none_fields(self) -> None:
        class FakeCustomer:
            date_of_birth = None
            id_number = None
            address = None
            phone = None
            email = None

        result = mask_customer_for_ai(FakeCustomer())
        assert result["date_of_birth"] is None
        assert result["id_number"] is None
        assert result["address"] is None
        assert result["phone"] is None
        assert result["email"] is None

    def test_handles_missing_attributes(self) -> None:
        """Object with no PII attributes should return all None values."""

        class EmptyObj:
            pass

        result = mask_customer_for_ai(EmptyObj())
        assert all(v is None for v in result.values())


# ---------------------------------------------------------------------------
# mask_account_for_ai
# ---------------------------------------------------------------------------


class TestMaskAccountForAi:
    """Tests for the convenience wrapper that masks account number."""

    def test_masks_account_number(self) -> None:
        class FakeAccount:
            account_number = "SB-00123456"

        result = mask_account_for_ai(FakeAccount())
        assert result["account_number"] == "XX-XXXX3456"

    def test_none_account_number(self) -> None:
        class FakeAccount:
            account_number = None

        result = mask_account_for_ai(FakeAccount())
        assert result["account_number"] is None

    def test_missing_attribute(self) -> None:
        class EmptyObj:
            pass

        result = mask_account_for_ai(EmptyObj())
        assert result["account_number"] is None
