"""SAR (Suspicious Activity Report) endpoints.

Provides endpoints for generating AI-drafted SARs, listing all draft versions,
applying manual analyst edits to a saved draft, and bulk exporting STR PDFs
as a ZIP archive.
"""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from api.core.database import get_async_session
from api.repositories.alert import AlertRepository
from api.repositories.investigation import SARDraftRepository
from api.schemas.investigation import SARDraftResponse, SARDraftUpdate
from api.services.ai_client import GeminiAPIError
from api.services.bulk_export import generate_bulk_sar_zip
from api.services.fiu_ind_generator import generate_str_pdf
from api.services.pdf_generator import generate_sar_pdf
from api.services.sar_generator import generate_sar_draft

router = APIRouter(prefix="/api/alerts/{alert_id}", tags=["sar"])
bulk_router = APIRouter(prefix="/api/sar", tags=["sar"])


class BulkExportRequest(BaseModel):
    """Request body for the bulk SAR/STR export endpoint."""

    alert_ids: list[str]


async def _get_alert_or_404(alert_id: str, session: AsyncSession):
    """Return the alert or raise HTTP 404 if it does not exist."""
    alert = await AlertRepository(session).get_by_id(alert_id)
    if alert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert '{alert_id}' not found",
        )
    return alert


@router.post("/sar/generate", response_model=SARDraftResponse, status_code=status.HTTP_201_CREATED)
async def generate_sar(
    alert_id: UUID,
    session: AsyncSession = Depends(get_async_session),
) -> SARDraftResponse:
    """Generate a new AI-drafted SAR for this alert.

    Each call creates a new versioned draft (v1, v2, …).  The draft is
    persisted automatically and returned in the response body.

    Args:
        alert_id: UUID of the alert to report on.
        session: Injected async database session.

    Returns:
        The newly created SARDraftResponse.

    Raises:
        HTTPException 404: When the alert or its customer does not exist.
        HTTPException 502: When the AI service fails unexpectedly.
    """
    try:  # pragma: no cover — AI-dependent, tested with RUN_REAL_API_TESTS=1
        draft = await generate_sar_draft(str(alert_id), session)
    except ValueError as exc:  # pragma: no cover
        msg = str(exc)
        if "not valid JSON" in msg:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=msg) from exc
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg) from exc
    except GeminiAPIError as exc:  # pragma: no cover
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    return SARDraftResponse.model_validate(draft)  # pragma: no cover


@router.get("/sar", response_model=list[SARDraftResponse])
async def list_sar_drafts(
    alert_id: UUID,
    session: AsyncSession = Depends(get_async_session),
) -> list[SARDraftResponse]:
    """List all SAR drafts for this alert, newest version first.

    Args:
        alert_id: UUID of the alert.
        session: Injected async database session.

    Returns:
        Ordered list of SARDraftResponse objects (most recent version first).

    Raises:
        HTTPException 404: When the alert does not exist.
    """
    await _get_alert_or_404(str(alert_id), session)
    sar_repo = SARDraftRepository(session)
    drafts = await sar_repo.get_by_alert(str(alert_id))
    return [SARDraftResponse.model_validate(d) for d in drafts]


@router.patch("/sar/{draft_id}", response_model=SARDraftResponse)
async def update_sar_draft(
    alert_id: UUID,
    draft_id: str,
    body: SARDraftUpdate,
    session: AsyncSession = Depends(get_async_session),
) -> SARDraftResponse:
    """Apply manual analyst edits to an existing SAR draft.

    Only fields included in the request body are updated; omitted fields
    retain their current values.

    Args:
        alert_id: UUID of the parent alert (used for ownership validation).
        draft_id: UUID of the SAR draft to update.
        body: Partial update containing only the sections to change.
        session: Injected async database session.

    Returns:
        The updated SARDraftResponse.

    Raises:
        HTTPException 404: When the alert or draft does not exist.
    """
    await _get_alert_or_404(str(alert_id), session)

    sar_repo = SARDraftRepository(session)
    updated = await sar_repo.update(
        draft_id=draft_id,
        **body.model_dump(exclude_none=True),
    )
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SAR draft '{draft_id}' not found",
        )
    return SARDraftResponse.model_validate(updated)


@router.get("/sar/{draft_id}/pdf")
async def download_sar_pdf(
    alert_id: UUID,
    draft_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> Response:
    """Download a SAR draft as a formatted PDF document.

    Args:
        alert_id: UUID of the parent alert.
        draft_id: UUID of the SAR draft to export.
        session: Injected async database session.

    Returns:
        PDF file as an application/pdf response with Content-Disposition header.

    Raises:
        HTTPException 404: When the alert or SAR draft does not exist.
    """
    await _get_alert_or_404(str(alert_id), session)

    sar_repo = SARDraftRepository(session)
    draft = await sar_repo.get_by_id(draft_id)
    if draft is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SAR draft '{draft_id}' not found",
        )

    pdf_bytes = generate_sar_pdf(draft, str(alert_id))
    filename = f"SAR_{alert_id}_v{draft.version}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/str/pdf")
async def download_str_pdf(
    alert_id: UUID,
    session: AsyncSession = Depends(get_async_session),
) -> Response:
    """Download a FIU-IND Suspicious Transaction Report as a PDF.

    Args:
        alert_id: UUID of the alert to generate the STR for.
        session: Injected async database session.

    Returns:
        PDF file as an application/pdf response with Content-Disposition header.

    Raises:
        HTTPException 404: When the alert or its customer does not exist.
    """
    try:
        pdf_bytes = await generate_str_pdf(str(alert_id), session)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    filename = f"STR_{alert_id}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------------------------------------------------------------------------
# Bulk SAR/STR export (separate router, no {alert_id} prefix)
# ---------------------------------------------------------------------------


@bulk_router.post("/bulk-export")
async def bulk_export_sar(
    body: BulkExportRequest,
    session: AsyncSession = Depends(get_async_session),
) -> Response:
    """Export multiple STR PDFs as a single ZIP archive.

    Invalid or non-existent alert IDs are silently skipped.

    Args:
        body: JSON body containing a list of alert IDs.
        session: Injected async database session.

    Returns:
        ZIP file as an application/zip response with Content-Disposition header.
    """
    zip_bytes = await generate_bulk_sar_zip(body.alert_ids, session)
    generated_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filename = f"bulk_str_export_{generated_date}.zip"

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
