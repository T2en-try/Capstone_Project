"""Backfill OSM road identity for existing reports.

Re-runs the local cached OSM lookup for completed reports with GPS and updates
ai_gis_context through the AIAnalysis association proxies. No AI inference or
external network request is performed.

Usage (from backend/):
    python scripts/backfill_osm_way_id.py                 # dry run
    python scripts/backfill_osm_way_id.py --apply         # write changes
    python scripts/backfill_osm_way_id.py --apply --limit 20
"""

import argparse
import asyncio
import os
import sys

from sqlalchemy import select

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv()

from app.ai.gee_integration import get_road_type
from app.core.database import async_session
from app.reports.models import AIAnalysis, ReportStatus, RoadReport


def update_gis_context(analysis: AIAnalysis, gis: dict) -> bool:
    """Copy the cached OSM/admin lookup into the normalized GIS satellite row."""
    admin = gis.get("admin") or {}
    values = {
        "road_name": gis.get("road_name"),
        "road_type": gis.get("thai_road_type"),
        "osm_highway_type": gis.get("osm_highway_type"),
        "osm_way_id": gis.get("osm_way_id"),
        "lanes": gis.get("lanes", 2),
        "speed_limit": gis.get("speed_limit", 50.0),
        "admin_province": admin.get("province"),
        "admin_district": admin.get("district"),
        "admin_subdistrict": admin.get("subdistrict"),
    }
    changed = any(getattr(analysis, key) != value for key, value in values.items())
    if changed:
        for key, value in values.items():
            setattr(analysis, key, value)
    return changed


async def run(apply: bool, limit: int | None) -> None:
    async with async_session() as db:
        query = (
            select(RoadReport, AIAnalysis)
            .join(AIAnalysis, AIAnalysis.report_id == RoadReport.id)
            .where(
                RoadReport.status == ReportStatus.COMPLETED,
                RoadReport.latitude.isnot(None),
                RoadReport.longitude.isnot(None),
            )
            .order_by(RoadReport.id)
        )
        if limit:
            query = query.limit(limit)

        rows = (await db.execute(query)).all()
        changed = 0
        errors = 0
        shown = 0

        print(f"Found {len(rows)} completed reports with GPS")
        for report, analysis in rows:
            try:
                gis = get_road_type(report.latitude, report.longitude)
                way_id = gis.get("osm_way_id")
                if shown < 10:
                    print(
                        f"report_id={report.id} lat/lon=({report.latitude:.5f},{report.longitude:.5f}) "
                        f"road={gis.get('road_name')!r} osm_way_id={way_id!r}"
                    )
                    shown += 1
                if update_gis_context(analysis, gis):
                    changed += 1
            except Exception as error:
                errors += 1
                print(f"report_id={report.id} FAILED: {error}")

        if apply:
            await db.commit()
            print(f"Committed {changed} GIS updates; {errors} errors")
        else:
            await db.rollback()
            print(f"DRY RUN: would update {changed} GIS rows; {errors} errors")
            print("Re-run with --apply to write changes")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backfill OSM Way IDs and road names")
    parser.add_argument("--apply", action="store_true", help="Write changes to the database")
    parser.add_argument("--limit", type=int, default=None, help="Process only the first N reports")
    args = parser.parse_args()
    asyncio.run(run(apply=args.apply, limit=args.limit))
