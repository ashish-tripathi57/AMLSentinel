from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from api.core.config import settings
from api.models.base import Base

engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG)
async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_async_session():
    """Yield an async database session for dependency injection."""
    async with async_session_factory() as session:
        yield session


async def init_db() -> None:
    """Create all database tables. Used for development and testing."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
