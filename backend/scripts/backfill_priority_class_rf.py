"""
backfill_priority_class_rf.py
------------------------------
Retroactively populates priority_class / confidence_score / proba_* for
every existing COMPLETED report whose AIAnalysis predates the Random Forest
Decision Head (Step 4) -- currently all 1,382 reports in road_reports_batch_db,
since the columns didn't exist until this session's schema migration.

Does NOT re-run CV inference or re-fetch GEE (no images, no network calls,
no cost) -- reuses already-stored AIAnalysis columns for cv_max_severity_score,
cv_damage_ratio_percent, rainfall_last_12m_mm, soil_moisture_last_30d_mm,
community_impact_score_pi.

The one exception is road/speed-limit/surface context: speed_limit_source and
surface_osm_tag were never persisted columns on AIAnalysis (only the
resulting speed_limit value and the now-deprecated estimated_surface_material
were). Rather than treating this as a blocker, this follows the exact
precedent already established in this codebase by
backend/scripts/backfill_speed_limit_source.py: re-run get_road_type(lat, lon)
live against the local OSM cache (cached_driving_network.parquet), using each
report's already-stored coordinates. This is fast (local parquet
nearest-neighbor lookup, no network) and deterministic -- the same function
the live backend uses today, confirmed stable across this project's entire
git history (see Step 4's verification chain).

Dry-run by default (--apply required to actually write). Always prints a
sample of before/after values for manual spot-checking before committing to
a full run.

Usage (run from backend/):
    python scripts/backfill_priority_class_rf.py              # dry run
    python scripts/backfill_priority_class_rf.py --apply       # writes for real
    python scripts/backfill_priority_class_rf.py --apply --limit 20   # small batch first

--sync-decision mode
--------------------
A follow-up fix, added after the initial backfill above had already run:
that first pass intentionally only wrote priority_class/confidence_score/
proba_* and left the deprecated final_decision/final_fusion_score columns
alone (they predate the RF and were out of scope at the time). The result --
confirmed empirically against the live DB -- is that for the ~1,381 rows it
touched, final_decision/final_fusion_score are stale: they still reflect the
old synthetic ml_engine's output, not the priority_class next to them. Only
188/1,381 rows had a final_decision that actually agreed with the label
FINAL_DECISION_LABELS[priority_class] would produce.

--sync-decision recomputes final_decision (via FINAL_DECISION_LABELS) and
final_fusion_score (via the same proba-weighted PRIORITY_ANCHORS expected
value engine.py's calculate_priority_index() and CASP's avg_ppi use) purely
from each row's already-stored priority_class/proba_normal/proba_warning/
proba_critical -- no RF re-inference, no GEE/OSM calls, pure arithmetic.
Only rows where the recomputed value actually differs from what's stored are
touched/counted. Dry-run by default, same --apply/--limit flags.

    python scripts/backfill_priority_class_rf.py --sync-decision              # dry run
    python scripts/backfill_priority_class_rf.py --sync-decision --apply      # writes for real
"""

import argparse
import asyncio
import os
import sys

import joblib
from sqlalchemy import select

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except AttributeError:
    pass

from dotenv import load_dotenv  # noqa: E402
load_dotenv()

from app.core.database import async_session  # noqa: E402
from app.reports.models import RoadReport, AIAnalysis, ReportStatus, PriorityClass  # noqa: E402
from app.ai.gee_integration import get_road_type  # noqa: E402
from app.ai.feature_mapping import (  # noqa: E402
    build_feature_row, predict_priority, PRIORITY_ANCHORS, FINAL_DECISION_LABELS,
)

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models", "priority_class_rf_v1.pkl")


