"""
Migration: Add priority_status column to road_reports table.
Sets default value to 'pending' for all existing rows.
"""
import asyncio
from app.core.database import engine
from sqlalchemy import text


async def migrate():
    async with engine.begin() as conn:
        # Check if column already exists
        result = await conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'road_reports' AND column_name = 'priority_status'"
        ))
        if result.first():
            print("[SKIP] Column 'priority_status' already exists.")
            return

        # Add the column with a default value
        await conn.execute(text(
            "ALTER TABLE road_reports "
            "ADD COLUMN priority_status VARCHAR(50) NOT NULL DEFAULT 'pending'"
        ))
        print("[OK] Added column 'priority_status' to road_reports with default 'pending'.")

        # Verify
        result = await conn.execute(text(
            "SELECT id, status, priority_status FROM road_reports ORDER BY id"
        ))
        for row in result.all():
            print(f"  report_id={row[0]} status={row[1]} priority_status={row[2]}")


if __name__ == "__main__":
    asyncio.run(migrate())
