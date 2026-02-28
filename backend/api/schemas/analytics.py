"""Pydantic response models for the analytics endpoints."""

from pydantic import BaseModel


class TypologyBreakdown(BaseModel):
    """Alert count grouped by AML typology."""

    typology: str
    count: int


class ResolutionBreakdown(BaseModel):
    """Closed-alert count grouped by resolution outcome."""

    resolution: str
    count: int


class AverageInvestigationTime(BaseModel):
    """Average number of days from alert creation to closure."""

    average_days: float


class RiskScoreBucket(BaseModel):
    """Alert count within a risk-score range (e.g. 0-20, 21-40)."""

    range: str
    count: int


class AlertVolumeTrend(BaseModel):
    """Daily alert count for trend analysis."""

    date: str
    count: int


class FalsePositiveTrend(BaseModel):
    """Weekly false-positive metrics for closed alerts."""

    week: str
    total_closed: int
    false_positive_count: int
    rate: float


class AnalyticsOverview(BaseModel):
    """High-level summary statistics for the analytics dashboard."""

    total_alerts: int
    open_alerts: int
    closed_alerts: int
    average_investigation_days: float
    false_positive_rate: float
