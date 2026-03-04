"""PII Masking utilities for DPDP Act 2023 compliance.

Provides pure functions to mask Personally Identifiable Information (PII)
before it leaves the backend — whether to the frontend API, external AI
services (Gemini), or internal case file PDFs.

Masking rules:
  - Phone: show last 4 digits → +91-XXXX-XX3210
  - Email: show first char + domain → r*****@email.com
  - ID Number: show last 4 chars → XXXXXX234R
  - Address: show city/state only → ******, Surat, Gujarat
  - DOB: fully masked → XXXX-XX-XX
  - Account Number: show last 4, preserve hyphens → XXX-XXX-X00001
  - Full Name: NOT masked (needed for investigation)
  - Counterparty Name: NOT masked (needed for analysis)
"""

import re


def mask_phone(phone: str | None) -> str | None:
    """Mask a phone number, showing only the last 4 digits.

    Examples:
        "+91-9876-543210" → "+91-XXXX-XX3210"
        "9876543210"      → "XXXXXX3210"
        None              → None
    """
    if phone is None:
        return None

    digits = re.sub(r"\D", "", phone)
    if len(digits) <= 4:
        return phone

    last_four = digits[-4:]

    # Reconstruct with the original format but mask non-last-4 digits
    result = []
    digit_index = 0
    total_digits = len(digits)
    unmask_start = total_digits - 4

    for char in phone:
        if char.isdigit():
            if digit_index < unmask_start:
                result.append("X")
            else:
                result.append(char)
            digit_index += 1
        else:
            result.append(char)

    return "".join(result)


def mask_email(email: str | None) -> str | None:
    """Mask an email address, showing first char and domain.

    Examples:
        "rajesh.sharma@email.com" → "r*****@email.com"
        "a@b.com"                 → "a*****@b.com"
        None                      → None
    """
    if email is None:
        return None

    at_index = email.find("@")
    if at_index < 0:
        return email

    local_part = email[:at_index]
    domain = email[at_index:]

    if len(local_part) == 0:
        return email

    first_char = local_part[0]
    return f"{first_char}*****{domain}"


def mask_id_number(id_number: str | None) -> str | None:
    """Mask an ID number (PAN, Aadhaar, passport), showing last 4 chars.

    Examples:
        "ABCDE1234R" → "XXXXXX234R"
        "1234"       → "1234"
        None         → None
    """
    if id_number is None:
        return None

    if len(id_number) <= 4:
        return id_number

    masked_length = len(id_number) - 4
    return "X" * masked_length + id_number[-4:]


def mask_address(address: str | None) -> str | None:
    """Mask an address, showing only city/state (last two comma-separated parts).

    Examples:
        "42 MG Road, Surat, Gujarat" → "******, Surat, Gujarat"
        "Surat, Gujarat"             → "Surat, Gujarat"
        "Single Address"             → "******"
        None                         → None
    """
    if address is None:
        return None

    parts = [p.strip() for p in address.split(",")]

    if len(parts) <= 2:
        # Two parts or fewer — treat as city/state already, show as-is
        if len(parts) == 1:
            return "******"
        return ", ".join(parts)

    # Mask all parts except the last two (city, state)
    city_state = ", ".join(parts[-2:])
    return f"******, {city_state}"


def mask_dob(dob: str | None) -> str | None:
    """Fully mask a date of birth.

    Examples:
        "1985-03-15" → "XXXX-XX-XX"
        "15/03/1985" → "XX/XX/XXXX"
        None         → None
    """
    if dob is None:
        return None

    return re.sub(r"\d", "X", dob)


def mask_account_number(account_number: str | None) -> str | None:
    """Mask an account number, showing last 4 digits, preserving hyphens/separators.

    Examples:
        "ACC-123-456789" → "XXX-XXX-XX6789"
        "1234567890"     → "XXXXXX7890"
        "1234"           → "1234"
        None             → None
    """
    if account_number is None:
        return None

    # Count only alphanumeric characters
    alnum_chars = [c for c in account_number if c.isalnum()]
    total_alnum = len(alnum_chars)

    if total_alnum <= 4:
        return account_number

    unmask_start = total_alnum - 4
    alnum_index = 0
    result = []

    for char in account_number:
        if char.isalnum():
            if alnum_index < unmask_start:
                result.append("X")
            else:
                result.append(char)
            alnum_index += 1
        else:
            # Preserve separators (hyphens, spaces, etc.)
            result.append(char)

    return "".join(result)


# ---------------------------------------------------------------------------
# Convenience wrappers for masking entire domain objects
# ---------------------------------------------------------------------------


def mask_customer_for_ai(customer) -> dict:
    """Return a dict of masked PII fields for a customer ORM object.

    Used when building AI prompt context blocks. Returns only the fields
    that need masking — callers merge this with unmasked fields (full_name,
    occupation, etc.) as needed.

    Args:
        customer: Customer ORM model instance.

    Returns:
        dict with masked values for: date_of_birth, id_number, address,
        phone, email.
    """
    return {
        "date_of_birth": mask_dob(getattr(customer, "date_of_birth", None)),
        "id_number": mask_id_number(getattr(customer, "id_number", None)),
        "address": mask_address(getattr(customer, "address", None)),
        "phone": mask_phone(getattr(customer, "phone", None)),
        "email": mask_email(getattr(customer, "email", None)),
    }


def mask_account_for_ai(account) -> dict:
    """Return a dict with the account_number masked.

    Args:
        account: Account ORM model instance.

    Returns:
        dict with masked account_number.
    """
    return {
        "account_number": mask_account_number(
            getattr(account, "account_number", None)
        ),
    }
