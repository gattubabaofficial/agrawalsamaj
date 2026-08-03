"""Shared pytest fixtures.

Every test gets its own in-memory SQLite database, created and dropped inside
the test. Tests therefore never touch test.db and never see each other's rows.
"""

from typing import AsyncGenerator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db_session
from app.dependencies import get_db
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# NOTE: do NOT define an `event_loop` fixture here. Overriding it was
# deprecated in pytest-asyncio 0.23 and removed in 1.0 (this project is on
# 1.4.0); supplying one makes the test session hang at teardown rather than
# fail. pytest-asyncio manages the loop itself — `asyncio_mode = auto` in
# pytest.ini is all the configuration needed.


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """A session on a fresh in-memory database.

    StaticPool keeps every connection pointed at the same in-memory DB —
    without it, each connection would get its own blank database.
    """
    from sqlalchemy.pool import StaticPool

    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with maker() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """An HTTP client whose requests hit the test database.

    BOTH database dependencies must be overridden. This codebase has two, and
    which one a route uses depends on the router:

        get_db          (app.dependencies) — admin, auth, blog, bookings,
                        dashboard, donations, events, passes, receipts, role,
                        vouchers
        get_db_session  (app.database)     — chat, family, membership,
                        special_events

    Overriding only one leaves the other group of routes talking to the real
    test.db, which fails silently: the tests pass, against the wrong database.
    membership.py — the member directory — is in the second group.
    """

    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_db_session] = _override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
