"""
Analytics Module - Community-Aware Spatial Priority (CASP)
สร้าง Grid Priority โดยคำนวณ CUS (Community Urgency Score) และรวมกับ PPI เดิม

Grid System: Fixed Grid 100×100m
Recency: Exponential Decay R(t) = e^(-t/30)
Formula: CUS = 0.4C + 0.3D + 0.3R
Overall Priority = 0.8×PPI + 0.2×CUS
"""

import math
import os
import pandas as pd
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.reports.models import RoadReport, AIAnalysis, ReportStatus
from app.ai.feature_mapping import PRIORITY_ANCHORS
from app.ai.gee_integration import get_cached_road_geometry

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


# ─── Config: Study Area (มทส. และบริเวณโดยรอบ) ───────────────────────────────
# ปรับ bbox ให้ครอบคลุมพื้นที่ศึกษา
STUDY_AREA = {
    "lat_min": 14.85,
    "lat_max": 14.92,
    "lon_min": 101.97,
    "lon_max": 102.07,
}

# ขนาด Grid ≈ 100m (1 degree lat ≈ 111 km → 100m ≈ 0.0009 degree)
GRID_SIZE_DEG_LAT = 0.0009  # ~100m ในแนวเหนือ-ใต้
GRID_SIZE_DEG_LON = 0.0009  # ~100m ในแนวออก-ตก (ใกล้เส้นศูนย์สูตร)

# Exponential decay τ = 30 วัน
DECAY_TAU = 30.0

# น้ำหนักสูตร CASP
W_COUNT = 0.4
W_DENSITY = 0.3
W_RECENCY = 0.3

# น้ำหนัก Overall Priority
W_PPI = 0.8
W_CUS = 0.2

# ระดับ priority
PRIORITY_LEVELS = [
    (75, "critical", "#ff4d4f"),
    (50, "high", "#fa8c16"),
    (25, "medium", "#fadb14"),
    (0, "low", "#52c41a"),
]

# CASP Constants
N_MAX_FIXED = 50.0
D_MAX_FIXED = 20.0  # Reports per km

# Load Grid Road Length Cache
GRID_ROAD_LENGTH_CACHE = {}
try:
    cache_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "cached_grid_road_length.parquet")
    if os.path.exists(cache_path):
        df = pd.read_parquet(cache_path)
        GRID_ROAD_LENGTH_CACHE = df.set_index("grid_key")["road_length_km"].to_dict()
        print(f"Loaded {len(GRID_ROAD_LENGTH_CACHE)} grid road lengths.")
except Exception as e:
    print(f"Warning: Could not load road length cache: {e}")


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class GridCellResponse(BaseModel):
    grid_id: str
    lat_center: float
    lon_center: float
    lat_min: float
    lat_max: float
    lon_min: float
    lon_max: float
    report_count: int
    count_score: float       # C: normalize 0-100
    density_score: float     # D: normalize 0-100
    recency_score: float     # R: 0-100 (weighted avg Exponential decay)
    cus: float               # Community Urgency Score 0-100
    avg_ppi: float           # PPI เฉลี่ยของ Report ใน Grid
    overall_priority: float  # Overall = 0.8×PPI + 0.2×CUS
    priority_level: str      # critical / high / medium / low
    priority_color: str      # สีสำหรับแสดงผล
    report_ids: List[int]    # ID ของ Report ที่อยู่ใน Grid


class GridPriorityResponse(BaseModel):
    generated_at: str
    total_grids_with_reports: int
    study_area: dict
    grids: List[GridCellResponse]
    summary: dict


class RoadSegmentPriorityItem(BaseModel):
    segment_id: int
    road_name: Optional[str] = None
    road_type: Optional[str] = None
    admin_province: Optional[str] = None
    admin_district: Optional[str] = None
    report_count: int
    priority_class: Optional[int] = None
    priority_label: str
    priority_score: Optional[float] = None
    confidence_score: Optional[float] = None
    worst_report_id: Optional[int] = None
    geometry: Optional[dict] = None
    report_ids: List[int]


