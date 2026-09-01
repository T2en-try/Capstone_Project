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
from app.auth.models import AdminUser
from app.auth.utils import hash_password
from app.reports.models import AIAnalysis, ReportStatus, RoadReport


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
def stub_report_upload_dependencies(monkeypatch, tmp_path):
    """Patch upload storage/background work so API tests stay fast and deterministic."""
    import app.reports.router as reports_router

    calls = {"save_upload_file": 0}

    async def fake_save_upload_file(_image):
        calls["save_upload_file"] += 1
        return {
            "filename": "stored-road.jpg",
            "original_name": "road.jpg",
            "path": str(tmp_path / "stored-road.jpg"),
            "size_bytes": 10,
            "mime_type": "image/jpeg",
            "contents": b"fake-image",
        }

    async def fake_process_report_background(**_kwargs):
        return None

    monkeypatch.setattr(reports_router, "save_upload_file", fake_save_upload_file)
    monkeypatch.setattr(
        reports_router, "process_report_background", fake_process_report_background
    )

    return calls


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


@pytest.fixture
def create_ai_analysis(db_session_factory, event_loop):
    """Insert an AI analysis row linked to an existing report."""

    async def _create_ai_analysis(report_id: int, **overrides) -> int:
        payload = {
            "report_id": report_id,
            "model_version": "pytest-model",
            "cv_defect_count": 1,
            "cv_damage_ratio_percent": 12.5,
            "cv_max_severity_score": 2,
            "cv_details_json": {"D00": 1},
            "annotated_image_filename": "annotated-road.jpg",
            "rainfall_last_12m_mm": 100.0,
            "soil_moisture_last_30d_mm": 0.1,
            "ndvi_index": 0.2,
            "estimated_surface_material": "Asphalt",
            "nightlight_radiance": 0.0,
            "slope": 0.0,
            "road_name": "Test Road",
            "road_type": "Local",
            "osm_highway_type": "residential",
            "lanes": 2,
            "speed_limit": 50.0,
            "community_impact_score_pi": 10,
            "nearest_poi_distance_m": 500.0,
            "crowdsource_report_count_30d": 0,
            "days_since_last_report": 999,
            "user_severity_score_avg": 0.0,
            "heuristic_score": 20.0,
            "fuzzy_score": 20.0,
            "ml_score": 20.0,
            "final_fusion_score": 0.2,
            "final_decision": "Good",
        }
        payload.update(overrides)

        async with db_session_factory() as session:
            analysis = AIAnalysis(**payload)
            session.add(analysis)
            await session.commit()
            await session.refresh(analysis)
            return analysis.id

    return _create_ai_analysis


@pytest.fixture
def create_admin(db_session_factory, event_loop):
    """Insert an admin user and return its credentials."""

    async def _create_admin(
        email: str = "admin@example.com",
        password: str = "correct-password",
        is_active: bool = True,
    ) -> dict:
        async with db_session_factory() as session:
            admin = AdminUser(
                email=email,
                hashed_password=hash_password(password),
                full_name="Pytest Admin",
                role="admin",
                is_active=is_active,
            )
            session.add(admin)
            await session.commit()
            await session.refresh(admin)
            return {"id": admin.id, "email": email, "password": password}

    return _create_admin
