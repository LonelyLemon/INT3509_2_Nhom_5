from typing import Annotated, AsyncGenerator

from fastapi import Depends
from sqlalchemy import MetaData
from sqlalchemy.ext.asyncio import (AsyncSession, async_sessionmaker,
                                    create_async_engine)
from sqlalchemy.pool import NullPool

from src.core.config import settings
from src.core.constants import DB_NAMING_CONVENTION

DATABASE_URL = str(settings.ASYNC_DATABASE_URI)

engine = create_async_engine(
    DATABASE_URL,
    pool_size=settings.DATABASE_POOL_SIZE,
    pool_recycle=settings.DATABASE_POOL_TTL,
    pool_pre_ping=settings.DATABASE_POOL_PRE_PING,
)
metadata = MetaData(naming_convention=DB_NAMING_CONVENTION)

SessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=AsyncSession,
)

# Celery tasks call asyncio.run() which creates a fresh event loop each time.
# asyncpg connections are tied to a specific event loop, so pooled connections
# from a previous loop become invalid. NullPool avoids this by never reusing
# connections across calls — each task gets a fresh connection and closes it.
_task_engine = create_async_engine(DATABASE_URL, poolclass=NullPool)
TaskSessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=_task_engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=AsyncSession,
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session

SessionDep = Annotated[AsyncSession, Depends(get_session)]