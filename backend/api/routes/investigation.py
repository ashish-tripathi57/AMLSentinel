"""Investigation API routes.

Provides the per-alert investigation sub-resources used by the analyst
workbench: customer profile, transaction timeline, network graph, notes,
checklist, and audit trail.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from api.core.database import get_async_session
from api.repositories.alert import AlertRepository
from api.repositories.customer import CustomerRepository
from api.repositories.investigation import (
    AuditTrailRepository,
    ChecklistRepository,
    ChatMessageRepository,  # noqa: F401 — imported for completeness
    InvestigationNoteRepository,
    SARDraftRepository,  # noqa: F401 — imported for completeness
)
from api.repositories.transaction import TransactionRepository
from api.schemas.account import AccountResponse
from api.schemas.customer import CustomerResponse
from api.schemas.investigation import (
    AuditTrailEntryResponse,
    ChecklistItemResponse,
    InvestigationNoteCreate,
    InvestigationNoteResponse,
    SimilarCaseResponse,
)
from api.schemas.transaction import TransactionResponse
from api.services.ai_client import GeminiAPIError
from api.services.case_file_generator import generate_case_file_pdf
from api.services.checklist_ai import auto_check_item
from api.services.similar_cases import find_similar_cases

router = APIRouter(prefix="/api/alerts/{alert_id}", tags=["investigation"])


# ---------------------------------------------------------------------------
# Local response models
# ---------------------------------------------------------------------------


class CustomerWithAccountsResponse(CustomerResponse):
    """CustomerResponse extended with the customer's bank accounts."""

    accounts: list[AccountResponse] = []


class NetworkNode(BaseModel):
    """A node in the transaction network graph."""

    id: str
    label: str
    type: str  # "customer", "account", or "counterparty"
    risk: str | None = None


class NetworkEdge(BaseModel):
    """A directed edge (transaction) in the network graph."""

    source: str
    target: str
    amount: float
    type: str
    date: str
    direction: str = ""
    counterparty: str = ""


class NetworkGraphResponse(BaseModel):
    """Complete network graph payload for the investigation workbench."""

    nodes: list[NetworkNode]
    edges: list[NetworkEdge]


class ChecklistPatchBody(BaseModel):
    """Request body for patching a single checklist item."""

    is_checked: bool
    checked_by: str
    ai_rationale: str | None = None


class AutoCheckResponse(BaseModel):
    """Response from AI auto-check of a checklist item."""

    is_checked: bool
    rationale: str


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


async def _get_alert_or_404(alert_id: str, session: AsyncSession):
    """Fetch an alert by UUID or raise HTTP 404."""
    alert_repo = AlertRepository(session)
    alert = await alert_repo.get_by_id(alert_id)
    if alert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert '{alert_id}' not found",
        )
    return alert


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/customer", response_model=CustomerWithAccountsResponse)
async def get_customer_profile(
    alert_id: UUID,
    session: AsyncSession = Depends(get_async_session),
) -> CustomerWithAccountsResponse:
    """Return the customer profile (with accounts) linked to this alert."""
    alert = await _get_alert_or_404(str(alert_id), session)

    customer_repo = CustomerRepository(session)
    customer = await customer_repo.get_by_id(alert.customer_id)
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer for alert '{alert_id}' not found",
        )

    accounts = [AccountResponse.model_validate(acc) for acc in customer.accounts]
    return CustomerWithAccountsResponse(
        **CustomerResponse.model_validate(customer).model_dump(),
        accounts=accounts,
    )


@router.get("/transactions", response_model=list[TransactionResponse])
async def get_transaction_timeline(
    alert_id: UUID,
    session: AsyncSession = Depends(get_async_session),
) -> list[TransactionResponse]:
    """Return all transactions linked to this alert.

    Combines flagged transactions (via the alert_transactions junction) and
    all account transactions for the alert's customer to give a complete
    timeline view.
    """
    alert = await _get_alert_or_404(str(alert_id), session)

    txn_repo = TransactionRepository(session)
    flagged = await txn_repo.get_by_alert(str(alert_id))
    all_customer_txns = await txn_repo.get_all_for_customer_alerts(alert.customer_id)

    # Merge: flagged first, then remaining customer transactions (de-duplicated by id)
    seen_ids: set[str] = {t.id for t in flagged}
    merged = list(flagged)
    for txn in all_customer_txns:
        if txn.id not in seen_ids:
            seen_ids.add(txn.id)
            merged.append(txn)

    return [TransactionResponse.model_validate(t) for t in merged]


