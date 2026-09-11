"""
Seed Admin Script
สคริปต์สร้าง Admin User เริ่มต้นในฐานข้อมูล

Usage:
    python seed_admin.py

Password source:
    1. ADMIN_DEFAULT_PASSWORD environment variable, if set.
    2. Otherwise, prompted for interactively.
"""

import asyncio
import os
from getpass import getpass

from sqlalchemy import select

from app.core.database import async_session, init_db
from app.reports.models import User, UserRole
from app.auth.utils import hash_password


# =========================================================
# Default Admin Identity
# =========================================================

DEFAULT_EMAIL = "admin@roadmonitor.com"
DEFAULT_EMPLOYEE_CODE = "ADMIN001"
DEFAULT_FIRST_NAME = "System"
DEFAULT_LAST_NAME = "Admin"
DEFAULT_DEPARTMENT = "Road Monitor"
DEFAULT_POSITION = "System Administrator"


# =========================================================
# Resolve Password
# =========================================================

def _resolve_password() -> str:
    """
    ดึงรหัสผ่านจาก ADMIN_DEFAULT_PASSWORD
    หรือถามจากผู้ใช้แบบไม่แสดงรหัสผ่าน
    """

    env_password = os.environ.get(
        "ADMIN_DEFAULT_PASSWORD"
    )

    if env_password:
        return env_password

    while True:
        password = getpass(
            "Set initial admin password: "
        )

        if not password:
            print(
                "[ERROR] Password cannot be empty."
            )
            continue

        if len(password) < 8:
            print(
                "[ERROR] Password must be at least 8 characters."
            )
            continue

        confirm = getpass(
            "Confirm password: "
        )

        if password != confirm:
            print(
                "[ERROR] Passwords did not match, try again."
            )
            continue

        return password


# =========================================================
# Seed Admin
# =========================================================

async def seed():
    """
    สร้าง Admin User เริ่มต้นในตาราง users
    """

    # สร้างตารางถ้ายังไม่มี
    await init_db()

    async with async_session() as db:

        # -------------------------------------------------
        # ตรวจสอบ Admin เดิมจาก users
        # -------------------------------------------------

        result = await db.execute(
            select(User).where(
                User.email == DEFAULT_EMAIL
            )
        )

        existing = result.scalar_one_or_none()

        if existing:
            print(
                f"[WARN] User '{DEFAULT_EMAIL}' "
                f"already exists (ID: {existing.id})"
            )
            return

        # -------------------------------------------------
        # Password
        # -------------------------------------------------

        password = _resolve_password()

        # -------------------------------------------------
        # Create Admin
        # -------------------------------------------------

        admin = User(
            employee_code=DEFAULT_EMPLOYEE_CODE,

            email=DEFAULT_EMAIL,

            hashed_password=hash_password(
                password
            ),

            first_name=DEFAULT_FIRST_NAME,

            last_name=DEFAULT_LAST_NAME,

            department=DEFAULT_DEPARTMENT,

            position=DEFAULT_POSITION,

            role=UserRole.ADMIN,

            is_active=1,
        )

        db.add(admin)

        await db.commit()

        await db.refresh(admin)

        # -------------------------------------------------
        # Result
        # -------------------------------------------------

        print(
            "[OK] Admin created successfully!"
        )

        print(
            f"   Email: {DEFAULT_EMAIL}"
        )

        print(
            f"   Employee Code: "
            f"{DEFAULT_EMPLOYEE_CODE}"
        )

        print(
            f"   Name: "
            f"{DEFAULT_FIRST_NAME} "
            f"{DEFAULT_LAST_NAME}"
        )

        print(
            f"   Role: {admin.role.value}"
        )

        print(
            f"   ID: {admin.id}"
        )


# =========================================================
# Main
# =========================================================

if __name__ == "__main__":
    asyncio.run(seed())