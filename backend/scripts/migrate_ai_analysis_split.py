"""
migrate_ai_analysis_split.py
-----------------------------
Populates the 7 new AIAnalysis satellite tables (ai_cv_features, ai_gee_context,
ai_gis_context, ai_poi_context, ai_crowdsource_context, ai_priority_decision,
ai_legacy_scores) from the still-intact wide columns on ai_analyses.

Purely additive: this script only INSERTs into the 7 new tables. It never reads
anything but the existing wide columns and never writes to ai_analyses itself --
the old columns are left completely alone (rollback window: if anything here is
wrong, the new tables can be dropped/truncated and re-run with zero data loss,
since ai_analyses remains the single source of truth until the app is actually
switched over to reading from the satellites).

Idempotent: skips any (report's) analysis_id that already has a row in
ai_priority_decision (used as the "already migrated" marker since it's the last
table written per row) so re-running after a partial run or to pick up newly
created reports is safe.

Modes:
    python scripts/migrate_ai_analysis_split.py                  # dry run
    python scripts/migrate_ai_analysis_split.py --apply           # writes for real
    python scripts/migrate_ai_analysis_split.py --apply --limit 20   # small batch first
    python scripts/migrate_ai_analysis_split.py --verify          # full field-by-field
                                                                    # diff: old wide columns
                                                                    # vs new satellite tables,
                                                                    # for every row
"""

import argparse
import asyncio
import os
import sys

from sqlalchemy import select

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except AttributeError:
    pass

from dotenv import load_dotenv  # noqa: E402
load_dotenv()

from app.core.database import async_session  # noqa: E402
from app.reports.models import (  # noqa: E402
    AIAnalysis, AiCvFeatures, AiGeeContext, AiGisContext, AiPoiContext,
    AiCrowdsourceContext, AiPriorityDecision, AiLegacyScores,
)

# Field lists per satellite -- single source of truth for both the migration
# and the --verify diff below, so they can't silently drift apart from each other.
CV_FIELDS = ["cv_defect_count", "cv_damage_ratio_percent", "cv_max_severity_score",
             "cv_details_json", "annotated_image_filename"]
GEE_FIELDS = ["rainfall_last_12m_mm", "soil_moisture_last_30d_mm", "ndvi_index",
              "estimated_surface_material", "nightlight_radiance", "slope"]
GIS_FIELDS = ["road_name", "road_type", "osm_highway_type", "osm_way_id", "lanes",
              "speed_limit", "admin_province", "admin_district", "admin_subdistrict"]
POI_FIELDS = ["community_impact_score_pi", "nearest_poi_distance_m"]
CROWD_FIELDS = ["crowdsource_report_count_30d", "days_since_last_report", "user_severity_score_avg"]
DECISION_FIELDS = ["heuristic_score", "fuzzy_score", "ml_score", "priority_class",
                    "confidence_score", "proba_normal", "proba_warning", "proba_critical",
                    "gps_anomaly_flagged", "gps_anomaly_reason"]
LEGACY_FIELDS = ["final_fusion_score", "final_decision"]

SATELLITES = [
    (AiCvFeatures, CV_FIELDS),
    (AiGeeContext, GEE_FIELDS),
    (AiGisContext, GIS_FIELDS),
    (AiPoiContext, POI_FIELDS),
    (AiCrowdsourceContext, CROWD_FIELDS),
    (AiPriorityDecision, DECISION_FIELDS),
    (AiLegacyScores, LEGACY_FIELDS),
]


def _row_kwargs(ana, fields):
    return {f: getattr(ana, f) for f in fields}


async def run(apply: bool, limit: int | None):
    async with async_session() as db:
        # "already migrated" marker: has a row in ai_priority_decision
        already = await db.execute(select(AiPriorityDecision.analysis_id))
        already_ids = {row[0] for row in already.fetchall()}

        query = select(AIAnalysis).order_by(AIAnalysis.id)
        if limit:
            query = query.limit(limit)
        result = await db.execute(query)
        rows = result.scalars().all()

        todo = [ana for ana in rows if ana.id not in already_ids]
        print(f"Found {len(rows)} ai_analyses rows total, {len(todo)} not yet migrated "
              f"({len(rows) - len(todo)} already have satellite rows -- skipped)")

        sample_shown = 0
        for ana in todo:
            if sample_shown < 5:
                print(f"  report_id={ana.report_id} analysis_id={ana.id} -> "
                      f"cv_defect_count={ana.cv_defect_count} priority_class={ana.priority_class} "
                      f"final_decision={ana.final_decision!r}")
                sample_shown += 1

            if apply:
                for model_cls, fields in SATELLITES:
                    db.add(model_cls(analysis_id=ana.id, **_row_kwargs(ana, fields)))

        if apply:
            await db.commit()
            print(f"\nCommitted. Migrated {len(todo)} rows x 7 satellite tables.")
        else:
            await db.rollback()
            print(f"\nDRY RUN -- nothing written. Would migrate {len(todo)} rows.")
            print("Re-run with --apply to write for real.")


async def verify():
    """Full field-by-field diff: every ai_analyses row's wide-column values vs its
    7 satellite rows' values. Prints mismatches (expect zero) and a final summary."""
    async with async_session() as db:
        result = await db.execute(select(AIAnalysis).order_by(AIAnalysis.id))
        rows = result.scalars().all()
        print(f"Verifying {len(rows)} ai_analyses rows against their satellite tables...")

        satellite_maps = {}
        for model_cls, _fields in SATELLITES:
            res = await db.execute(select(model_cls))
            satellite_maps[model_cls] = {obj.analysis_id: obj for obj in res.scalars().all()}

        mismatches = 0
        missing_satellite_rows = 0
        checked_fields = 0
        for ana in rows:
            for model_cls, fields in SATELLITES:
                sat = satellite_maps[model_cls].get(ana.id)
                if sat is None:
                    print(f"  !! report_id={ana.report_id} analysis_id={ana.id}: "
                          f"missing row in {model_cls.__tablename__}")
                    missing_satellite_rows += 1
                    continue
                for f in fields:
                    checked_fields += 1
                    old_val = getattr(ana, f)
                    new_val = getattr(sat, f)
                    if old_val != new_val:
                        print(f"  !! MISMATCH report_id={ana.report_id} {model_cls.__tablename__}.{f}: "
                              f"old={old_val!r} new={new_val!r}")
                        mismatches += 1

        print(f"\nChecked {len(rows)} rows x 7 satellites, {checked_fields} field comparisons.")
        print(f"Missing satellite rows: {missing_satellite_rows}")
        print(f"Field-value mismatches: {mismatches}")
        if missing_satellite_rows == 0 and mismatches == 0:
            print("VERIFIED: all rows migrated, all fields match exactly.")
        else:
            print("VERIFICATION FAILED -- see above.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="Actually write changes (default: dry run)")
    parser.add_argument("--limit", type=int, default=None, help="Only process the first N ai_analyses rows")
    parser.add_argument("--verify", action="store_true", help="Run the full old-vs-new field diff instead of migrating")
    args = parser.parse_args()
    if args.verify:
        asyncio.run(verify())
    else:
        asyncio.run(run(apply=args.apply, limit=args.limit))
