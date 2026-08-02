"""
Seed Admin Script
สคริปต์สร้าง Admin User เริ่มต้นในฐานข้อมูล

Usage:
    python seed_admin.py
"""

import asyncio
from sqlalchemy import select
from app.core.database import async_session, init_db
from app.auth.models import AdminUser
from app.auth.utils import hash_password


# ─── Default Admin Credentials ─────────────────────────────────
DEFAULT_EMAIL = "admin@roadmonitor.com"
DEFAULT_PASSWORD = "admin1234"
DEFAULT_NAME = "System Admin"


async def seed():
    """สร้าง Admin User เริ่มต้น"""
    # สร้างตารางในฐานข้อมูลถ้ายังไม่มี
    await init_db()

    async with async_session() as db:
        # ตรวจสอบว่ามี admin อยู่แล้วหรือไม่
        result = await db.execute(
            select(AdminUser).where(AdminUser.email == DEFAULT_EMAIL)
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"[WARN] Admin '{DEFAULT_EMAIL}' already exists (ID: {existing.id})")
            return

        # สร้าง admin ใหม่
        admin = AdminUser(
            email=DEFAULT_EMAIL,
            hashed_password=hash_password(DEFAULT_PASSWORD),
            full_name=DEFAULT_NAME,
            role="admin",
            is_active=True,
        )
        db.add(admin)
        await db.commit()
        await db.refresh(admin)

        print(f"[OK] Admin created successfully!")
        print(f"   Email:    {DEFAULT_EMAIL}")
        print(f"   Password: {DEFAULT_PASSWORD}")
        print(f"   ID:       {admin.id}")


if __name__ == "__main__":
    asyncio.run(seed())
