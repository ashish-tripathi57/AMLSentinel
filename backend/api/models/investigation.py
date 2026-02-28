from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from api.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class InvestigationNote(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Analyst notes attached to an alert investigation."""

    __tablename__ = "investigation_notes"

    alert_id: Mapped[str] = mapped_column(String(36), ForeignKey("alerts.id"), nullable=False)
    analyst_username: Mapped[str] = mapped_column(String(100), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)


class ChecklistItem(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Investigation checklist item, per-typology template or custom."""

    __tablename__ = "checklist_items"

    alert_id: Mapped[str] = mapped_column(String(36), ForeignKey("alerts.id"), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    is_checked: Mapped[bool] = mapped_column(Boolean, default=False)
    checked_by: Mapped[str | None] = mapped_column(String(50), nullable=True)  # "ai" or "analyst"
    ai_rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class ChatMessage(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """AI chat message in an alert investigation conversation."""

    __tablename__ = "chat_messages"

    alert_id: Mapped[str] = mapped_column(String(36), ForeignKey("alerts.id"), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # "user" or "assistant"
    content: Mapped[str] = mapped_column(Text, nullable=False)
    analyst_username: Mapped[str | None] = mapped_column(String(100), nullable=True)


class SARDraft(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """SAR (Suspicious Activity Report) draft for an alert."""

    __tablename__ = "sar_drafts"

    alert_id: Mapped[str] = mapped_column(String(36), ForeignKey("alerts.id"), nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    subject_info: Mapped[str | None] = mapped_column(Text, nullable=True)
    activity_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    narrative: Mapped[str | None] = mapped_column(Text, nullable=True)
    reason_for_suspicion: Mapped[str | None] = mapped_column(Text, nullable=True)
    action_taken: Mapped[str | None] = mapped_column(Text, nullable=True)
    generated_by: Mapped[str] = mapped_column(String(50), default="ai")  # "ai" or "analyst"


class AuditTrailEntry(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Audit trail entry recording actions taken on an alert."""

    __tablename__ = "audit_trail_entries"

    alert_id: Mapped[str] = mapped_column(String(36), ForeignKey("alerts.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    performed_by: Mapped[str] = mapped_column(String(100), nullable=False)
