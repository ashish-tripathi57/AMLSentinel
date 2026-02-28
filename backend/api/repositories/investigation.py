from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.investigation import (
    AuditTrailEntry,
    ChatMessage,
    ChecklistItem,
    InvestigationNote,
    SARDraft,
)


class InvestigationNoteRepository:
    """Async CRUD for investigation notes."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_alert(self, alert_id: str) -> list[InvestigationNote]:
        result = await self.session.execute(
            select(InvestigationNote)
            .where(InvestigationNote.alert_id == alert_id)
            .order_by(InvestigationNote.created_at.desc())
        )
        return list(result.scalars().all())

    async def create(self, alert_id: str, analyst_username: str, content: str) -> InvestigationNote:
        note = InvestigationNote(alert_id=alert_id, analyst_username=analyst_username, content=content)
        self.session.add(note)
        await self.session.commit()
        await self.session.refresh(note)
        return note


class ChecklistRepository:
    """Async CRUD for checklist items."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_alert(self, alert_id: str) -> list[ChecklistItem]:
        result = await self.session.execute(
            select(ChecklistItem)
            .where(ChecklistItem.alert_id == alert_id)
            .order_by(ChecklistItem.sort_order.asc())
        )
        return list(result.scalars().all())

    async def create(self, alert_id: str, description: str, sort_order: int = 0) -> ChecklistItem:
        item = ChecklistItem(alert_id=alert_id, description=description, sort_order=sort_order)
        self.session.add(item)
        await self.session.commit()
        await self.session.refresh(item)
        return item

    async def update_check(
        self, item_id: str, is_checked: bool, checked_by: str, ai_rationale: str | None = None
    ) -> ChecklistItem | None:
        result = await self.session.execute(select(ChecklistItem).where(ChecklistItem.id == item_id))
        item = result.scalar_one_or_none()
        if item:
            item.is_checked = is_checked
            item.checked_by = checked_by
            # Only overwrite ai_rationale when a new value is explicitly supplied.
            # Omitting the argument on a manual toggle must not erase a prior AI verdict.
            if ai_rationale is not None:
                item.ai_rationale = ai_rationale
            await self.session.commit()
            await self.session.refresh(item)
        return item

    async def create_batch(self, alert_id: str, descriptions: list[str]) -> list[ChecklistItem]:
        items = []
        for i, desc in enumerate(descriptions):
            item = ChecklistItem(alert_id=alert_id, description=desc, sort_order=i)
            self.session.add(item)
            items.append(item)
        await self.session.commit()
        for item in items:
            await self.session.refresh(item)
        return items


class ChatMessageRepository:
    """Async CRUD for chat messages."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_alert(self, alert_id: str) -> list[ChatMessage]:
        result = await self.session.execute(
            select(ChatMessage)
            .where(ChatMessage.alert_id == alert_id)
            .order_by(ChatMessage.created_at.asc())
        )
        return list(result.scalars().all())

    async def create(
        self, alert_id: str, role: str, content: str, analyst_username: str | None = None
    ) -> ChatMessage:
        message = ChatMessage(
            alert_id=alert_id, role=role, content=content, analyst_username=analyst_username
        )
        self.session.add(message)
        await self.session.commit()
        await self.session.refresh(message)
        return message


class SARDraftRepository:
    """Async CRUD for SAR drafts."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, draft_id: str) -> SARDraft | None:
        result = await self.session.execute(select(SARDraft).where(SARDraft.id == draft_id))
        return result.scalar_one_or_none()

    async def get_by_alert(self, alert_id: str) -> list[SARDraft]:
        result = await self.session.execute(
            select(SARDraft)
            .where(SARDraft.alert_id == alert_id)
            .order_by(SARDraft.version.desc())
        )
        return list(result.scalars().all())

    async def get_latest(self, alert_id: str) -> SARDraft | None:
        result = await self.session.execute(
            select(SARDraft)
            .where(SARDraft.alert_id == alert_id)
            .order_by(SARDraft.version.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def create(self, alert_id: str, generated_by: str = "ai", **sections) -> SARDraft:
        existing = await self.get_by_alert(alert_id)
        next_version = (existing[0].version + 1) if existing else 1
        draft = SARDraft(alert_id=alert_id, version=next_version, generated_by=generated_by, **sections)
        self.session.add(draft)
        await self.session.commit()
        await self.session.refresh(draft)
        return draft

    async def update(self, draft_id: str, **sections) -> SARDraft | None:
        result = await self.session.execute(select(SARDraft).where(SARDraft.id == draft_id))
        draft = result.scalar_one_or_none()
        if draft:
            for key, value in sections.items():
                if hasattr(draft, key) and value is not None:
                    setattr(draft, key, value)
            await self.session.commit()
            await self.session.refresh(draft)
        return draft


class AuditTrailRepository:
    """Async CRUD for audit trail entries."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_alert(self, alert_id: str, action: str | None = None) -> list[AuditTrailEntry]:
        query = select(AuditTrailEntry).where(AuditTrailEntry.alert_id == alert_id)
        if action:
            query = query.where(AuditTrailEntry.action == action)
        query = query.order_by(AuditTrailEntry.created_at.desc())
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def create(
        self, alert_id: str, action: str, performed_by: str, details: str | None = None
    ) -> AuditTrailEntry:
        entry = AuditTrailEntry(
            alert_id=alert_id, action=action, performed_by=performed_by, details=details
        )
        self.session.add(entry)
        await self.session.commit()
        await self.session.refresh(entry)
        return entry
