import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.alert import Alert
from api.models.customer import Customer
from api.repositories.investigation import (
    AuditTrailRepository,
    ChatMessageRepository,
    ChecklistRepository,
    InvestigationNoteRepository,
    SARDraftRepository,
)


async def _create_alert(db_session: AsyncSession) -> Alert:
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
async def test_note_create_and_get(db_session: AsyncSession):
    alert = await _create_alert(db_session)
    repo = InvestigationNoteRepository(db_session)
    note = await repo.create(alert.id, "sarah.chen", "Initial review complete.")
    assert note.id is not None

    notes = await repo.get_by_alert(alert.id)
    assert len(notes) == 1
    assert notes[0].content == "Initial review complete."


@pytest.mark.asyncio
async def test_checklist_create_batch(db_session: AsyncSession):
    alert = await _create_alert(db_session)
    repo = ChecklistRepository(db_session)
    items = await repo.create_batch(alert.id, ["Check branches", "Review CTR", "Verify occupation"])
    assert len(items) == 3
    assert items[0].sort_order == 0
    assert items[2].sort_order == 2


@pytest.mark.asyncio
async def test_checklist_get_by_alert(db_session: AsyncSession):
    alert = await _create_alert(db_session)
    repo = ChecklistRepository(db_session)
    await repo.create_batch(alert.id, ["Check branches", "Review CTR"])
    items = await repo.get_by_alert(alert.id)
    assert len(items) == 2
    assert items[0].sort_order == 0
    assert items[1].sort_order == 1


@pytest.mark.asyncio
async def test_checklist_update_check(db_session: AsyncSession):
    alert = await _create_alert(db_session)
    repo = ChecklistRepository(db_session)
    item = await repo.create(alert.id, "Check all branches", sort_order=0)
    updated = await repo.update_check(item.id, True, "ai", "All from same branch.")
    assert updated.is_checked is True
    assert updated.checked_by == "ai"


@pytest.mark.asyncio
async def test_checklist_update_check_preserves_ai_rationale_when_not_provided(db_session: AsyncSession):
    """Analyst manual toggle must not erase a previously stored AI rationale."""
    alert = await _create_alert(db_session)
    repo = ChecklistRepository(db_session)
    item = await repo.create(alert.id, "Verify transaction pattern", sort_order=0)

    # Simulate AI auto-check writing the rationale
    ai_rationale = "Customer made 9 transactions just below ₹10L threshold."
    await repo.update_check(item.id, is_checked=True, checked_by="ai", ai_rationale=ai_rationale)

    # Analyst manually unchecks — no ai_rationale argument supplied
    result = await repo.update_check(item.id, is_checked=False, checked_by="analyst.one")

    assert result.is_checked is False
    assert result.checked_by == "analyst.one"
    assert result.ai_rationale == ai_rationale  # Must still be present


@pytest.mark.asyncio
async def test_chat_message_create_and_get(db_session: AsyncSession):
    alert = await _create_alert(db_session)
    repo = ChatMessageRepository(db_session)
    await repo.create(alert.id, "user", "Summarize this alert", analyst_username="sarah.chen")
    await repo.create(alert.id, "assistant", "This alert involves structuring...")

    messages = await repo.get_by_alert(alert.id)
    assert len(messages) == 2
    assert messages[0].role == "user"
    assert messages[1].role == "assistant"


@pytest.mark.asyncio
async def test_sar_draft_create_and_versioning(db_session: AsyncSession):
    alert = await _create_alert(db_session)
    repo = SARDraftRepository(db_session)
    draft1 = await repo.create(alert.id, generated_by="ai", narrative="First version")
    assert draft1.version == 1

    draft2 = await repo.create(alert.id, generated_by="analyst", narrative="Second version")
    assert draft2.version == 2

    latest = await repo.get_latest(alert.id)
    assert latest.version == 2


@pytest.mark.asyncio
async def test_sar_draft_update(db_session: AsyncSession):
    alert = await _create_alert(db_session)
    repo = SARDraftRepository(db_session)
    draft = await repo.create(alert.id, narrative="Initial")
    updated = await repo.update(draft.id, narrative="Updated narrative", subject_info="Rajesh Kumar")
    assert updated.narrative == "Updated narrative"
    assert updated.subject_info == "Rajesh Kumar"


@pytest.mark.asyncio
async def test_audit_trail_create_and_filter(db_session: AsyncSession):
    alert = await _create_alert(db_session)
    repo = AuditTrailRepository(db_session)
    await repo.create(alert.id, "status_change", "sarah.chen", "New -> In Progress")
    await repo.create(alert.id, "note_added", "sarah.chen", "Added investigation note")

    all_entries = await repo.get_by_alert(alert.id)
    assert len(all_entries) == 2

    filtered = await repo.get_by_alert(alert.id, action="status_change")
    assert len(filtered) == 1
    assert filtered[0].action == "status_change"