@router.get("/network", response_model=NetworkGraphResponse)
async def get_network_graph(
    alert_id: UUID,
    session: AsyncSession = Depends(get_async_session),
) -> NetworkGraphResponse:
    """Build a network graph from the alert's transactions.

    Nodes represent the customer, their accounts, and external counterparties.
    Edges represent individual transactions between them.
    """
    alert = await _get_alert_or_404(str(alert_id), session)

    customer_repo = CustomerRepository(session)
    customer = await customer_repo.get_by_id(alert.customer_id)
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer for alert '{alert_id}' not found",
        )

    txn_repo = TransactionRepository(session)
    transactions = await txn_repo.get_by_alert(str(alert_id))

    nodes: dict[str, NetworkNode] = {}
    edges: list[NetworkEdge] = []

    # Account nodes (only those that appear in flagged transactions).
    # The customer node is intentionally omitted — the investigation view
    # is already scoped to this customer, so the account serves as the
    # central hub of the graph.
    account_ids_in_txns: set[str] = {t.account_id for t in transactions}
    for account in customer.accounts:
        if account.id in account_ids_in_txns:
            account_node_id = f"account:{account.id}"
            nodes[account_node_id] = NetworkNode(
                id=account_node_id,
                label=account.account_number,
                type="account",
                risk=None,
            )

    # Edges (transactions) and counterparty nodes
    for txn in transactions:
        account_node_id = f"account:{txn.account_id}"

        # Ensure the account node exists even if not in customer.accounts list
        if account_node_id not in nodes:
            nodes[account_node_id] = NetworkNode(
                id=account_node_id,
                label=txn.account_id,
                type="account",
                risk=None,
            )

        # Counterparty node (use counterparty_account as id, fall back to name)
        counterparty_key = txn.counterparty_account or txn.counterparty_name or "unknown"
        counterparty_node_id = f"counterparty:{counterparty_key}"
        if counterparty_node_id not in nodes:
            nodes[counterparty_node_id] = NetworkNode(
                id=counterparty_node_id,
                label=txn.counterparty_name or counterparty_key,
                type="counterparty",
                risk=None,
            )

        # Direction determines which node is source/target
        if txn.direction == "credit":
            source_id = counterparty_node_id
            target_id = account_node_id
        else:
            source_id = account_node_id
            target_id = counterparty_node_id

        edges.append(
            NetworkEdge(
                source=source_id,
                target=target_id,
                amount=txn.amount,
                type=txn.transaction_type,
                date=txn.transaction_date,
                direction=txn.direction,
                counterparty=txn.counterparty_name or counterparty_key,
            )
        )

    return NetworkGraphResponse(nodes=list(nodes.values()), edges=edges)


@router.get("/notes", response_model=list[InvestigationNoteResponse])
async def list_investigation_notes(
    alert_id: UUID,
    session: AsyncSession = Depends(get_async_session),
) -> list[InvestigationNoteResponse]:
    """Return all investigation notes for this alert, newest first."""
    await _get_alert_or_404(str(alert_id), session)

    note_repo = InvestigationNoteRepository(session)
    notes = await note_repo.get_by_alert(str(alert_id))
    return [InvestigationNoteResponse.model_validate(n) for n in notes]


@router.post("/notes", response_model=InvestigationNoteResponse, status_code=status.HTTP_201_CREATED)
async def create_investigation_note(
    alert_id: UUID,
    body: InvestigationNoteCreate,
    analyst_username: str = Query(..., description="Username of the analyst creating the note"),
    session: AsyncSession = Depends(get_async_session),
) -> InvestigationNoteResponse:
    """Add a new analyst note to this alert's investigation."""
    await _get_alert_or_404(str(alert_id), session)

    note_repo = InvestigationNoteRepository(session)
    note = await note_repo.create(
        alert_id=str(alert_id),
        analyst_username=analyst_username,
        content=body.content,
    )
    return InvestigationNoteResponse.model_validate(note)


