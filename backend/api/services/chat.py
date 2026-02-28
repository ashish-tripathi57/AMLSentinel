"""Investigation Chat Service.

Provides a streaming AI chat assistant for alert investigations.
Conversation history is persisted so the analyst can resume across sessions.
"""

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession

from api.repositories.alert import AlertRepository
from api.repositories.customer import CustomerRepository
from api.repositories.investigation import ChatMessageRepository
from api.repositories.transaction import TransactionRepository
from api.services.ai_client import ai_client


def _build_customer_block(customer) -> str:
    """Build a comprehensive customer profile block for the AI prompt."""
    if not customer:
        return "Customer: (not found)"

    lines = [
        f"Full Name: {customer.full_name}",
        f"Date of Birth: {customer.date_of_birth or 'N/A'}",
        f"Nationality: {customer.nationality or 'N/A'}",
        f"Occupation: {customer.occupation or 'N/A'}",
        f"Employer: {customer.employer or 'N/A'}",
        f"Declared Annual Income: ₹{customer.declared_annual_income:,.0f}" if customer.declared_annual_income else "Declared Annual Income: N/A",
        f"Risk Category: {customer.risk_category}",
        f"PEP Status: {'Yes' if customer.pep_status else 'No'}",
        f"Previous Alert Count: {customer.previous_alert_count}",
        f"Customer Since: {customer.customer_since or 'N/A'}",
        f"ID: {customer.id_type or 'N/A'} — {customer.id_number or 'N/A'}",
        f"Address: {customer.address or 'N/A'}",
        f"Phone: {customer.phone or 'N/A'}",
        f"Email: {customer.email or 'N/A'}",
        f"KYC Verification Date: {customer.kyc_verification_date or 'N/A'}",
        f"KYC Last Update: {customer.kyc_last_update_date or 'N/A'}",
        f"Income Verification Notes: {customer.income_verification_notes or 'N/A'}",
    ]
    return "\n".join(lines)


def _build_accounts_block(customer) -> str:
    """Build a bank accounts block from the customer's accounts relationship."""
    if not customer or not customer.accounts:
        return "  (no bank accounts)"

    lines = []
    for acc in customer.accounts:
        lines.append(
            f"  - {acc.account_number} | {acc.account_type} | {acc.branch or 'N/A'} | "
            f"Status: {acc.status} | Balance: ₹{acc.current_balance:,.0f} | "
            f"Opened: {acc.opening_date or 'N/A'}"
        )
    return "\n".join(lines)


def _build_network_block(customer, transactions) -> str:
    """Build a network graph summary from flagged transactions.

    Summarises the counterparties connected to the customer's accounts,
    with total credit/debit amounts per counterparty — mirroring the
    visual network graph shown on the investigation page.
    """
    if not transactions:
        return "  (no transaction network)"

    # Build account label lookup
    account_labels: dict[str, str] = {}
    if customer and customer.accounts:
        for acc in customer.accounts:
            account_labels[acc.id] = acc.account_number

    # Aggregate flows per counterparty
    counterparty_flows: dict[str, dict] = {}
    for txn in transactions:
        cpty = txn.counterparty_name or "Unknown"
        if cpty not in counterparty_flows:
            counterparty_flows[cpty] = {
                "credit_total": 0.0,
                "debit_total": 0.0,
                "credit_count": 0,
                "debit_count": 0,
                "accounts": set(),
            }
        entry = counterparty_flows[cpty]
        acc_label = account_labels.get(txn.account_id, txn.account_id)
        entry["accounts"].add(acc_label)
        if txn.direction == "credit":
            entry["credit_total"] += txn.amount
            entry["credit_count"] += 1
        else:
            entry["debit_total"] += txn.amount
            entry["debit_count"] += 1

    lines = []
    for cpty, flows in counterparty_flows.items():
        parts = []
        if flows["credit_count"]:
            parts.append(f"{flows['credit_count']} inflows totaling ₹{flows['credit_total']:,.0f}")
        if flows["debit_count"]:
            parts.append(f"{flows['debit_count']} outflows totaling ₹{flows['debit_total']:,.0f}")
        via_accounts = ", ".join(sorted(flows["accounts"]))
        lines.append(f"  - {cpty}: {'; '.join(parts)} (via {via_accounts})")

    return "\n".join(lines)


