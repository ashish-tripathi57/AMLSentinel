from datetime import datetime

from pydantic import BaseModel


class InvestigationNoteBase(BaseModel):
    content: str

class InvestigationNoteResponse(InvestigationNoteBase):
    id: str
    alert_id: str
    analyst_username: str
    created_at: datetime
    model_config = {"from_attributes": True}

class InvestigationNoteCreate(InvestigationNoteBase):
    pass


class ChecklistItemResponse(BaseModel):
    id: str
    alert_id: str
    description: str
    is_checked: bool
    checked_by: str | None = None
    ai_rationale: str | None = None
    sort_order: int
    model_config = {"from_attributes": True}


class ChatMessageBase(BaseModel):
    content: str

class ChatMessageResponse(BaseModel):
    id: str
    alert_id: str
    role: str
    content: str
    analyst_username: str | None = None
    created_at: datetime
    model_config = {"from_attributes": True}

class ChatRequest(ChatMessageBase):
    pass


class SARDraftResponse(BaseModel):
    id: str
    alert_id: str
    version: int
    subject_info: str | None = None
    activity_description: str | None = None
    narrative: str | None = None
    reason_for_suspicion: str | None = None
    action_taken: str | None = None
    generated_by: str
    created_at: datetime
    model_config = {"from_attributes": True}

class SARDraftUpdate(BaseModel):
    subject_info: str | None = None
    activity_description: str | None = None
    narrative: str | None = None
    reason_for_suspicion: str | None = None
    action_taken: str | None = None


class AuditTrailEntryResponse(BaseModel):
    id: str
    alert_id: str
    action: str
    details: str | None = None
    performed_by: str
    created_at: datetime
    model_config = {"from_attributes": True}


class SimilarCaseResponse(BaseModel):
    """A case similar to the target alert, with a computed similarity score."""

    id: str
    alert_id: str
    title: str
    typology: str
    risk_score: int
    status: str
    resolution: str | None = None
    similarity_score: int
    matching_factors: list[str]
    model_config = {"from_attributes": True}
