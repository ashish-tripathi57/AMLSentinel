"""CLI entry point for seeding the AML Sentinel database.

Usage:
    cd backend && python -m api.seed        # Seed using configured DATABASE_URL
    make seed                                # Same, via Makefile target
"""

import asyncio
import sys

from sqlalchemy.ext.asyncio import AsyncSession

from api.seed.geographic import seed_geographic
from api.seed.large_cash import seed_large_cash
from api.seed.rapid_movement import seed_rapid_movement
from api.seed.round_trip import seed_round_trip
from api.seed.structuring import seed_structuring
from api.seed.sudden_activity import seed_sudden_activity

TYPOLOGY_SEEDERS = [
    ("Structuring (S1-S5)", seed_structuring),
    ("Unusual Geographic Activity (G1-G3)", seed_geographic),
    ("Rapid Fund Movement (R1-R3)", seed_rapid_movement),
    ("Round-trip Transactions (RT1-RT3)", seed_round_trip),
    ("Sudden Activity Change (SA1-SA3)", seed_sudden_activity),
    ("Large Cash Transactions (LC1-LC3)", seed_large_cash),
]


async def seed_all(session: AsyncSession) -> int:
    """Run all typology seeders against the given session.

    Returns the number of typologies seeded. Does NOT commit — the caller
    is responsible for committing when appropriate.
    """
    for _label, seeder_fn in TYPOLOGY_SEEDERS:
        await seeder_fn(session)
    return len(TYPOLOGY_SEEDERS)


async def run_seed() -> None:
    """Create tables (if needed) and seed all 20 alerts across 6 typologies."""
    from api.core.database import async_session_factory, engine, init_db

    print("Initializing database schema...")
    await init_db()

    async with async_session_factory() as session:
        count = await seed_all(session)
        await session.commit()
        print(f"Seeding complete: {count} typologies, 20 alerts.")

    await engine.dispose()


def main() -> None:
    """Synchronous entry point for the CLI."""
    try:
        asyncio.run(run_seed())
    except KeyboardInterrupt:  # pragma: no cover
        print("\nSeeding interrupted.")
        sys.exit(1)


if __name__ == "__main__":  # pragma: no cover
    main()