class RoadSegmentPriorityResponse(BaseModel):
    generated_at: str
    aggregation_method: str
    total_segments: int
    total_reports_analyzed: int
    segments: List[RoadSegmentPriorityItem]


# ─── Helper Functions ─────────────────────────────────────────────────────────

def get_grid_id(lat: float, lon: float) -> tuple:
    """คำนวณ Grid Index จากพิกัด"""
    row = int((lat - STUDY_AREA["lat_min"]) / GRID_SIZE_DEG_LAT)
    col = int((lon - STUDY_AREA["lon_min"]) / GRID_SIZE_DEG_LON)
    return row, col


def get_grid_bounds(row: int, col: int) -> dict:
    """คำนวณขอบเขตของ Grid Cell"""
    lat_min = STUDY_AREA["lat_min"] + row * GRID_SIZE_DEG_LAT
    lat_max = lat_min + GRID_SIZE_DEG_LAT
    lon_min = STUDY_AREA["lon_min"] + col * GRID_SIZE_DEG_LON
    lon_max = lon_min + GRID_SIZE_DEG_LON
    return {
        "lat_min": round(lat_min, 6),
        "lat_max": round(lat_max, 6),
        "lon_min": round(lon_min, 6),
        "lon_max": round(lon_max, 6),
        "lat_center": round((lat_min + lat_max) / 2, 6),
        "lon_center": round((lon_min + lon_max) / 2, 6),
    }


def compute_recency_score(created_at: datetime) -> float:
    """R(t) = e^(-t/τ), τ = 30 วัน → ค่าอยู่ใน 0-1"""
    now = datetime.now(timezone.utc)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    days = (now - created_at).total_seconds() / 86400.0
    return math.exp(-days / DECAY_TAU)


def classify_priority(overall: float) -> tuple:
    """จัดระดับ priority → (level_str, color)"""
    for threshold, level, color in PRIORITY_LEVELS:
        if overall >= threshold:
            return level, color
    return "low", "#52c41a"


# ─── Main Endpoint ────────────────────────────────────────────────────────────

