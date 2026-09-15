import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import async_session

async def run_migration():
    async with async_session() as db:
        try:
            print("Running migration...")
            await db.execute(text("ALTER TABLE ai_crowdsource_context RENAME COLUMN crowdsource_report_count_30d TO nearby_report_count_30d_snapshot;"))
            await db.commit()
            print("Migration successful!")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(run_migration())
