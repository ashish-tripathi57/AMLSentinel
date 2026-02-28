from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.models.alert import Alert


class AlertRepository:
    """Async CRUD operations for Alert entities."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_all(
        self,
        typology: str | None = None,
        status: str | None = None,
        risk_min: int | None = None,
        risk_max: int | None = None,
        search: str | None = None,
        resolution: str | None = None,
        assigned_analyst: str | None = None,
        sort_by: str = "triggered_date",
        sort_order: str = "desc",
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[Alert], int]:
        """Fetch alerts with optional filters, sorting, and pagination. Returns (alerts, total_count)."""
        query = select(Alert)

        if typology:
            query = query.where(Alert.typology == typology)
        if status:
            if "," in status:
                status_list = [s.strip() for s in status.split(",")]
                query = query.where(Alert.status.in_(status_list))
            else:
                query = query.where(Alert.status == status)
        if risk_min is not None:
            query = query.where(Alert.risk_score >= risk_min)
        if risk_max is not None:
            query = query.where(Alert.risk_score <= risk_max)
        if resolution:
            query = query.where(Alert.resolution == resolution)
        if assigned_analyst:
            if assigned_analyst == "__unassigned__":
                query = query.where(Alert.assigned_analyst.is_(None))
            else:
                query = query.where(Alert.assigned_analyst == assigned_analyst)
        if search:
            search_filter = f"%{search}%"
            query = query.where(
                (Alert.title.ilike(search_filter))
                | (Alert.alert_id.ilike(search_filter))
                | (Alert.description.ilike(search_filter))
            )

        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.session.execute(count_query)
        total_count = total_result.scalar_one()

        sort_column = getattr(Alert, sort_by, Alert.triggered_date)
        if sort_order == "asc":
            query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(sort_column.desc())

        query = query.offset(offset).limit(limit)
        result = await self.session.execute(query)
        alerts = list(result.scalars().all())
        return alerts, total_count

    async def get_by_id(self, alert_id: str) -> Alert | None:
        """Fetch a single alert by its UUID."""
        result = await self.session.execute(
            select(Alert)
            .options(selectinload(Alert.flagged_transactions))
            .where(Alert.id == alert_id)
        )
        return result.scalar_one_or_none()

    async def get_by_alert_id(self, alert_id: str) -> Alert | None:
        """Fetch a single alert by its short ID (e.g., 'S1')."""
        result = await self.session.execute(
            select(Alert)
            .options(selectinload(Alert.flagged_transactions))
            .where(Alert.alert_id == alert_id)
        )
        return result.scalar_one_or_none()

    async def update_status(
        self,
        alert_uuid: str,
        status: str,
        analyst: str,
        resolution: str | None = None,
    ) -> Alert | None:
        """Update an alert's status, assigned analyst, and optionally resolution."""
        alert = await self.get_by_id(alert_uuid)
        if alert:
            alert.status = status
            alert.assigned_analyst = analyst
            if status == "Closed" and resolution:
                alert.resolution = resolution
                alert.closed_at = datetime.now(timezone.utc).isoformat()
            await self.session.commit()
            await self.session.refresh(alert)
        return alert

    async def bulk_update_status(
        self,
        alert_ids: list[str],
        status: str,
        analyst: str,
        resolution: str | None = None,
    ) -> tuple[int, list[str]]:
        """Bulk update multiple alerts. Returns (success_count, failed_ids)."""
        success_count = 0
        failed_ids: list[str] = []
        for alert_id in alert_ids:
            updated = await self.update_status(alert_id, status, analyst, resolution)
            if updated is not None:
                success_count += 1
            else:
                failed_ids.append(alert_id)
        return success_count, failed_ids

    async def get_stats(self) -> dict:
        """Get summary statistics for the alert queue."""
        total = await self.session.execute(select(func.count(Alert.id)))
        open_statuses = ["New", "In Progress", "Review", "Escalated"]
        open_count = await self.session.execute(
            select(func.count(Alert.id)).where(Alert.status.in_(open_statuses))
        )
        high_risk = await self.session.execute(
            select(func.count(Alert.id)).where(Alert.risk_score >= 70)
        )
        closed_count = await self.session.execute(
            select(func.count(Alert.id)).where(Alert.status == "Closed")
        )
        unassigned_count = await self.session.execute(
            select(func.count(Alert.id)).where(
                Alert.assigned_analyst.is_(None),
                Alert.status.in_(open_statuses),
            )
        )
        return {
            "total_alerts": total.scalar_one(),
            "open_alerts": open_count.scalar_one(),
            "high_risk_count": high_risk.scalar_one(),
            "closed_count": closed_count.scalar_one(),
            "unassigned_count": unassigned_count.scalar_one(),
        }
