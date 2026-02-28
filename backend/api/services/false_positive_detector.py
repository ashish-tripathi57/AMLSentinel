"""False positive detection service for AML alerts.

Analyzes alerts using AI to identify potential false positives based on:
  - Risk score vs actual transaction patterns
  - Customer profile consistency
  - Typology match quality

When GEMINI_API_KEY is not configured, returns a heuristic-based placeholder
result so the endpoint remains functional in test and development environments.
"""

import json
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.core.config import settings
from api.models.alert import Alert

logger = logging.getLogger(__name__)


async def _build_alert_context(alert: Alert) -> str:
    """Build a textual summary of an alert for AI analysis."""
    transactions_summary = ""
    if alert.flagged_transactions:
        transaction_lines = []
        for txn in alert.flagged_transactions:
            transaction_lines.append(
                f"  - {txn.transaction_date} | {txn.direction} | "
                f"₹{txn.amount:,.2f} | {txn.channel or 'N/A'} | "
                f"{txn.counterparty_name or 'N/A'}"
            )
        transactions_summary = "\n".join(transaction_lines)

    customer_info = ""
    if alert.customer:
        customer = alert.customer
        customer_info = (
            f"Customer: {customer.full_name}\n"
            f"  Risk Category: {customer.risk_category}\n"
            f"  Occupation: {customer.occupation or 'N/A'}\n"
            f"  Declared Annual Income: ₹{customer.declared_annual_income:,.2f}"
            if customer.declared_annual_income
            else f"Customer: {customer.full_name}\n"
            f"  Risk Category: {customer.risk_category}\n"
            f"  Occupation: {customer.occupation or 'N/A'}\n"
            f"  Declared Annual Income: N/A"
        )

    return (
        f"Alert ID: {alert.alert_id}\n"
        f"Title: {alert.title}\n"
        f"Typology: {alert.typology}\n"
        f"Risk Score: {alert.risk_score}/100\n"
        f"Description: {alert.description or 'N/A'}\n"
        f"Total Flagged Amount: ₹{alert.total_flagged_amount:,.2f}"
        f" ({alert.flagged_transaction_count} transactions)\n"
        f"{customer_info}\n"
        f"Flagged Transactions:\n{transactions_summary or '  None'}"
    )


def _heuristic_false_positive_score(alert: Alert) -> dict:
    """Return a heuristic-based false positive assessment when AI is unavailable.

    Uses simple rules: low risk scores and few flagged transactions
    suggest higher false positive likelihood.
    """
    risk_score = alert.risk_score
    txn_count = alert.flagged_transaction_count

    # Lower risk scores and fewer transactions indicate higher false positive likelihood
    if risk_score < 40:
        confidence = 0.8
        reasoning = (
            f"Low risk score ({risk_score}/100) with {txn_count} flagged "
            f"transaction(s) suggests this alert may not warrant full investigation."
        )
        suggested_resolution = "No Suspicion"
    elif risk_score < 60:
        confidence = 0.5
        reasoning = (
            f"Moderate risk score ({risk_score}/100) with {txn_count} flagged "
            f"transaction(s). Manual review recommended to confirm legitimacy."
        )
        suggested_resolution = "No Suspicion"
    else:
        confidence = 0.2
        reasoning = (
            f"High risk score ({risk_score}/100) with {txn_count} flagged "
            f"transaction(s). Unlikely to be a false positive."
        )
        suggested_resolution = "Escalate"

    return {
        "alert_id": alert.id,
        "alert_short_id": alert.alert_id,
        "title": alert.title,
        "confidence": confidence,
        "reasoning": reasoning,
        "suggested_resolution": suggested_resolution,
    }


async def detect_false_positives(
    alert_ids: list[str], session: AsyncSession
) -> list[dict]:
    """Analyze alerts for false positive indicators.

    Fetches each alert with its customer and transactions, then uses
    the Gemini AI client to assess false positive likelihood. Falls back
    to a heuristic-based assessment when GEMINI_API_KEY is not configured.

    Args:
        alert_ids: UUIDs of alerts to analyze.
        session: Active async database session.

    Returns:
        List of result dicts, one per successfully fetched alert.
    """
    # Fetch all requested alerts with related data
    result = await session.execute(
        select(Alert)
        .options(selectinload(Alert.customer), selectinload(Alert.flagged_transactions))
        .where(Alert.id.in_(alert_ids))
    )
    alerts = list(result.scalars().all())

    has_api_key = bool(settings.GEMINI_API_KEY)

    if has_api_key:
        return await _ai_based_detection(alerts)

    # Fallback: heuristic-based analysis
    return [_heuristic_false_positive_score(alert) for alert in alerts]


async def _ai_based_detection(alerts: list[Alert]) -> list[dict]:
    """Use the Gemini AI client to assess false positive likelihood for each alert."""
    from api.services.ai_client import ai_client

    system_prompt = (
        "You are an AML (Anti-Money Laundering) compliance analyst AI. "
        "Analyze the following alert and assess the likelihood that it is a false positive. "
        "Consider: risk score relative to actual transaction patterns, customer profile "
        "consistency, typology match quality, and transaction amounts relative to "
        "declared income.\n\n"
        "Respond with ONLY a JSON object with these fields:\n"
        '  "confidence": float between 0.0 and 1.0 (how likely this is a false positive),\n'
        '  "reasoning": string explaining your assessment,\n'
        '  "suggested_resolution": one of "No Suspicion", "Escalate", "SAR Filed"\n'
    )

    results = []
    for alert in alerts:
        try:
            alert_context = await _build_alert_context(alert)
            ai_response = await ai_client.generate_json(
                system_prompt=system_prompt,
                user_message=alert_context,
            )
            results.append({
                "alert_id": alert.id,
                "alert_short_id": alert.alert_id,
                "title": alert.title,
                "confidence": float(ai_response.get("confidence", 0.5)),
                "reasoning": ai_response.get("reasoning", "AI analysis completed."),
                "suggested_resolution": ai_response.get(
                    "suggested_resolution", "No Suspicion"
                ),
            })
        except Exception:
            logger.warning(
                "AI analysis failed for alert %s, falling back to heuristic",
                alert.alert_id,
                exc_info=True,
            )
            results.append(_heuristic_false_positive_score(alert))

    return results
