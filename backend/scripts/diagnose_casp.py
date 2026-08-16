"""
Diagnostic script: Check 6 Reports at every CASP checkpoint
- status, ai_analysis, final_fusion_score, coordinates, Study Area
"""
import asyncio
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from app.core.database import async_session, init_db
from app.reports.models import RoadReport, AIAnalysis, ReportStatus

STUDY_AREA = {
    "lat_min": 14.85, "lat_max": 14.92,
    "lon_min": 101.97, "lon_max": 102.07,
}

def in_study_area(lat, lon):
    if lat is None or lon is None:
        return False
    return (STUDY_AREA["lat_min"] <= lat <= STUDY_AREA["lat_max"] and
            STUDY_AREA["lon_min"] <= lon <= STUDY_AREA["lon_max"])

async def diagnose():
    await init_db()
    async with async_session() as db:
        result = await db.execute(
            select(RoadReport)
            .options(joinedload(RoadReport.ai_analysis))
            .order_by(RoadReport.id)
        )
        reports = result.scalars().all()

        print(f"\n{'='*70}")
        print(f"  CASP DIAGNOSTIC --- Checking {len(reports)} Reports")
        print(f"{'='*70}\n")

        ok_count = 0

        for rpt in reports:
            ai = rpt.ai_analysis
            lat, lon = rpt.latitude, rpt.longitude

            is_completed  = rpt.status == ReportStatus.COMPLETED
            has_ai        = ai is not None
            has_score     = has_ai and ai.final_fusion_score is not None
            score_val     = float(ai.final_fusion_score) if has_score else None
            score_nonzero = score_val is not None and score_val > 0
            in_area       = in_study_area(lat, lon)
            all_pass      = is_completed and has_ai and has_score and score_nonzero and in_area

            if all_pass:
                ok_count += 1
                flag = "[PASS]"
            else:
                flag = "[FAIL]"

            print(f"  Report ID: {rpt.id}  {flag}")
            print(f"    Status         : {rpt.status.value}  {'OK' if is_completed else 'FAIL: not COMPLETED'}")
            print(f"    Lat/Lon        : {lat}, {lon}  {'OK in Study Area' if in_area else 'FAIL: outside Study Area'}")
            print(f"    ai_analysis    : {'OK exists' if has_ai else 'FAIL: missing (AI pipeline not run)'}")
            if has_ai:
                print(f"    final_fusion   : {score_val}  {'OK' if score_nonzero else 'FAIL: is 0 or None'}")
                print(f"    final_decision : {ai.final_decision}")
            print()

        completed    = [r for r in reports if r.status == ReportStatus.COMPLETED]
        has_ai_list  = [r for r in reports if r.ai_analysis]
        in_area_list = [r for r in reports if in_study_area(r.latitude, r.longitude)]
        has_score_list = [r for r in reports
                          if r.ai_analysis and r.ai_analysis.final_fusion_score
                          and float(r.ai_analysis.final_fusion_score) > 0]

        print(f"{'='*70}")
        print(f"  SUMMARY")
        print(f"{'='*70}")
        print(f"  Total Reports           : {len(reports)}")
        print(f"  COMPLETED               : {len(completed)} / {len(reports)}")
        print(f"  Has ai_analysis         : {len(has_ai_list)} / {len(reports)}")
        print(f"  final_fusion_score > 0  : {len(has_score_list)} / {len(reports)}")
        print(f"  Inside Study Area       : {len(in_area_list)} / {len(reports)}")
        print(f"  Pass all conditions     : {ok_count} / {len(reports)}")
        print()

        lats = [r.latitude for r in reports if r.latitude]
        lons = [r.longitude for r in reports if r.longitude]
        if lats:
            print(f"  Actual coordinate range in DB:")
            print(f"    Latitude  : min={min(lats):.5f}  max={max(lats):.5f}")
            print(f"    Longitude : min={min(lons):.5f}  max={max(lons):.5f}")
            print(f"  Current Study Area:")
            print(f"    Lat  {STUDY_AREA['lat_min']} -- {STUDY_AREA['lat_max']}")
            print(f"    Lon  {STUDY_AREA['lon_min']} -- {STUDY_AREA['lon_max']}")
        print()

        print(f"  RECOMMENDATIONS:")
        if len(completed) == 0:
            print(f"  [!] No COMPLETED reports -> CASP will return 0 grids")
        if len(has_score_list) == 0:
            print(f"  [!] All final_fusion_score = 0 or None")
        if len(in_area_list) == 0:
            print(f"  [!] All coordinates outside Study Area -> need to expand STUDY_AREA")
        if ok_count > 0:
            print(f"  [OK] {ok_count} report(s) pass all conditions -> CASP should work")
        print()

asyncio.run(diagnose())
