from pydantic import BaseModel


class AlertBase(BaseModel):
    """Shared alert fields."""

    alert_id: str
    typology: str
    risk_score: int
    status: str = "New"
    title: str
    description: str | None = None
    triggered_date: str
    assigned_analyst: str | None = None
    resolution: str | None = None
    closed_at: str | None = None
    total_flagged_amount: float | None = None
    flagged_transaction_count: int = 0


class AlertListItem(AlertBase):
    """Alert data for the queue list view."""

    id: str
    customer_id: str

    model_config = {"from_attributes": True}


class AlertDetail(AlertBase):
    """Full alert data for the investigation view."""

    id: str
    customer_id: str

    model_config = {"from_attributes": True}


class AlertStatusUpdate(BaseModel):
    """Request body for status transitions."""

    status: str
    rationale: str
    resolution: str | None = None


class BulkCloseRequest(BaseModel):
    """Request body for bulk closing alerts."""

    alert_ids: list[str]
    resolution: str
    rationale: str


class BulkCloseResponse(BaseModel):
    """Response for bulk close operation."""

    closed_count: int
    failed_ids: list[str]


class FalsePositiveResult(BaseModel):
    """AI assessment result for a single alert."""

    alert_id: str
    alert_short_id: str
    title: str
    confidence: float
    reasoning: str
    suggested_resolution: str


class FalsePositiveDetectionResponse(BaseModel):
    """Response for false positive detection."""

    results: list[FalsePositiveResult]
    total_analyzed: int
