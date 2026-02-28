import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.alert import Alert
from api.models.customer import Customer
from api.models.investigation import (
    AuditTrailEntry,
    ChatMessage,
    ChecklistItem,
    InvestigationNote,
    SARDraft,
)


async def _create_alert(db_session: AsyncSession) -> Alert:
    """Helper to create a customer and alert for testing."""
    customer = Customer(full_name="Test Customer")
    db_session.add(customer)
    await db_session.flush()
    alert = Alert(
        alert_id="S1",
        customer_id=customer.id,
        typology="Structuring",
        risk_score=85,
        title="Test alert",
        triggered_date="2025-01-20",
    )
    db_session.add(alert)
    await db_session.flush()
    return alert


@pytest.mark.asyncio
async def test_investigation_note_create(db_session: AsyncSession):
    alert = await _create_alert(db_session)
    note = InvestigationNote(
        alert_id=alert.id,
        analyst_username="sarah.chen",
        content="Initial review of structuring pattern.",
    )
    db_session.add(note)
    await db_session.commit()

    result = await db_session.execute(
        select(InvestigationNote).where(InvestigationNote.alert_id == alert.id)
    )
    saved = result.scalar_one()
    assert saved.content == "Initial review of structuring pattern."
    assert saved.analyst_username == "sarah.chen"


@pytest.mark.asyncio
async def test_checklist_item_create(db_session: AsyncSession):
    alert = await _create_alert(db_session)
    item = ChecklistItem(
        alert_id=alert.id,
        description="Verify all transaction branches",
        is_checked=True,
        checked_by="ai",
        ai_rationale="All 5 transactions from same branch.",
        sort_order=1,
    )
    db_session.add(item)
    await db_session.commit()

    result = await db_session.execute(
        select(ChecklistItem).where(ChecklistItem.alert_id == alert.id)
    )
    saved = result.scalar_one()
    assert saved.is_checked is True
    assert saved.checked_by == "ai"


@pytest.mark.asyncio
async def test_chat_message_create(db_session: AsyncSession):
    alert = await _create_alert(db_session)
    msg = ChatMessage(
        alert_id=alert.id,
        role="user",
        content="Summarize this alert",
        analyst_username="sarah.chen",
    )
    db_session.add(msg)
    await db_session.commit()

    result = await db_session.execute(
        select(ChatMessage).where(ChatMessage.alert_id == alert.id)
    )
    saved = result.scalar_one()
    assert saved.role == "user"
    assert saved.content == "Summarize this alert"


@pytest.mark.asyncio
async def test_sar_draft_create(db_session: AsyncSession):
    alert = await _create_alert(db_session)
    sar = SARDraft(
        alert_id=alert.id,
        version=1,
        subject_info="Rajesh Kumar, Business Owner",
        narrative="Multiple cash deposits below threshold.",
        generated_by="ai",
    )
    db_session.add(sar)
    await db_session.commit()

    result = await db_session.execute(
        select(SARDraft).where(SARDraft.alert_id == alert.id)
    )
    saved = result.scalar_one()
    assert saved.version == 1
    assert saved.generated_by == "ai"


@pytest.mark.asyncio
async def test_audit_trail_entry_create(db_session: AsyncSession):
    alert = await _create_alert(db_session)
    entry = AuditTrailEntry(
        alert_id=alert.id,
        action="status_change",
        details="New -> In Progress",
        performed_by="sarah.chen",
    )
    db_session.add(entry)
    await db_session.commit()

    result = await db_session.execute(
        select(AuditTrailEntry).where(AuditTrailEntry.alert_id == alert.id)
    )
    saved = result.scalar_one()
    assert saved.action == "status_change"
    assert saved.performed_by == "sarah.chen"


from api.schemas.investigation import (
    AuditTrailEntryResponse,
    ChatMessageResponse,
    ChecklistItemResponse,
    InvestigationNoteResponse,
    SARDraftResponse,
)


def test_investigation_schemas():
    """Verify all investigation Pydantic schemas validate correctly."""
    note = InvestigationNoteResponse(
        id="n1",
        alert_id="a1",
        analyst_username="sarah.chen",
        content="Test",
        created_at="2025-01-20T10:00:00Z",
    )
    assert note.analyst_username == "sarah.chen"

    checklist = ChecklistItemResponse(
        id="c1",
        alert_id="a1",
        description="Check branches",
        is_checked=True,
        sort_order=1,
    )
    assert checklist.is_checked is True

    chat = ChatMessageResponse(
        id="m1",
        alert_id="a1",
        role="user",
        content="Hello",
        created_at="2025-01-20T10:00:00Z",
    )
    assert chat.role == "user"

    sar = SARDraftResponse(
        id="s1",
        alert_id="a1",
        version=1,
        generated_by="ai",
        created_at="2025-01-20T10:00:00Z",
    )
    assert sar.version == 1

    audit = AuditTrailEntryResponse(
        id="at1",
        alert_id="a1",
        action="status_change",
        performed_by="sarah.chen",
        created_at="2025-01-20T10:00:00Z",
    )
    assert audit.action == "status_change"
