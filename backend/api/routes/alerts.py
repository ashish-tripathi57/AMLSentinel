from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.core.database import get_async_session
from api.repositories.alert import AlertRepository
from api.repositories.investigation import AuditTrailRepository
from api.schemas.alert import (
    AlertDetail,
    AlertListItem,
    AlertStatusUpdate,
    BulkCloseRequest,
    BulkCloseResponse,
    FalsePositiveDetectionResponse,
    FalsePositiveResult,
)
from api.services.false_positive_detector import detect_false_positives

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=dict)
async def list_alerts(
    typology: str | None = Query(default=None, description="Filter by AML typology"),
    status: str | None = Query(default=None, description="Filter by alert status"),
    risk_min: int | None = Query(default=None, ge=0, le=100, description="Minimum risk score (inclusive)"),
    risk_max: int | None = Query(default=None, ge=0, le=100, description="Maximum risk score (inclusive)"),
    search: str | None = Query(default=None, description="Full-text search across title, alert_id, description"),
    resolution: str | None = Query(default=None, description="Filter by resolution outcome"),
    assigned_analyst: str | None = Query(default=None, description="Filter by assigned analyst"),
    sort_by: str = Query(default="triggered_date", description="Column to sort by"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$", description="Sort direction"),
    offset: int = Query(default=0, ge=0, description="Pagination offset"),
    limit: int = Query(default=20, ge=1, le=100, description="Page size"),
    session: AsyncSession = Depends(get_async_session),
) -> dict:
    """Return a paginated, filterable list of alerts for the queue view."""
    repo = AlertRepository(session)
    alerts, total = await repo.get_all(
        typology=typology,
        status=status,
        risk_min=risk_min,
        risk_max=risk_max,
        search=search,
        resolution=resolution,
        assigned_analyst=assigned_analyst,
        sort_by=sort_by,
        sort_order=sort_order,
        offset=offset,
        limit=limit,
    )
    return {
        "alerts": [AlertListItem.model_validate(a) for a in alerts],
        "total": total,
    }


@router.get("/stats", response_model=dict)
async def get_alert_stats(
    session: AsyncSession = Depends(get_async_session),
) -> dict:
    """Return summary statistics for the alert queue dashboard."""
    repo = AlertRepository(session)
    return await repo.get_stats()


@router.post("/bulk-close", response_model=BulkCloseResponse)
async def bulk_close_alerts(
    body: BulkCloseRequest,
    analyst_username: str = Query(..., description="Username of the analyst performing the bulk close"),
    session: AsyncSession = Depends(get_async_session),
) -> BulkCloseResponse:
    """Close multiple alerts in a single operation.

    Creates audit trail entries for each successfully closed alert.
    Returns the count of closed alerts and a list of any alert IDs
    that could not be found or updated.
    """
    alert_repo = AlertRepository(session)
    audit_repo = AuditTrailRepository(session)

    closed_count, failed_ids = await alert_repo.bulk_update_status(
        alert_ids=body.alert_ids,
        status="Closed",
        analyst=analyst_username,
        resolution=body.resolution,
    )

    # Create audit trail entries for each successfully closed alert
    successfully_closed_ids = [aid for aid in body.alert_ids if aid not in failed_ids]
    for alert_id in successfully_closed_ids:
        audit_details = (
            f"Status changed to 'Closed' via bulk close. "
            f"Rationale: {body.rationale}. Resolution: {body.resolution}"
        )
        await audit_repo.create(
            alert_id=alert_id,
            action="bulk_close",
            performed_by=analyst_username,
            details=audit_details,
        )

    return BulkCloseResponse(closed_count=closed_count, failed_ids=failed_ids)


@router.post("/detect-false-positives", response_model=FalsePositiveDetectionResponse)
async def detect_false_positives_endpoint(
    body: dict,
    session: AsyncSession = Depends(get_async_session),
) -> FalsePositiveDetectionResponse:
    """Analyze alerts for false positive indicators using AI.

    Accepts a JSON body with an ``alert_ids`` list and returns an AI-driven
    assessment of each alert's false positive likelihood, including confidence
    scores and reasoning.
    """
    alert_ids: list[str] = body.get("alert_ids", [])
    if not alert_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="alert_ids list is required and must not be empty",
        )

    results = await detect_false_positives(alert_ids, session)

    return FalsePositiveDetectionResponse(
        results=[FalsePositiveResult(**r) for r in results],
        total_analyzed=len(results),
    )


@router.get("/by-alert-id/{alert_id}", response_model=AlertDetail)
async def get_alert_by_short_id(
    alert_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> AlertDetail:
    """Fetch an alert by its short identifier (e.g. 'S1', 'G2')."""
    repo = AlertRepository(session)
    alert = await repo.get_by_alert_id(alert_id)
    if alert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with alert_id '{alert_id}' not found",
        )
    return AlertDetail.model_validate(alert)


@router.get("/{alert_uuid}", response_model=AlertDetail)
async def get_alert_by_uuid(
    alert_uuid: UUID,
    session: AsyncSession = Depends(get_async_session),
) -> AlertDetail:
    """Fetch full alert detail by its UUID primary key."""
    repo = AlertRepository(session)
    alert = await repo.get_by_id(str(alert_uuid))
    if alert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert '{alert_uuid}' not found",
        )
    return AlertDetail.model_validate(alert)


@router.patch("/{alert_uuid}/status", response_model=AlertDetail)
async def update_alert_status(
    alert_uuid: UUID,
    body: AlertStatusUpdate,
    analyst_username: str = Query(..., description="Username of the analyst performing the action"),
    session: AsyncSession = Depends(get_async_session),
) -> AlertDetail:
    """Transition an alert's status and record an audit trail entry.

    The ``analyst_username`` query parameter identifies who performed the
    action — it is recorded in both the alert's ``assigned_analyst`` field
    and the audit trail.
    """
    alert_repo = AlertRepository(session)
    audit_repo = AuditTrailRepository(session)

    updated_alert = await alert_repo.update_status(
        alert_uuid=str(alert_uuid),
        status=body.status,
        analyst=analyst_username,
        resolution=body.resolution,
    )
    if updated_alert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert '{alert_uuid}' not found",
        )

    audit_details = f"Status changed to '{body.status}'. Rationale: {body.rationale}"
    if body.resolution:
        audit_details += f". Resolution: {body.resolution}"
    await audit_repo.create(
        alert_id=str(alert_uuid),
        action="status_update",
        performed_by=analyst_username,
        details=audit_details,
    )

    return AlertDetail.model_validate(updated_alert)