@router.get("/checklist", response_model=list[ChecklistItemResponse])
async def list_checklist_items(
    alert_id: UUID,
    session: AsyncSession = Depends(get_async_session),
) -> list[ChecklistItemResponse]:
    """Return the ordered checklist for this alert's investigation."""
    await _get_alert_or_404(str(alert_id), session)

    checklist_repo = ChecklistRepository(session)
    items = await checklist_repo.get_by_alert(str(alert_id))
    return [ChecklistItemResponse.model_validate(item) for item in items]


@router.patch("/checklist/{item_id}", response_model=ChecklistItemResponse)
async def update_checklist_item(
    alert_id: UUID,
    item_id: str,
    body: ChecklistPatchBody,
    session: AsyncSession = Depends(get_async_session),
) -> ChecklistItemResponse:
    """Toggle or update a single checklist item's checked state."""
    await _get_alert_or_404(str(alert_id), session)

    checklist_repo = ChecklistRepository(session)
    updated = await checklist_repo.update_check(
        item_id=item_id,
        is_checked=body.is_checked,
        checked_by=body.checked_by,
        ai_rationale=body.ai_rationale,
    )
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Checklist item '{item_id}' not found",
        )
    return ChecklistItemResponse.model_validate(updated)


@router.post("/checklist/{item_id}/auto-check", response_model=AutoCheckResponse)
async def auto_check_checklist_item(
    alert_id: UUID,
    item_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> AutoCheckResponse:
    """Run AI auto-check on a single checklist item.

    Evaluates whether the checklist condition is satisfied based on the
    alert's transaction data, then persists the AI verdict.
    """
    await _get_alert_or_404(str(alert_id), session)

    try:
        result = await auto_check_item(str(alert_id), item_id, session)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except GeminiAPIError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return AutoCheckResponse(**result)


@router.get("/audit-trail", response_model=list[AuditTrailEntryResponse])
async def get_audit_trail(
    alert_id: UUID,
    action: str | None = Query(default=None, description="Filter by action type"),
    session: AsyncSession = Depends(get_async_session),
) -> list[AuditTrailEntryResponse]:
    """Return the audit trail for this alert, optionally filtered by action type."""
    await _get_alert_or_404(str(alert_id), session)

    audit_repo = AuditTrailRepository(session)
    entries = await audit_repo.get_by_alert(str(alert_id), action=action)
    return [AuditTrailEntryResponse.model_validate(e) for e in entries]


@router.get("/similar-cases", response_model=list[SimilarCaseResponse])
async def get_similar_cases(
    alert_id: UUID,
    session: AsyncSession = Depends(get_async_session),
) -> list[SimilarCaseResponse]:
    """Return up to 5 alerts similar to this one, ranked by similarity score.

    Similarity is computed based on typology match, risk score proximity,
    flagged transaction amount similarity, and customer risk category.
    """
    await _get_alert_or_404(str(alert_id), session)

    cases = await find_similar_cases(str(alert_id), session)
    return [SimilarCaseResponse(**case) for case in cases]


@router.get("/case-file/pdf")
async def download_case_file_pdf(
    alert_id: UUID,
    session: AsyncSession = Depends(get_async_session),
) -> Response:
    """Download a comprehensive investigation case file as a PDF.

    The case file includes the cover page, customer profile, transaction
    summary, pattern analysis, checklist status, investigation notes,
    SAR narrative, and audit trail.

    Args:
        alert_id: UUID of the alert to generate the case file for.
        session: Injected async database session.

    Returns:
        PDF file as an application/pdf response with Content-Disposition header.

    Raises:
        HTTPException 404: When the alert or its customer does not exist.
    """
    try:
        pdf_bytes = await generate_case_file_pdf(str(alert_id), session)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    filename = f"CaseFile_{alert_id}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
