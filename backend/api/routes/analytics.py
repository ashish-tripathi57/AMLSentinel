"""FastAPI routes for the analytics dashboard."""

import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.core.database import get_async_session
from api.models.alert import Alert
from api.repositories.analytics import AnalyticsRepository
from api.schemas.analytics import (
    AlertVolumeTrend,
    AnalyticsOverview,
    FalsePositiveTrend,
    ResolutionBreakdown,
    RiskScoreBucket,
    TypologyBreakdown,
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/overview", response_model=AnalyticsOverview)
async def get_overview(
    session: AsyncSession = Depends(get_async_session),
) -> AnalyticsOverview:
    """Return high-level summary statistics for the analytics dashboard."""
    total_result = await session.execute(select(func.count(Alert.id)))
    total_alerts = total_result.scalar_one()

    open_result = await session.execute(
        select(func.count(Alert.id)).where(Alert.status.in_(["New", "In Progress", "Review"]))
    )
    open_alerts = open_result.scalar_one()

    closed_result = await session.execute(
        select(func.count(Alert.id)).where(Alert.status == "Closed")
    )
    closed_alerts = closed_result.scalar_one()

    repo = AnalyticsRepository(session)
    avg_time = await repo.get_average_investigation_time()

    # False-positive rate: fraction of closed alerts resolved as "No Suspicion"
    false_positive_rate = 0.0
    if closed_alerts > 0:
        fp_result = await session.execute(
            select(func.count(Alert.id)).where(
                Alert.status == "Closed",
                Alert.resolution == "No Suspicion",
            )
        )
        fp_count = fp_result.scalar_one()
        false_positive_rate = round(fp_count / closed_alerts, 4)

    return AnalyticsOverview(
        total_alerts=total_alerts,
        open_alerts=open_alerts,
        closed_alerts=closed_alerts,
        average_investigation_days=avg_time["average_days"],
        false_positive_rate=false_positive_rate,
    )


@router.get("/alerts-by-typology", response_model=list[TypologyBreakdown])
async def get_alerts_by_typology(
    session: AsyncSession = Depends(get_async_session),
) -> list[TypologyBreakdown]:
    """Return alert counts grouped by AML typology."""
    repo = AnalyticsRepository(session)
    data = await repo.get_alerts_by_typology()
    return [TypologyBreakdown(**item) for item in data]


@router.get("/resolution-breakdown", response_model=list[ResolutionBreakdown])
async def get_resolution_breakdown(
    session: AsyncSession = Depends(get_async_session),
) -> list[ResolutionBreakdown]:
    """Return closed-alert counts grouped by resolution outcome."""
    repo = AnalyticsRepository(session)
    data = await repo.get_resolution_breakdown()
    return [ResolutionBreakdown(**item) for item in data]


@router.get("/risk-distribution", response_model=list[RiskScoreBucket])
async def get_risk_distribution(
    session: AsyncSession = Depends(get_async_session),
) -> list[RiskScoreBucket]:
    """Return alert counts bucketed by risk-score ranges."""
    repo = AnalyticsRepository(session)
    data = await repo.get_risk_score_distribution()
    return [RiskScoreBucket(**item) for item in data]


@router.get("/alert-volume-trend", response_model=list[AlertVolumeTrend])
async def get_alert_volume_trend(
    days: int = Query(default=30, ge=1, le=365, description="Number of days to look back"),
    session: AsyncSession = Depends(get_async_session),
) -> list[AlertVolumeTrend]:
    """Return daily alert counts for the last N days."""
    repo = AnalyticsRepository(session)
    data = await repo.get_alert_volume_trend(days=days)
    return [AlertVolumeTrend(**item) for item in data]


@router.get("/false-positive-trend", response_model=list[FalsePositiveTrend])
async def get_false_positive_trend(
    days: int = Query(default=90, ge=1, le=365, description="Number of days to look back"),
    session: AsyncSession = Depends(get_async_session),
) -> list[FalsePositiveTrend]:
    """Return weekly false-positive rates for closed alerts."""
    repo = AnalyticsRepository(session)
    data = await repo.get_false_positive_trend(days=days)
    return [FalsePositiveTrend(**item) for item in data]


# ---------------------------------------------------------------------------
# CSV Export
# ---------------------------------------------------------------------------


@router.get("/export/csv")
async def export_analytics_csv(
    session: AsyncSession = Depends(get_async_session),
) -> Response:
    """Export all analytics data as a downloadable CSV file.

    The CSV is organised into four labelled sections:
      1. Typology Breakdown
      2. Resolution Breakdown
      3. Risk Score Distribution
      4. Overview Statistics

    Returns:
        A text/csv response with Content-Disposition attachment header.
    """
    repo = AnalyticsRepository(session)

    typology_data = await repo.get_alerts_by_typology()
    resolution_data = await repo.get_resolution_breakdown()
    risk_data = await repo.get_risk_score_distribution()
    avg_time = await repo.get_average_investigation_time()

    # Compute overview stats (mirrors the /overview endpoint logic)
    total_result = await session.execute(select(func.count(Alert.id)))
    total_alerts = total_result.scalar_one()

    open_result = await session.execute(
        select(func.count(Alert.id)).where(
            Alert.status.in_(["New", "In Progress", "Review"])
        )
    )
    open_alerts = open_result.scalar_one()

    closed_result = await session.execute(
        select(func.count(Alert.id)).where(Alert.status == "Closed")
    )
    closed_alerts = closed_result.scalar_one()

    false_positive_rate = 0.0
    if closed_alerts > 0:
        fp_result = await session.execute(
            select(func.count(Alert.id)).where(
                Alert.status == "Closed",
                Alert.resolution == "No Suspicion",
            )
        )
        fp_count = fp_result.scalar_one()
        false_positive_rate = round(fp_count / closed_alerts, 4)

    # Build CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Section 1: Typology Breakdown
    writer.writerow(["Typology Breakdown"])
    writer.writerow(["Typology", "Count"])
    for item in typology_data:
        writer.writerow([item["typology"], item["count"]])
    writer.writerow([])

    # Section 2: Resolution Breakdown
    writer.writerow(["Resolution Breakdown"])
    writer.writerow(["Resolution", "Count"])
    for item in resolution_data:
        writer.writerow([item["resolution"], item["count"]])
    writer.writerow([])

    # Section 3: Risk Score Distribution
    writer.writerow(["Risk Score Distribution"])
    writer.writerow(["Range", "Count"])
    for item in risk_data:
        writer.writerow([item["range"], item["count"]])
    writer.writerow([])

    # Section 4: Overview Statistics
    writer.writerow(["Overview Statistics"])
    writer.writerow(["Metric", "Value"])
    writer.writerow(["Total Alerts", total_alerts])
    writer.writerow(["Open Alerts", open_alerts])
    writer.writerow(["Closed Alerts", closed_alerts])
    writer.writerow(["Average Investigation Days", avg_time["average_days"]])
    writer.writerow(["False Positive Rate", false_positive_rate])

    csv_content = output.getvalue()
    generated_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filename = f"aml_sentinel_analytics_{generated_date}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
