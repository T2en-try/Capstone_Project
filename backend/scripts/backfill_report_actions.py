"""
Script to backfill initial report_actions for existing road_reports that have no actions.
Run:
    python backend/scripts/backfill_report_actions.py
"""

import asyncio
from datetime import datetime, timezone
from sqlalchemy import select
from app.core.database import async_session
from app.reports.models import RoadReport, ReportAction, ReportStatus

async def backfill():
    async with async_session() as db:
        reports_res = await db.execute(select(RoadReport).order_by(RoadReport.id.asc()))
        reports = reports_res.scalars().all()
        print(f"Total reports found: {len(reports)}")
        
        backfilled_count = 0
        for r in reports:
            # Check if action already exists
            act_res = await db.execute(
                select(ReportAction).where(ReportAction.report_id == r.id).limit(1)
            )
            existing_action = act_res.scalar_one_or_none()
            if existing_action:
                continue

            # Determine initial status
            init_status = ReportStatus.PENDING
            if r.priority_status and r.priority_status.lower() in [s.value for s in ReportStatus]:
                init_status = ReportStatus(r.priority_status.lower())
            elif isinstance(r.status, ReportStatus):
                init_status = r.status
            elif isinstance(r.status, str) and r.status.lower() in [s.value for s in ReportStatus]:
                init_status = ReportStatus(r.status.lower())

            action = ReportAction(
                report_id=r.id,
                officer_id=None,
                previous_status=None,
                new_status=init_status,
                action_note="สร้างรายงานในระบบเริ่มต้น (Initial report entry)",
                action_timestamp=r.created_at or datetime.now(timezone.utc)
            )
            db.add(action)
            backfilled_count += 1

        if backfilled_count > 0:
            await db.commit()
            print(f"[OK] Backfilled {backfilled_count} reports with initial actions in report_actions table.")
        else:
            print("[INFO] All reports already have actions in report_actions.")

if __name__ == "__main__":
    asyncio.run(backfill())
