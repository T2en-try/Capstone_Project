"""
Seed Admin Script
สคริปต์สร้าง Admin User เริ่มต้นในฐานข้อมูล

Usage:
    python seed_admin.py

Password source (no hardcoded default -- see production_migration_log.md's
README/CLAUDE.md audit entry for why):
    1. ADMIN_DEFAULT_PASSWORD environment variable, if set.
    2. Otherwise, prompted for interactively (hidden input, confirmed twice).
"""

import asyncio
import os
from getpass import getpass
from sqlalchemy import select
from app.core.database import async_session, init_db
from app.auth.models import AdminUser
from app.auth.utils import hash_password


# ─── Default Admin Identity (not secret -- just the seeded login email) ────
DEFAULT_EMAIL = "admin@roadmonitor.com"
DEFAULT_NAME = "System Admin"


def _resolve_password() -> str:
    """ดึงรหัสผ่านจาก ADMIN_DEFAULT_PASSWORD หรือถามจากผู้ใช้ (ไม่ echo หน้าจอ)"""
    env_password = os.environ.get("ADMIN_DEFAULT_PASSWORD")
    if env_password:
        return env_password

    while True:
        password = getpass("Set initial admin password: ")
        if not password:
            print("[ERROR] Password cannot be empty.")
            continue
        confirm = getpass("Confirm password: ")
        if password != confirm:
            print("[ERROR] Passwords did not match, try again.")
            continue
        return password


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

        password = _resolve_password()

        # สร้าง admin ใหม่
        admin = AdminUser(
            email=DEFAULT_EMAIL,
            hashed_password=hash_password(password),
            full_name=DEFAULT_NAME,
            role="admin",
            is_active=True,
        )
        db.add(admin)
        await db.commit()
        await db.refresh(admin)

        print(f"[OK] Admin created successfully!")
        print(f"   Email: {DEFAULT_EMAIL}")
        print(f"   ID:    {admin.id}")


if __name__ == "__main__":
    asyncio.run(seed())
