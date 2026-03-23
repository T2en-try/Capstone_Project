"""
Road Report Backend - Database Module
โมดูลจัดการการเชื่อมต่อฐานข้อมูล (SQLAlchemy Async)
"""

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


# สร้าง Async Engine สำหรับ SQLite
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},  # จำเป็นสำหรับ SQLite
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all database models."""
    pass


async def get_db() -> AsyncSession:
    """
    Dependency Injection: สร้าง database session ให้แต่ละ request
    ใช้เป็น FastAPI Dependency
    """
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """สร้างตารางทั้งหมดในฐานข้อมูล (ถ้ายังไม่มี)"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
