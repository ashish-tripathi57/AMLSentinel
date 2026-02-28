"""Similar cases service.

Finds alerts similar to a given target alert based on matching criteria:
typology, risk score proximity, flagged transaction amount similarity,
and customer risk category. Returns up to 5 results ranked by a
composite similarity score.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.models.alert import Alert
from api.models.customer import Customer

# ---------------------------------------------------------------------------
# Scoring weights
# ---------------------------------------------------------------------------
TYPOLOGY_WEIGHT = 40
RISK_SCORE_WEIGHT = 25
FLAGGED_AMOUNT_WEIGHT = 20
RISK_CATEGORY_WEIGHT = 15

RISK_SCORE_TOLERANCE = 15
FLAGGED_AMOUNT_TOLERANCE_RATIO = 0.50

MAX_RESULTS = 5


async def find_similar_cases(
    alert_id: str,
    session: AsyncSession,
) -> list[dict]:
    """Find alerts similar to the target alert.

    Parameters
    ----------
    alert_id:
        UUID of the target alert.
    session:
        An active async database session.

    Returns
    -------
    list[dict]
        Up to 5 similar case dicts sorted by ``similarity_score`` descending.
        Each dict contains: id, alert_id, title, typology, risk_score,
        status, resolution, similarity_score, matching_factors.

    Raises
    ------
    ValueError
        If no alert with the given UUID exists.
    """
    # Fetch the target alert
    target_result = await session.execute(
        select(Alert).where(Alert.id == alert_id)
    )
    target_alert = target_result.scalar_one_or_none()
    if target_alert is None:
        raise ValueError(f"Alert '{alert_id}' not found")

    # Fetch the target alert's customer to get risk_category
    target_customer_result = await session.execute(
        select(Customer).where(Customer.id == target_alert.customer_id)
    )
    target_customer = target_customer_result.scalar_one_or_none()
    target_risk_category = target_customer.risk_category if target_customer else None

    # Fetch all other alerts with their customers eagerly loaded
    candidates_result = await session.execute(
        select(Alert)
        .options(selectinload(Alert.customer))
        .where(Alert.id != alert_id)
    )
    candidates = list(candidates_result.scalars().all())

    scored_cases: list[dict] = []

    for candidate in candidates:
        similarity_score = 0
        matching_factors: list[str] = []

        # 1. Same typology (+40)
        if candidate.typology == target_alert.typology:
            similarity_score += TYPOLOGY_WEIGHT
            matching_factors.append(f"Same typology: {candidate.typology}")

        # 2. Risk score within +/-15 (+25)
        risk_diff = abs(candidate.risk_score - target_alert.risk_score)
        if risk_diff <= RISK_SCORE_TOLERANCE:
            similarity_score += RISK_SCORE_WEIGHT
            matching_factors.append(
                f"Risk score within {RISK_SCORE_TOLERANCE} points "
                f"({candidate.risk_score} vs {target_alert.risk_score})"
            )

        # 3. Similar flagged amount within 50% (+20)
        if (
            target_alert.total_flagged_amount is not None
            and target_alert.total_flagged_amount > 0
            and candidate.total_flagged_amount is not None
        ):
            amount_diff = abs(
                candidate.total_flagged_amount - target_alert.total_flagged_amount
            )
            threshold = target_alert.total_flagged_amount * FLAGGED_AMOUNT_TOLERANCE_RATIO
            if amount_diff <= threshold:
                similarity_score += FLAGGED_AMOUNT_WEIGHT
                matching_factors.append(
                    f"Flagged amount within 50% "
                    f"(₹{candidate.total_flagged_amount:,.0f} vs "
                    f"₹{target_alert.total_flagged_amount:,.0f})"
                )

        # 4. Same customer risk category (+15)
        candidate_risk_category = (
            candidate.customer.risk_category if candidate.customer else None
        )
        if (
            target_risk_category is not None
            and candidate_risk_category is not None
            and candidate_risk_category == target_risk_category
        ):
            similarity_score += RISK_CATEGORY_WEIGHT
            matching_factors.append(
                f"Same risk category: {candidate_risk_category}"
            )

        # Only include candidates that match on at least one criterion
        if similarity_score > 0:
            scored_cases.append(
                {
                    "id": candidate.id,
                    "alert_id": candidate.alert_id,
                    "title": candidate.title,
                    "typology": candidate.typology,
                    "risk_score": candidate.risk_score,
                    "status": candidate.status,
                    "resolution": candidate.resolution,
                    "similarity_score": similarity_score,
                    "matching_factors": matching_factors,
                }
            )

    # Sort by similarity score descending, then return top 5
    scored_cases.sort(key=lambda c: c["similarity_score"], reverse=True)
    return scored_cases[:MAX_RESULTS]
