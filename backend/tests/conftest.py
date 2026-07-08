"""Shared pytest fixtures for backend API tests."""

import asyncio
import os
from collections.abc import Generator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/test_bootstrap",
)

from app.core.database import Base, get_db
from app.reports.models import ReportStatus, RoadReport


@compiles(JSONB, "sqlite")
def compile_jsonb_for_sqlite(_element, _compiler, **_kwargs):
    """Allow PostgreSQL JSONB columns to be created as JSON in SQLite tests."""
    return "JSON"


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create an event loop for fixtures that prepare the async test database."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def db_session_factory(tmp_path, event_loop):
    """Create an isolated SQLite database for each test."""
    db_path = tmp_path / "test.db"
    engine = create_async_engine(
        f"sqlite+aiosqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def _create_schema() -> None:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    event_loop.run_until_complete(_create_schema())
    yield session_factory

    async def _dispose() -> None:
        await engine.dispose()

    event_loop.run_until_complete(_dispose())


@pytest_asyncio.fixture
async def client(db_session_factory):
    """Create an HTTP client that exercises the real app without test stubs."""
    import main as main_module

    async def _override_get_db():
        async with db_session_factory() as session:
            yield session

    main_module.app.dependency_overrides[get_db] = _override_get_db

    transport = ASGITransport(app=main_module.app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as test_client:
        yield test_client

    main_module.app.dependency_overrides.clear()


@pytest.fixture
def create_report(db_session_factory, event_loop):
    """Insert a report row and return its generated id."""

    async def _create_report(**overrides) -> int:
        payload = {
            "image_filename": "stored-image.jpg",
            "image_original_name": "road.jpg",
            "image_size_bytes": 1024,
            "image_mime_type": "image/jpeg",
            "latitude": 13.7563,
            "longitude": 100.5018,
            "gps_source": "manual",
            "description": "Test report",
            "reporter_name": "pytest",
            "status": ReportStatus.PENDING,
        }
        payload.update(overrides)

        async with db_session_factory() as session:
            report = RoadReport(**payload)
            session.add(report)
            await session.commit()
            await session.refresh(report)
            return report.id

    return _create_report
