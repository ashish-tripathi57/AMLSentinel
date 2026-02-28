"""Import all models so SQLAlchemy registers them for relationship resolution."""

from api.models.base import Base
from api.models.customer import Customer
from api.models.account import Account
from api.models.transaction import Transaction
from api.models.alert import Alert, alert_transactions
from api.models.investigation import (
    AuditTrailEntry,
    ChatMessage,
    ChecklistItem,
    InvestigationNote,
    SARDraft,
)

__all__ = [
    "Base",
    "Customer",
    "Account",
    "Transaction",
    "Alert",
    "alert_transactions",
    "InvestigationNote",
    "ChecklistItem",
    "ChatMessage",
    "SARDraft",
    "AuditTrailEntry",
]
