"""Tests for core infrastructure: database session and seed CLI."""

import tempfile

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from api.core.database import get_async_session, init_db
from api.models.base import Base
from api.seed.__main__ import main, run_seed


@pytest.mark.asyncio
async def test_get_async_session_yields_session():
    """get_async_session yields a working AsyncSession."""
    test_engine = create_async_engine("sqlite+aiosqlite://", echo=False)
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    import api.core.database as db_module

    original_factory = db_module.async_session_factory
    db_module.async_session_factory = async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )
    try:
        gen = get_async_session()
        session = await gen.__anext__()
        assert isinstance(session, AsyncSession)
        result = await session.execute(text("SELECT 1"))
        assert result.scalar() == 1
        try:
            await gen.__anext__()
        except StopAsyncIteration:
            pass
    finally:
        db_module.async_session_factory = original_factory
        await test_engine.dispose()


@pytest.mark.asyncio
async def test_init_db_creates_tables():
    """init_db creates all model tables."""
    import api.core.database as db_module

    test_engine = create_async_engine("sqlite+aiosqlite://", echo=False)
    original_engine = db_module.engine
    db_module.engine = test_engine
    try:
        await init_db()
        async with test_engine.connect() as conn:
            result = await conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table'")
            )
            tables = [row[0] for row in result.all()]
            assert "alerts" in tables
            assert "customers" in tables
    finally:
        db_module.engine = original_engine
        await test_engine.dispose()


@pytest.mark.asyncio
async def test_run_seed_populates_database():
    """run_seed creates tables and seeds 20 alerts via file-based SQLite."""
    import api.core.database as db_module

    with tempfile.NamedTemporaryFile(suffix=".db") as tmp:
        db_url = f"sqlite+aiosqlite:///{tmp.name}"
        test_engine = create_async_engine(db_url, echo=False)
        test_factory = async_sessionmaker(
            test_engine, class_=AsyncSession, expire_on_commit=False
        )

        original_engine = db_module.engine
        original_factory = db_module.async_session_factory
        db_module.engine = test_engine
        db_module.async_session_factory = test_factory
        try:
            await run_seed()

            # run_seed disposes the engine; create a fresh one to verify
            verify_engine = create_async_engine(db_url, echo=False)
            async with verify_engine.connect() as conn:
                result = await conn.execute(text("SELECT COUNT(*) FROM alerts"))
                assert result.scalar() == 20
            await verify_engine.dispose()
        finally:
            db_module.engine = original_engine
            db_module.async_session_factory = original_factory


def test_main_entry_point():
    """main() runs the seeding pipeline synchronously."""
    import api.core.database as db_module

    with tempfile.NamedTemporaryFile(suffix=".db") as tmp:
        db_url = f"sqlite+aiosqlite:///{tmp.name}"
        test_engine = create_async_engine(db_url, echo=False)
        test_factory = async_sessionmaker(
            test_engine, class_=AsyncSession, expire_on_commit=False
        )

        original_engine = db_module.engine
        original_factory = db_module.async_session_factory
        db_module.engine = test_engine
        db_module.async_session_factory = test_factory
        try:
            main()
        finally:
            db_module.engine = original_engine
            db_module.async_session_factory = original_factory
