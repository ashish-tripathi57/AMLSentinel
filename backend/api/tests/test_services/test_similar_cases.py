"""Tests for the similar cases service.

Verifies that find_similar_cases correctly identifies alerts sharing
typology, risk score proximity, flagged amount similarity, and customer
risk category — returning up to 5 results with accurate similarity scores.
"""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import api.models  # noqa: F401 — registers all ORM models
from api.models.alert import Alert
from api.models.base import Base
from api.seed.__main__ import seed_all
from api.services.similar_cases import find_similar_cases


# ---------------------------------------------------------------------------
# Fixture — seeded in-memory database
# ---------------------------------------------------------------------------


@pytest.fixture()
async def seeded_session():
    """Yield an AsyncSession backed by a fully seeded in-memory SQLite database."""
    engine = create_async_engine("sqlite+aiosqlite://", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as seed_session:
        await seed_all(seed_session)
        await seed_session.commit()

    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _first_alert_id(session: AsyncSession) -> str:
    """Return the UUID of the first seeded alert."""
    result = await session.execute(select(Alert).limit(1))
    alert = result.scalar_one()
    return alert.id


async def _alert_by_short_id(session: AsyncSession, short_id: str) -> Alert:
    """Fetch an alert by its short alert_id (e.g., 'S1')."""
    result = await session.execute(select(Alert).where(Alert.alert_id == short_id))
    return result.scalar_one()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_find_similar_cases_returns_list(seeded_session: AsyncSession) -> None:
    """find_similar_cases returns a list of similar case dicts."""
    alert_id = await _first_alert_id(seeded_session)
    results = await find_similar_cases(alert_id, seeded_session)

    assert isinstance(results, list)


@pytest.mark.asyncio
async def test_find_similar_cases_excludes_target_alert(seeded_session: AsyncSession) -> None:
    """The target alert itself must never appear in the similar cases list."""
    alert_id = await _first_alert_id(seeded_session)
    results = await find_similar_cases(alert_id, seeded_session)

    result_ids = [r["id"] for r in results]
    assert alert_id not in result_ids


@pytest.mark.asyncio
async def test_find_similar_cases_max_five_results(seeded_session: AsyncSession) -> None:
    """At most 5 similar cases are returned."""
    alert_id = await _first_alert_id(seeded_session)
    results = await find_similar_cases(alert_id, seeded_session)

    assert len(results) <= 5


@pytest.mark.asyncio
async def test_find_similar_cases_sorted_by_similarity_descending(seeded_session: AsyncSession) -> None:
    """Results are sorted by similarity_score in descending order."""
    alert_id = await _first_alert_id(seeded_session)
    results = await find_similar_cases(alert_id, seeded_session)

    if len(results) >= 2:
        scores = [r["similarity_score"] for r in results]
        assert scores == sorted(scores, reverse=True)


@pytest.mark.asyncio
async def test_find_similar_cases_result_has_required_fields(seeded_session: AsyncSession) -> None:
    """Each similar case result contains all required fields."""
    alert_id = await _first_alert_id(seeded_session)
    results = await find_similar_cases(alert_id, seeded_session)

    assert len(results) > 0, "Seeded data must produce at least one similar case"
    required_fields = {
        "id", "alert_id", "title", "typology", "risk_score",
        "status", "resolution", "similarity_score", "matching_factors",
    }
    for case in results:
        assert required_fields.issubset(case.keys()), (
            f"Missing fields: {required_fields - case.keys()}"
        )


@pytest.mark.asyncio
async def test_find_similar_cases_similarity_score_range(seeded_session: AsyncSession) -> None:
    """Similarity scores are within 0-100 range."""
    alert_id = await _first_alert_id(seeded_session)
    results = await find_similar_cases(alert_id, seeded_session)

    for case in results:
        assert 0 <= case["similarity_score"] <= 100


@pytest.mark.asyncio
async def test_find_similar_cases_matching_factors_are_strings(seeded_session: AsyncSession) -> None:
    """matching_factors is a list of descriptive strings."""
    alert_id = await _first_alert_id(seeded_session)
    results = await find_similar_cases(alert_id, seeded_session)

    for case in results:
        assert isinstance(case["matching_factors"], list)
        assert len(case["matching_factors"]) > 0, "Must have at least one matching factor"
        for factor in case["matching_factors"]:
            assert isinstance(factor, str)


@pytest.mark.asyncio
async def test_find_similar_cases_same_typology_has_high_score(seeded_session: AsyncSession) -> None:
    """Alerts sharing the same typology should get the typology bonus (+40 points)."""
    # S1 is a Structuring alert; S2-S5 are also Structuring.
    s1 = await _alert_by_short_id(seeded_session, "S1")
    results = await find_similar_cases(s1.id, seeded_session)

    # At least one result should share the same typology and have score >= 40
    same_typology = [r for r in results if r["typology"] == s1.typology]
    assert len(same_typology) > 0, "Expected at least one same-typology match"
    for case in same_typology:
        assert case["similarity_score"] >= 40
        assert any("typology" in f.lower() for f in case["matching_factors"])


@pytest.mark.asyncio
async def test_find_similar_cases_raises_for_unknown_alert(seeded_session: AsyncSession) -> None:
    """find_similar_cases raises ValueError for a non-existent alert UUID."""
    with pytest.raises(ValueError, match="not found"):
        await find_similar_cases("00000000-0000-0000-0000-000000000000", seeded_session)


@pytest.mark.asyncio
async def test_find_similar_cases_matching_factors_reflect_score(seeded_session: AsyncSession) -> None:
    """The number of matching factors should be consistent with the similarity score.

    Each factor contributes a known number of points; the total should equal
    the similarity_score.
    """
    alert_id = await _first_alert_id(seeded_session)
    results = await find_similar_cases(alert_id, seeded_session)

    factor_scores = {
        "typology": 40,
        "risk score": 25,
        "flagged amount": 20,
        "risk category": 15,
    }
    for case in results:
        expected_score = 0
        for factor_keyword, points in factor_scores.items():
            if any(factor_keyword in f.lower() for f in case["matching_factors"]):
                expected_score += points
        assert case["similarity_score"] == expected_score, (
            f"Score {case['similarity_score']} does not match factors {case['matching_factors']} "
            f"(expected {expected_score})"
        )
