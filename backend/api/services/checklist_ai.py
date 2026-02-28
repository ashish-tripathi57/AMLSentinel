"""Checklist Auto-Check Service.

Uses the AI model to evaluate whether a specific investigation checklist
item's condition is satisfied based on the alert's transaction data and
full customer context, then persists the AI's verdict and rationale.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from api.repositories.alert import AlertRepository
from api.repositories.customer import CustomerRepository
from api.repositories.investigation import ChecklistRepository
from api.repositories.transaction import TransactionRepository
from api.services.ai_client import ai_client

SYSTEM_PROMPT = (
    "You are an expert AML compliance analyst working in an Indian bank. "
    "You will be given an investigation checklist item and detailed evidence "
    "from the alert including the customer's full profile (income, KYC dates, "
    "occupation, account history) and BOTH flagged AND historical transactions. "
    "Decide whether the checklist condition is met based solely on the evidence provided. "
    "Provide a specific, data-driven rationale referencing actual amounts, dates, and patterns. "
    "Respond with valid JSON only — no markdown, no extra text. "
    'The JSON must have exactly two keys: "is_checked" (boolean) and "rationale" (string).'
)


def _build_customer_profile_block(customer) -> str:
    """Build a detailed customer profile text block for the AI prompt."""
    if customer is None:
        return "Customer: unknown"

    income_str = f"₹{customer.declared_annual_income:,.0f}" if customer.declared_annual_income else "Not declared"
    kyc_verified = customer.kyc_verification_date or "Not on file"
    kyc_updated = customer.kyc_last_update_date or "Never updated"
    income_notes = customer.income_verification_notes or "No income verification documents on file"

    lines = [
        f"Name: {customer.full_name}",
        f"Risk Category: {customer.risk_category}",
        f"Occupation: {customer.occupation or 'Not stated'}",
        f"Employer: {customer.employer or 'Not stated'}",
        f"Declared Annual Income: {income_str}",
        f"Customer Since: {customer.customer_since or 'Unknown'}",
        f"ID Type: {customer.id_type or 'N/A'} | ID Number: {customer.id_number or 'N/A'}",
        f"KYC Verification Date: {kyc_verified}",
        f"KYC Last Updated: {kyc_updated}",
        f"Income Verification: {income_notes}",
        f"PEP Status: {'Yes' if customer.pep_status else 'No'}",
        f"Previous Alert Count: {customer.previous_alert_count}",
        f"Address: {customer.address or 'Not on file'}",
    ]
    return "\n".join(lines)


def _build_account_block(customer) -> str:
    """Build account details block from customer's accounts."""
    if customer is None or not customer.accounts:
        return "  (no accounts on file)"

    lines = []
    for acc in customer.accounts:
        lines.append(
            f"  - {acc.account_number} | {acc.account_type} | "
            f"Branch: {acc.branch or 'N/A'} | "
            f"Opened: {acc.opening_date or 'N/A'} | "
            f"Status: {acc.status} | "
            f"Balance: ₹{acc.current_balance:,.0f}"
        )
    return "\n".join(lines)


def _build_transaction_block(transactions: list, label: str) -> str:
    """Build a formatted transaction list block."""
    if not transactions:
        return f"  (no {label.lower()})"

    lines = []
    for t in transactions:
        lines.append(
            f"  - {t.transaction_date} | {t.transaction_type} | {t.direction} | "
            f"₹{t.amount:,.2f} | channel: {t.channel or 'N/A'} | "
            f"counterparty: {t.counterparty_name or 'N/A'} | "
            f"location: {t.location or 'N/A'}"
        )
    return "\n".join(lines)


async def auto_check_item(
    alert_id: str,
    item_id: str,
    session: AsyncSession,
) -> dict:
    """Evaluate a checklist item using AI and persist the result.

    Fetches the checklist item, the alert, its customer (with full profile
    and KYC details), all account transactions (historical + flagged), then
    asks the AI model whether the item's condition is satisfied.
    The verdict is written back to the database via ChecklistRepository.

    Args:
        alert_id: UUID of the alert owning the checklist item.
        item_id: UUID of the specific ChecklistItem to evaluate.
        session: Active async database session.

    Returns:
        dict with keys:
          - is_checked: bool — whether the item condition is met.
          - rationale: str — AI explanation.

    Raises:
        ValueError: When the alert, customer, or checklist item is not found,
                    or when the model returns non-JSON output.
        GeminiAPIError: When the AI API call fails.
    """
    alert_repo = AlertRepository(session)
    alert = await alert_repo.get_by_id(alert_id)
    if alert is None:
        raise ValueError(f"Alert '{alert_id}' not found")

    checklist_repo = ChecklistRepository(session)
    items = await checklist_repo.get_by_alert(alert_id)
    checklist_item = next((i for i in items if i.id == item_id), None)
    if checklist_item is None:
        raise ValueError(f"Checklist item '{item_id}' not found for alert '{alert_id}'")

    customer_repo = CustomerRepository(session)
    customer = await customer_repo.get_by_id(alert.customer_id)

    txn_repo = TransactionRepository(session)
    flagged_transactions = await txn_repo.get_by_alert(alert_id)

    # Fetch ALL customer transactions (historical + flagged) for full context
    all_transactions = await txn_repo.get_all_for_customer_alerts(alert.customer_id)
    flagged_ids = {t.id for t in flagged_transactions}
    historical_transactions = [t for t in all_transactions if t.id not in flagged_ids]

    customer_block = _build_customer_profile_block(customer)
    account_block = _build_account_block(customer)
    flagged_block = _build_transaction_block(flagged_transactions, "flagged transactions")
    historical_block = _build_transaction_block(historical_transactions, "historical transactions")

    user_message = (
        f"Checklist Item: {checklist_item.description}\n\n"
        f"Alert Details:\n"
        f"  Typology: {alert.typology}\n"
        f"  Risk Score: {alert.risk_score}\n"
        f"  Alert Description: {alert.description or 'N/A'}\n\n"
        f"Customer Profile:\n{customer_block}\n\n"
        f"Account(s):\n{account_block}\n\n"
        f"Flagged Transactions ({len(flagged_transactions)} total):\n{flagged_block}\n\n"
        f"Historical Transactions ({len(historical_transactions)} total — for baseline comparison):\n"
        f"{historical_block}\n\n"
        "Based solely on the evidence above, is the checklist condition met? "
        "Provide a specific, data-driven rationale citing actual transaction amounts, dates, "
        "income figures, and patterns observed. "
        'Return JSON with "is_checked" (true/false) and "rationale" (explanation).'
    )

    result = await ai_client.generate_json(SYSTEM_PROMPT, user_message)

    is_checked: bool = bool(result.get("is_checked", False))
    rationale: str = str(result.get("rationale", ""))

    # Persist the AI verdict so the analyst workbench reflects it immediately.
    await checklist_repo.update_check(
        item_id=item_id,
        is_checked=is_checked,
        checked_by="ai",
        ai_rationale=rationale,
    )

    return {"is_checked": is_checked, "rationale": rationale}
