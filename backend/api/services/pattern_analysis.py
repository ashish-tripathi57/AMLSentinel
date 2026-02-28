"""Pattern Analysis Service.

Uses the Claude AI client to identify suspicious transaction patterns,
risk indicators, and generate an investigation summary for a given alert.
"""

import json

from sqlalchemy.ext.asyncio import AsyncSession

from api.repositories.alert import AlertRepository
from api.repositories.customer import CustomerRepository
from api.repositories.transaction import TransactionRepository
from api.services.ai_client import ai_client

SYSTEM_PROMPT = (
    "You are an expert AML (Anti-Money Laundering) analyst. "
    "Your job is to analyse transaction data and identify suspicious patterns. "
    "Always respond with valid JSON only — no explanations, no markdown fences. "
    "The JSON must have exactly three keys: "
    '"patterns" (array of strings), '
    '"risk_indicators" (array of strings), '
    '"summary" (string).'
)


async def analyze_patterns(alert_id: str, session: AsyncSession) -> dict:
    """Identify suspicious patterns in the transactions linked to an alert.

    Fetches the alert, its customer, and its flagged transactions, then asks
    Claude to return a structured analysis with patterns, risk indicators,
    and a plain-language summary.

    Args:
        alert_id: UUID of the alert to analyse.
        session: Active async database session.

    Returns:
        dict with keys:
          - patterns: list[str] — suspicious behavioural patterns observed.
          - risk_indicators: list[str] — specific red-flag data points.
          - summary: str — concise narrative explanation.

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

    # Build a concise transaction summary to keep the prompt focused.
    txn_lines = [
        f"  - {t.transaction_date} | {t.transaction_type} | {t.direction} | "
        f"${t.amount:,.2f} | counterparty: {t.counterparty_name or 'N/A'}"
        for t in transactions
    ]
    txn_block = "\n".join(txn_lines) if txn_lines else "  (no flagged transactions)"

    user_message = (
        f"Alert ID: {alert.alert_id}\n"
        f"Typology: {alert.typology}\n"
        f"Risk Score: {alert.risk_score}\n"
        f"Description: {alert.description or 'N/A'}\n\n"
        f"Customer: {customer.full_name} (risk category: {customer.risk_category})\n\n"
        f"Flagged Transactions ({len(transactions)} total):\n"
        f"{txn_block}\n\n"
        "Analyse the above and return JSON with 'patterns', 'risk_indicators', and 'summary'."
    )

    result = await ai_client.generate_json(SYSTEM_PROMPT, user_message)

    # Ensure the expected keys are present; default to empty values if missing.
    return {
        "patterns": result.get("patterns", []),
        "risk_indicators": result.get("risk_indicators", []),
        "summary": result.get("summary", ""),
    }