async def run(apply: bool, limit: int | None):
    artifact = joblib.load(MODEL_PATH)
    print(f"Loaded model: features={len(artifact['feature_names'])}, trained_at={artifact.get('trained_at_utc')}")

    async with async_session() as db:
        query = (
            select(RoadReport, AIAnalysis)
            .join(AIAnalysis, AIAnalysis.report_id == RoadReport.id)
            .where(
                RoadReport.status == ReportStatus.COMPLETED,
                RoadReport.latitude.isnot(None),
                RoadReport.longitude.isnot(None),
                AIAnalysis.priority_class.is_(None),
            )
            .order_by(RoadReport.id)
        )
        if limit:
            query = query.limit(limit)

        result = await db.execute(query)
        rows = result.all()
        print(f"Found {len(rows)} reports needing backfill (COMPLETED, has GPS, priority_class IS NULL)")

        updated, errors = 0, 0
        sample_shown = 0
        for report, analysis in rows:
            try:
                cv_features = {
                    "cv_max_severity_score": analysis.cv_max_severity_score,
                    "cv_damage_ratio_percent": analysis.cv_damage_ratio_percent,
                }
                gee = {
                    "rainfall_last_12m_mm": analysis.rainfall_last_12m_mm,
                    "soil_moisture_last_30d_mm": analysis.soil_moisture_last_30d_mm,
                }
                poi = {"community_impact_score_pi": analysis.community_impact_score_pi}

                # the one field genuinely re-derived, not stored -- live local-cache
                # lookup, no network cost, same function/logic the live backend uses
                gis = get_road_type(report.latitude, report.longitude)

                row = build_feature_row(cv_features, gee, gis, poi)
                rf_result = predict_priority(row, artifact)

                if sample_shown < 10:
                    print(
                        f"  report_id={report.id} Image lat/lon=({report.latitude:.5f},{report.longitude:.5f}) "
                        f"thai_road_type={gis.get('thai_road_type')!r} surface_osm_tag={gis.get('surface_osm_tag')!r} "
                        f"-> priority_class={rf_result['priority_class']} confidence={rf_result['confidence_score']:.3f}"
                    )
                    sample_shown += 1

                if apply:
                    analysis.priority_class = PriorityClass(rf_result["priority_class"])
                    analysis.confidence_score = rf_result["confidence_score"]
                    analysis.proba_normal = rf_result["proba_normal"]
                    analysis.proba_warning = rf_result["proba_warning"]
                    analysis.proba_critical = rf_result["proba_critical"]

                updated += 1
            except Exception as e:
                errors += 1
                print(f"  !! report_id={report.id} FAILED: {e}")

        if apply:
            await db.commit()
            print(f"\nCommitted. Updated {updated} rows, {errors} errors.")
        else:
            await db.rollback()
            print(f"\nDRY RUN -- nothing written. Would update {updated} rows, {errors} would error.")
            print("Re-run with --apply to write for real.")


async def sync_decision(apply: bool, limit: int | None):
    """Recompute final_decision/final_fusion_score from each row's already-stored
    priority_class/proba_* -- see the --sync-decision docstring above. Pure
    arithmetic, no RF re-inference, no GEE/OSM calls."""
    async with async_session() as db:
        query = (
            select(AIAnalysis)
            .where(AIAnalysis.priority_class.isnot(None))
            .order_by(AIAnalysis.report_id)
        )
        if limit:
            query = query.limit(limit)

        result = await db.execute(query)
        rows = result.scalars().all()
        print(f"Found {len(rows)} rows with priority_class populated")

        updated, unchanged, sample_shown = 0, 0, 0
        for analysis in rows:
            priority_value = analysis.priority_class.value  # PriorityClass is an IntEnum
            new_decision = FINAL_DECISION_LABELS[priority_value]
            new_fusion_score = round(
                analysis.proba_normal * PRIORITY_ANCHORS[1]
                + analysis.proba_warning * PRIORITY_ANCHORS[2]
                + analysis.proba_critical * PRIORITY_ANCHORS[3],
                2,
            )

            if analysis.final_decision == new_decision and analysis.final_fusion_score == new_fusion_score:
                unchanged += 1
                continue

            if sample_shown < 10:
                print(
                    f"  report_id={analysis.report_id} priority_class={priority_value} "
                    f"final_decision: {analysis.final_decision!r} -> {new_decision!r} | "
                    f"final_fusion_score: {analysis.final_fusion_score} -> {new_fusion_score}"
                )
                sample_shown += 1

            if apply:
                analysis.final_decision = new_decision
                analysis.final_fusion_score = new_fusion_score
            updated += 1

        if apply:
            await db.commit()
            print(f"\nCommitted. Updated {updated} rows, {unchanged} already consistent.")
        else:
            await db.rollback()
            print(f"\nDRY RUN -- nothing written. Would update {updated} rows, {unchanged} already consistent.")
            print("Re-run with --sync-decision --apply to write for real.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="Actually write changes (default: dry run)")
    parser.add_argument("--limit", type=int, default=None, help="Only process the first N matching reports")
    parser.add_argument(
        "--sync-decision", action="store_true",
        help="Run the final_decision/final_fusion_score consistency fix instead of the priority_class backfill",
    )
    args = parser.parse_args()
    if args.sync_decision:
        asyncio.run(sync_decision(apply=args.apply, limit=args.limit))
    else:
        asyncio.run(run(apply=args.apply, limit=args.limit))
