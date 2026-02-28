"""Chat SSE streaming endpoint.

Streams Claude AI responses to analyst chat messages in an alert investigation.
Each response chunk is forwarded as a Server-Sent Events (SSE) frame so the
frontend can render text incrementally without waiting for the full reply.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from api.core.database import get_async_session
from api.repositories.alert import AlertRepository
from api.schemas.investigation import ChatRequest
from api.services.chat import get_chat_response

router = APIRouter(prefix="/api/alerts/{alert_id}", tags=["chat"])


async def _sse_generator(alert_id: str, content: str, analyst_username: str, session: AsyncSession):
    """Wrap the chat service stream in SSE-formatted frames.

    Yields one ``data: <chunk>\\n\\n`` frame per text chunk, followed by a
    final ``data: [DONE]\\n\\n`` sentinel so the client knows when to close
    the event stream.

    Args:
        alert_id: UUID of the alert being investigated.
        content: The analyst's message text.
        analyst_username: Username of the analyst (recorded in chat history).
        session: Active async database session.

    Yields:
        SSE-formatted byte strings.
    """
    stream = await get_chat_response(  # pragma: no cover — AI-dependent
        alert_id=alert_id,
        user_message=content,
        analyst_username=analyst_username,
        session=session,
    )
    async for chunk in stream:  # pragma: no cover
        safe_chunk = chunk.replace("\n", "\\n")
        yield f"data: {safe_chunk}\n\n"

    yield "data: [DONE]\n\n"  # pragma: no cover


@router.post("/chat")
async def stream_chat_response(
    alert_id: UUID,
    body: ChatRequest,
    analyst_username: str = Query(..., description="Username of the analyst sending the message"),
    session: AsyncSession = Depends(get_async_session),
) -> StreamingResponse:
    """Stream an AI-generated investigation chat response as Server-Sent Events.

    The client should connect with ``Accept: text/event-stream`` and consume
    ``data:`` frames until it receives ``data: [DONE]``.

    Args:
        alert_id: UUID of the alert under investigation.
        body: JSON body containing ``content`` (the analyst's message).
        analyst_username: Query param identifying the analyst.
        session: Injected async database session.

    Returns:
        StreamingResponse with ``Content-Type: text/event-stream``.

    Raises:
        HTTPException 404: When the alert does not exist.
    """
    # Validate the alert exists before starting the stream; errors inside the
    # async generator would fire after the 200 StreamingResponse is committed.
    alert = await AlertRepository(session).get_by_id(str(alert_id))
    if alert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert '{alert_id}' not found",
        )

    generator = _sse_generator(  # pragma: no cover — AI-dependent
        alert_id=str(alert_id),
        content=body.content,
        analyst_username=analyst_username,
        session=session,
    )
    return StreamingResponse(  # pragma: no cover
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
