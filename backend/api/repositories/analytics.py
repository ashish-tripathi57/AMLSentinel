"""Async read-only repository for analytics aggregation queries."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.alert import Alert

# Risk-score bucket boundaries used by get_risk_score_distribution().
RISK_BUCKETS = [
    ("0-20", 0, 20),
    ("21-40", 21, 40),
    ("41-60", 41, 60),
    ("61-80", 61, 80),
    ("81-100", 81, 100),
]


class AnalyticsRepository:
    """Read-only analytics queries over the Alert table."""

    def __init__(self, session: AsyncSession):
        self.session = session

    # ------------------------------------------------------------------
    # Typology breakdown
    # ------------------------------------------------------------------

    async def get_alerts_by_typology(self) -> list[dict]:
        """Count alerts grouped by AML typology."""
        query = (
            select(Alert.typology, func.count().label("count"))
            .group_by(Alert.typology)
            .order_by(func.count().desc())
        )
        result = await self.session.execute(query)
        return [{"typology": row.typology, "count": row.count} for row in result.all()]

    # ------------------------------------------------------------------
    # Resolution breakdown (closed alerts only)
    # ------------------------------------------------------------------

    async def get_resolution_breakdown(self) -> list[dict]:
        """Count closed alerts grouped by resolution outcome."""
        query = (
            select(Alert.resolution, func.count().label("count"))
            .where(Alert.status == "Closed")
            .where(Alert.resolution.isnot(None))
            .group_by(Alert.resolution)
            .order_by(func.count().desc())
        )
        result = await self.session.execute(query)
        return [{"resolution": row.resolution, "count": row.count} for row in result.all()]

    # ------------------------------------------------------------------
    # Average investigation time
    # ------------------------------------------------------------------

    async def get_average_investigation_time(self) -> dict:
        """Compute average days between created_at and closed_at for closed alerts.

        ``closed_at`` is stored as an ISO-8601 string. We parse it in Python
        because SQLite does not natively support datetime arithmetic on strings
        with timezone offsets.
        """
        query = select(Alert.created_at, Alert.closed_at).where(
            Alert.status == "Closed",
            Alert.closed_at.isnot(None),
        )
        result = await self.session.execute(query)
        rows = result.all()

        if not rows:
            return {"average_days": 0.0}

        total_days = 0.0
        valid_count = 0
        for row in rows:
            created = row.created_at
            try:
                closed = datetime.fromisoformat(row.closed_at)
            except (ValueError, TypeError):
                continue

            # Ensure both datetimes are timezone-aware for subtraction
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            if closed.tzinfo is None:
                closed = closed.replace(tzinfo=timezone.utc)

            delta = closed - created
            total_days += max(delta.total_seconds() / 86400, 0.0)
            valid_count += 1

        average = round(total_days / valid_count, 2) if valid_count > 0 else 0.0
        return {"average_days": average}

    # ------------------------------------------------------------------
    # Risk-score distribution
    # ------------------------------------------------------------------

    async def get_risk_score_distribution(self) -> list[dict]:
        """Bucket alerts into 5 risk-score ranges and return counts.

        Always returns all 5 buckets, even if a bucket count is zero.
        """
        bucket_case = case(
            *[
                (
                    (Alert.risk_score >= low) & (Alert.risk_score <= high),
                    label,
                )
                for label, low, high in RISK_BUCKETS
            ],
            else_="unknown",
        ).label("bucket")

        query = (
            select(bucket_case, func.count().label("count"))
            .group_by(bucket_case)
        )
        result = await self.session.execute(query)
        db_map = {row.bucket: row.count for row in result.all()}

        return [
            {"range": label, "count": db_map.get(label, 0)}
            for label, _low, _high in RISK_BUCKETS
        ]

    # ------------------------------------------------------------------
    # Alert volume trend (daily)
    # ------------------------------------------------------------------

    async def get_alert_volume_trend(self, days: int = 30) -> list[dict]:
        """Daily alert counts for the last *days* days based on triggered_date."""
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
        date_col = func.date(Alert.triggered_date).label("date")

        query = (
            select(date_col, func.count().label("count"))
            .where(Alert.triggered_date >= cutoff)
            .group_by(date_col)
            .order_by(date_col.asc())
        )
        result = await self.session.execute(query)
        return [{"date": row.date, "count": row.count} for row in result.all()]

    # ------------------------------------------------------------------
    # False-positive trend (weekly)
    # ------------------------------------------------------------------

    async def get_false_positive_trend(self, days: int = 90) -> list[dict]:
        """Weekly false-positive rates for closed alerts.

        For each ISO week, computes total closed alerts and those resolved
        as "No Suspicion" (the false-positive indicator).
        """
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

        query = select(Alert.closed_at, Alert.resolution).where(
            Alert.status == "Closed",
            Alert.closed_at.isnot(None),
            Alert.closed_at >= cutoff,
        )
        result = await self.session.execute(query)
        rows = result.all()

        if not rows:
            return []

        # Aggregate by ISO week
        weekly: dict[str, dict] = {}
        for row in rows:
            try:
                closed_dt = datetime.fromisoformat(row.closed_at)
            except (ValueError, TypeError):
                continue
            iso_year, iso_week, _ = closed_dt.isocalendar()
            week_label = f"{iso_year}-W{iso_week:02d}"

            if week_label not in weekly:
                weekly[week_label] = {"total_closed": 0, "false_positive_count": 0}

            weekly[week_label]["total_closed"] += 1
            if row.resolution == "No Suspicion":
                weekly[week_label]["false_positive_count"] += 1

        trend = []
        for week_label in sorted(weekly):
            data = weekly[week_label]
            rate = (
                round(data["false_positive_count"] / data["total_closed"], 4)
                if data["total_closed"] > 0
                else 0.0
            )
            trend.append(
                {
                    "week": week_label,
                    "total_closed": data["total_closed"],
                    "false_positive_count": data["false_positive_count"],
                    "rate": rate,
                }
            )
        return trend
