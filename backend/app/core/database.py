"""
Road Report Backend - Database Module
โมดูลจัดการการเชื่อมต่อฐานข้อมูล (SQLAlchemy Async - PostgreSQL)
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


# ตั้งค่า Connection Pool สำหรับ PostgreSQL ใน Production เพื่อประสิทธิภาพการทำงานที่ดียิ่งขึ้น
engine_kwargs = {
    "echo": False,
    "pool_size": 20,           # ขนาดตั้งต้นของ connection pool
    "max_overflow": 10,        # จำนวน connection สูงสุดที่จะขยายออกไปได้ชั่วคราว
    "pool_recycle": 1800,      # หมุนเวียนเชื่อมต่อใหม่ทุก 30 นาทีเพื่อเลี่ยง connection หลุด
    "pool_pre_ping": True,     # ping ทดสอบการเชื่อมต่อก่อนดึงจาก pool เพื่อกัน connection stale
}

engine = create_async_engine(settings.DATABASE_URL, **engine_kwargs)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all database models."""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
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