@router.get(
    "/grid-priority",
    response_model=GridPriorityResponse,
    summary="คำนวณ Grid Priority (CASP)",
    description=(
        "ดึงข้อมูล Road Report ที่ COMPLETED แล้ว จัด Grid 100×100m "
        "คำนวณ CUS = 0.4C + 0.3D + 0.3R และ Overall Priority = 0.8×PPI + 0.2×CUS"
    ),
)
async def get_grid_priority(
    days: int = Query(
        default=7,
        ge=1,
        le=365,
        description="ช่วงเวลาย้อนหลัง (วัน) ที่ใช้กรอง Report",
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    CASP Grid Priority Endpoint
    - ดึงเฉพาะ Report ที่ status = COMPLETED (มี PPI แล้ว)
    - กรองตาม study area bbox
    - Assign เข้า Fixed Grid 100×100m
    - คำนวณ CUS และ Overall Priority
    """

    # ─── 1. Query Reports ──────────────────────────────────────────────────────
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(RoadReport)
        .options(joinedload(RoadReport.ai_analysis))
        .where(
            RoadReport.status == ReportStatus.COMPLETED,
            RoadReport.latitude.isnot(None),
            RoadReport.longitude.isnot(None),
            RoadReport.latitude >= STUDY_AREA["lat_min"],
            RoadReport.latitude <= STUDY_AREA["lat_max"],
            RoadReport.longitude >= STUDY_AREA["lon_min"],
            RoadReport.longitude <= STUDY_AREA["lon_max"],
            RoadReport.created_at >= cutoff,
        )
        .order_by(RoadReport.created_at.desc())
    )
    reports = result.scalars().all()

    # ─── 2. Assign Reports → Grid ──────────────────────────────────────────────
    # grid_map: (row, col) → list of (report, recency_score, ppi)
    grid_map: dict = {}

    for rpt in reports:
        row, col = get_grid_id(rpt.latitude, rpt.longitude)
        recency = compute_recency_score(rpt.created_at)

        # PPI-equivalent: confidence-weighted expected value over the RF's full
        # class-probability distribution (PRIORITY_ANCHORS shared with engine.py's
        # deprecated final_fusion_score computation -- same anchors, not a second,
        # independently-arbitrary copy). None (not 0.0) when priority_class/proba_*
        # aren't populated -- lets this report be excluded from the PPI mean below
        # rather than silently dragging the grid cell's average toward 0.
        ppi = None
        ana = rpt.ai_analysis
        if ana and ana.priority_class is not None:
            ppi = (
                ana.proba_normal * PRIORITY_ANCHORS[1]
                + ana.proba_warning * PRIORITY_ANCHORS[2]
                + ana.proba_critical * PRIORITY_ANCHORS[3]
            )

        key = (row, col)
        if key not in grid_map:
            grid_map[key] = []
        grid_map[key].append({
            "report_id": rpt.id,
            "recency": recency,
            "ppi": ppi,
        })

    if not grid_map:
        return GridPriorityResponse(
            generated_at=datetime.now(timezone.utc).isoformat(),
            total_grids_with_reports=0,
            study_area=STUDY_AREA,
            grids=[],
            summary={
                "critical": 0,
                "high": 0,
                "medium": 0,
                "low": 0,
                "total_reports_analyzed": 0,
            },
        )

    # ─── 3. คำนวณ Count Score (normalize 0-100) ────────────────────────────────
    # ใช้ N_MAX_FIXED เพื่อให้คะแนนเสถียร แทนที่จะแกว่งตาม max() ของข้อมูลปัจจุบัน
    
    # ─── 4. คำนวณ Density Score (reports per unit area, normalize 0-100) ───────
    # ใช้ความยาวถนนจริง (km) จาก cache แทนพื้นที่กริด

    # ─── 5. คำนวณ CUS และ Overall Priority ────────────────────────────────────
    grids_out: List[GridCellResponse] = []
    summary_count = {"critical": 0, "high": 0, "medium": 0, "low": 0}

    for (row, col), items in grid_map.items():
        bounds = get_grid_bounds(row, col)
        n = len(items)
        grid_key = f"{row}_{col}"

        # Count Score (C): normalize to 0-100 using fixed denominator
        c_score = min((n / N_MAX_FIXED) * 100.0, 100.0)

        # Density Score (D): Reports per km of road
        road_length_km = GRID_ROAD_LENGTH_CACHE.get(grid_key, 0.0)
        
        if road_length_km > 0:
            density_raw = n / road_length_km
        else:
            # ถ้าไม่มีถนนผ่านเลยใน cache (เช่น error) แต่มีคนแจ้งเหตุ ถือว่าหนาแน่นสูงมาก
            density_raw = D_MAX_FIXED
            
        d_score = min((density_raw / D_MAX_FIXED) * 100.0, 100.0)

        # Recency Score (R): weighted avg ของ decay ทุก report → scale 0-100
        avg_recency_raw = sum(i["recency"] for i in items) / n
        r_score = avg_recency_raw * 100.0

        # CUS
        cus = W_COUNT * c_score + W_DENSITY * d_score + W_RECENCY * r_score

        # PPI เฉลี่ย -- averaged only over reports with a real prediction; a report
        # with priority_class/proba_* still NULL (not yet backfilled / RF didn't
        # run) is dropped from this mean, not counted as 0. Report volume signals
        # (count_score/density_score/recency_score/report_count above) are
        # unaffected -- they still reflect every report in the cell.
        ppi_values = [i["ppi"] for i in items if i["ppi"] is not None]
        avg_ppi = sum(ppi_values) / len(ppi_values) if ppi_values else 0.0

        # Overall Priority
        overall = W_PPI * avg_ppi + W_CUS * cus
        overall = min(100.0, max(0.0, overall))

        level, color = classify_priority(overall)
        summary_count[level] += 1

        grids_out.append(
            GridCellResponse(
                grid_id=f"G_{row}_{col}",
                lat_center=bounds["lat_center"],
                lon_center=bounds["lon_center"],
                lat_min=bounds["lat_min"],
                lat_max=bounds["lat_max"],
                lon_min=bounds["lon_min"],
                lon_max=bounds["lon_max"],
                report_count=n,
                count_score=round(c_score, 2),
                density_score=round(d_score, 2),
                recency_score=round(r_score, 2),
                cus=round(cus, 2),
                avg_ppi=round(avg_ppi, 2),
                overall_priority=round(overall, 2),
                priority_level=level,
                priority_color=color,
                report_ids=[i["report_id"] for i in items],
            )
        )

    # เรียงตาม Overall Priority สูงสุดก่อน
    grids_out.sort(key=lambda x: x.overall_priority, reverse=True)

    return GridPriorityResponse(
        generated_at=datetime.now(timezone.utc).isoformat(),
        total_grids_with_reports=len(grids_out),
        study_area=STUDY_AREA,
        grids=grids_out,
        summary={
            **summary_count,
            "total_reports_analyzed": len(reports),
        },
    )


@router.get(
    "/road-segment-priority",
    response_model=RoadSegmentPriorityResponse,
    summary="รวม Priority ตามช่วงถนนจาก OSM Way ID",
)
async def get_road_segment_priority(
    days: int = Query(default=30, ge=1, le=365, description="ช่วงเวลาย้อนหลัง (วัน)"),
    db: AsyncSession = Depends(get_db),
):
    """รวมรายงานที่อยู่บน OSM Way เดียวกันด้วย Max Severity.

    ใช้ priority_class จาก Decision Head เป็นแหล่งข้อมูลหลักและไม่นำ
    final_fusion_score ซึ่งเป็น legacy score มาใช้จัดอันดับ.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(RoadReport)
        .options(joinedload(RoadReport.ai_analysis))
        .where(
            RoadReport.status == ReportStatus.COMPLETED,
            RoadReport.created_at >= cutoff,
            RoadReport.latitude.isnot(None),
            RoadReport.longitude.isnot(None),
        )
        .order_by(RoadReport.created_at.desc())
    )
    reports = result.scalars().all()
    grouped: dict[int, list[RoadReport]] = {}

    for report in reports:
        analysis = report.ai_analysis
        if analysis is None or analysis.osm_way_id is None:
            continue
        grouped.setdefault(int(analysis.osm_way_id), []).append(report)

    def class_value(report: RoadReport) -> int | None:
        value = report.ai_analysis.priority_class if report.ai_analysis else None
        if value is None:
            return None
        return int(value.value) if hasattr(value, "value") else int(value)

    labels = {1: "Normal", 2: "Warning", 3: "Critical"}
    items: list[RoadSegmentPriorityItem] = []
    for segment_id, segment_reports in grouped.items():
        ranked = sorted(
            segment_reports,
            key=lambda report: class_value(report) or 0,
            reverse=True,
        )
        worst = ranked[0]
        worst_class = class_value(worst)
        worst_analysis = worst.ai_analysis
        items.append(
            RoadSegmentPriorityItem(
                segment_id=segment_id,
                road_name=worst_analysis.road_name if worst_analysis else None,
                road_type=worst_analysis.road_type if worst_analysis else None,
                admin_province=worst_analysis.admin_province if worst_analysis else None,
                admin_district=worst_analysis.admin_district if worst_analysis else None,
                report_count=len(segment_reports),
                priority_class=worst_class,
                priority_label=labels.get(worst_class, "ไม่มีผลวิเคราะห์"),
                priority_score=(
                    float(worst_analysis.final_fusion_score)
                    if worst_analysis and worst_analysis.final_fusion_score is not None
                    else None
                ),
                confidence_score=worst_analysis.confidence_score if worst_analysis else None,
                worst_report_id=worst.id,
                geometry=get_cached_road_geometry(segment_id),
                report_ids=[report.id for report in segment_reports],
            )
        )

    items.sort(
        key=lambda item: (item.priority_class or 0, item.report_count),
        reverse=True,
    )
    return RoadSegmentPriorityResponse(
        generated_at=datetime.now(timezone.utc).isoformat(),
        aggregation_method="max_severity",
        total_segments=len(items),
        total_reports_analyzed=sum(len(value) for value in grouped.values()),
        segments=items,
    )