def _build_system_prompt(alert, customer, transactions, chat_history) -> str:
    """Compose the system prompt from the current investigation context.

    Includes the full customer profile, bank accounts, flagged transactions,
    and conversation history so the AI can answer about any data visible
    on the investigation page.

    Args:
        alert: Alert ORM model.
        customer: Customer ORM model (may be None).
        transactions: List of Transaction ORM models.
        chat_history: List of ChatMessage ORM models (prior conversation turns).

    Returns:
        Formatted system prompt string for the AI.
    """
    customer_block = _build_customer_block(customer)
    accounts_block = _build_accounts_block(customer)
    network_block = _build_network_block(customer, transactions)

    txn_lines = [
        f"  - {t.transaction_date} | {t.transaction_type} | {t.direction} | "
        f"₹{t.amount:,.0f} | counterparty: {t.counterparty_name or 'N/A'}"
        for t in transactions
    ]
    txn_block = "\n".join(txn_lines) if txn_lines else "  (no flagged transactions)"

    history_lines = [
        f"{msg.role.upper()}: {msg.content}" for msg in chat_history
    ]
    history_block = (
        "\n".join(history_lines) if history_lines else "(no prior messages)"
    )

    return (
        "You are an expert AML investigation assistant helping a financial crime analyst "
        "investigate a suspicious activity alert. "
        "Answer questions clearly and concisely using the investigation context below. "
        "Reference specific data points (account numbers, amounts, dates) when relevant. "
        "Do not invent data; if something is unknown say so.\n\n"
        "=== ALERT DETAILS ===\n"
        f"Alert ID: {alert.alert_id}\n"
        f"Title: {alert.title}\n"
        f"Typology: {alert.typology}\n"
        f"Risk Score: {alert.risk_score}/100\n"
        f"Status: {alert.status}\n"
        f"Description: {alert.description or 'N/A'}\n\n"
        "=== CUSTOMER PROFILE ===\n"
        f"{customer_block}\n\n"
        f"=== BANK ACCOUNTS ({len(customer.accounts) if customer and customer.accounts else 0}) ===\n"
        f"{accounts_block}\n\n"
        f"=== FLAGGED TRANSACTIONS ({len(transactions)} total) ===\n"
        f"{txn_block}\n\n"
        "=== TRANSACTION NETWORK (counterparty flow summary) ===\n"
        f"{network_block}\n\n"
        "=== CONVERSATION HISTORY ===\n"
        f"{history_block}\n"
        "=== END OF CONTEXT ==="
    )


async def get_chat_response(
    alert_id: str,
    user_message: str,
    analyst_username: str,
    session: AsyncSession,
) -> AsyncIterator[str]:
    """Stream a Claude response to the analyst's message in an alert investigation.

    Steps:
    1. Fetch alert context (alert, customer, transactions, existing chat history).
    2. Persist the user's message.
    3. Stream Claude's reply chunk-by-chunk.
    4. Persist the full assistant response once streaming is complete.

    Args:
        alert_id: UUID of the alert being investigated.
        user_message: The analyst's question or instruction.
        analyst_username: Username of the analyst sending the message.
        session: Active async database session.

    Yields:
        Incremental text chunks from Claude (suitable for SSE forwarding).

    Raises:
        ValueError: When the alert is not found.
        GeminiAPIError: When the Gemini API call fails.
    """
    alert_repo = AlertRepository(session)
    alert = await alert_repo.get_by_id(alert_id)
    if alert is None:
        raise ValueError(f"Alert '{alert_id}' not found")

    customer_repo = CustomerRepository(session)
    customer = await customer_repo.get_by_id(alert.customer_id)

    txn_repo = TransactionRepository(session)
    transactions = await txn_repo.get_by_alert(alert_id)

    chat_repo = ChatMessageRepository(session)
    chat_history = await chat_repo.get_by_alert(alert_id)

    system_prompt = _build_system_prompt(alert, customer, transactions, chat_history)

    # Persist user message before calling AI so it's recorded even if the stream fails.
    await chat_repo.create(
        alert_id=alert_id,
        role="user",
        content=user_message,
        analyst_username=analyst_username,
    )

    # Collect chunks while streaming so we can persist the full assistant reply.
    collected_chunks: list[str] = []

    async def _stream_and_collect() -> AsyncIterator[str]:
        async for chunk in ai_client.generate_streaming(system_prompt, user_message):
            collected_chunks.append(chunk)
            yield chunk

        # After the stream is exhausted, persist the complete assistant message.
        full_response = "".join(collected_chunks)
        await chat_repo.create(
            alert_id=alert_id,
            role="assistant",
            content=full_response,
            analyst_username=None,
        )

    return _stream_and_collect()
