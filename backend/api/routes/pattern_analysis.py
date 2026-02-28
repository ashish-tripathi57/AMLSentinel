"""Pattern Analysis endpoint.

Returns an AI-generated analysis of suspicious transaction patterns for a
given alert.  Results are computed on demand by the pattern_analysis service.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.core.database import get_async_session
from api.services.ai_client import GeminiAPIError
from api.services.pattern_analysis import analyze_patterns

router = APIRouter(prefix="/api/alerts/{alert_id}", tags=["pattern-analysis"])


@router.get("/patterns")
async def get_pattern_analysis(
    alert_id: UUID,
    session: AsyncSession = Depends(get_async_session),
) -> dict:
    """Return an AI-generated pattern analysis for this alert.

    The response contains three keys:
    - ``patterns``: list of suspicious behavioural patterns observed.
    - ``risk_indicators``: list of specific red-flag data points.
    - ``summary``: plain-language narrative suitable for an analyst workbench.

    Args:
        alert_id: UUID of the alert to analyse.
        session: Injected async database session.

    Returns:
        dict with ``patterns``, ``risk_indicators``, and ``summary``.

    Raises:
        HTTPException 404: When the alert or its customer does not exist.
        HTTPException 502: When the AI service call fails.
    """
    try:  # pragma: no cover — AI-dependent, tested with RUN_REAL_API_TESTS=1
        result = await analyze_patterns(str(alert_id), session)
    except ValueError as exc:  # pragma: no cover
        msg = str(exc)
        # "not valid JSON" comes from generate_json; everything else is a 404 (not found).
        if "not valid JSON" in msg:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=msg) from exc
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg) from exc
    except GeminiAPIError as exc:  # pragma: no cover
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    return result  # pragma: no cover
