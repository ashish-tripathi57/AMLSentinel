"""SAR Draft Generation Service.

Uses Claude to generate a five-section Suspicious Activity Report (SAR)
draft from the alert's investigation data and persists it via SARDraftRepository.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from api.models.investigation import SARDraft
from api.repositories.alert import AlertRepository
from api.repositories.customer import CustomerRepository
from api.repositories.investigation import (
    InvestigationNoteRepository,
    SARDraftRepository,
)
from api.repositories.transaction import TransactionRepository
from api.services.ai_client import ai_client

SYSTEM_PROMPT = (
    "You are a compliance officer drafting a Suspicious Activity Report (SAR) "
    "for a financial institution. "
    "Write in formal, regulatory-compliant language suitable for submission to FinCEN. "
    "Respond with valid JSON only — no markdown fences, no extra text. "
    "The JSON must contain exactly five string keys: "
    '"subject_info", "activity_description", "narrative", '
    '"reason_for_suspicion", "action_taken".'
)


async def generate_sar_draft(alert_id: str, session: AsyncSession) -> SARDraft:
    """Generate a new SAR draft for an alert and save it to the database.

    Fetches the alert, customer, flagged transactions, and any existing analyst
    notes, then instructs Claude to produce a five-section SAR narrative.
    The resulting draft is versioned (existing draft count + 1).

    Args:
        alert_id: UUID of the alert for which the SAR is being drafted.
        session: Active async database session.

    Returns:
        The newly created SARDraft ORM instance.

    Raises:
        ValueError: When the alert or customer is not found, or the model returns
                    non-JSON output.
        GeminiAPIError: When the Gemini API call fails.
    """
    alert_repo = AlertRepository(session)
    alert = await alert_repo.get_by_id(alert_id)
    if alert is None:
        raise ValueError(f"Alert '{alert_id}' not found")

    customer_repo = CustomerRepository(session)
    customer = await customer_repo.get_by_id(alert.customer_id)
    if customer is None:
        raise ValueError(f"Customer for alert '{alert_id}' not found")

    txn_repo = TransactionRepository(session)
    transactions = await txn_repo.get_by_alert(alert_id)

    note_repo = InvestigationNoteRepository(session)
    notes = await note_repo.get_by_alert(alert_id)

    txn_lines = [
        f"  - {t.transaction_date} | {t.transaction_type} | {t.direction} | "
        f"${t.amount:,.2f} | counterparty: {t.counterparty_name or 'N/A'}"
        for t in transactions
    ]
    txn_block = "\n".join(txn_lines) if txn_lines else "  (no flagged transactions)"

    notes_block = (
        "\n".join(f"  - {n.content}" for n in notes)
        if notes
        else "  (no analyst notes)"
    )

    accounts = customer.accounts if hasattr(customer, "accounts") else []
    account_lines = [
        f"  - {acc.account_number} ({acc.account_type})" for acc in accounts
    ]
    account_block = "\n".join(account_lines) if account_lines else "  (no accounts)"

    user_message = (
        "Please generate a SAR draft for the following alert:\n\n"
        f"Alert Reference: {alert.alert_id}\n"
        f"Typology: {alert.typology}\n"
        f"Risk Score: {alert.risk_score}/100\n"
        f"Alert Status: {alert.status}\n"
        f"Description: {alert.description or 'N/A'}\n\n"
        "SUBJECT INFORMATION:\n"
        f"  Name: {customer.full_name}\n"
        f"  Risk Category: {customer.risk_category}\n"
        f"  Customer ID: {customer.id}\n"
        f"  Accounts:\n{account_block}\n\n"
        f"FLAGGED TRANSACTIONS ({len(transactions)} total):\n{txn_block}\n\n"
        f"ANALYST NOTES:\n{notes_block}\n\n"
        "Generate the five SAR sections as JSON: "
        '"subject_info", "activity_description", "narrative", '
        '"reason_for_suspicion", "action_taken".'
    )

    # SAR narratives are lengthy (5 sections); increase token limit to avoid truncation.
    sections = await ai_client.generate_json(SYSTEM_PROMPT, user_message, max_tokens=8192)

    sar_repo = SARDraftRepository(session)
    draft = await sar_repo.create(
        alert_id=alert_id,
        generated_by="ai",
        subject_info=sections.get("subject_info"),
        activity_description=sections.get("activity_description"),
        narrative=sections.get("narrative"),
        reason_for_suspicion=sections.get("reason_for_suspicion"),
        action_taken=sections.get("action_taken"),
    )

    return draft
