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
from app.ai.gee_integration import get_cached_road_geometry, get_nearby_road_segment_density

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

# น้ำหนักสูตร CASP (4-Factor CUS Baseline Defaults)
DEFAULT_W_COUNT = 0.30
DEFAULT_W_DENSITY = 0.25
DEFAULT_W_RECENCY = 0.25
DEFAULT_W_SEGMENT_DENSITY = 0.20

# น้ำหนัก Overall Priority Baseline
DEFAULT_W_PPI = 0.80
DEFAULT_W_CUS = 0.20

# Backward compatibility constants
W_COUNT = DEFAULT_W_COUNT
W_DENSITY = DEFAULT_W_DENSITY
W_RECENCY = DEFAULT_W_RECENCY
W_PPI = DEFAULT_W_PPI
W_CUS = DEFAULT_W_CUS

# ระดับ priority
PRIORITY_LEVELS = [
    (75, "critical", "#ff4d4f"),
    (50, "high", "#fa8c16"),
    (0, "low", "#52c41a"),
]

# CASP Constants
N_MAX_FIXED = 50.0
D_MAX_FIXED = 20.0  # Reports per km
S_MAX_FIXED = 10.0  # Nearby road segments threshold (N_new)

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
    count_score: float             # C: normalize 0-100
    density_score: float           # D: normalize 0-100
    recency_score: float           # R: 0-100 (weighted avg Exponential decay)
    segment_density_score: float   # N_new: 0-100 (Nearby Road Segment Density)
    road_segment_count: int        # จำนวนเส้นถนนจริงในรัศมี 100m
    cus: float                     # Community Urgency Score 0-100 (4-Factor CUS)
    avg_ppi: float                 # PPI เฉลี่ยของ Report ใน Grid
    overall_priority: float        # Overall = w_ppi×PPI + w_cus×CUS
    priority_level: str            # critical / high / medium / low
    priority_color: str            # สีสำหรับแสดงผล
    report_ids: List[int]          # ID ของ Report ที่อยู่ใน Grid


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
    summary="คำนวณ Grid Priority (CASP DSS 4-Factor CUS)",
    description=(
        "ดึงข้อมูล Road Report ที่ COMPLETED แล้ว จัด Grid 100×100m "
        "คำนวณ CUS แบบ 4-Factor = W_C×C + W_D×D + W_R×R + W_N×N_new "
        "และคำนวณ Overall Priority = W_PPI×PPI + W_CUS×CUS รองรับ DSS Dynamic Weights"
    ),
)
async def get_grid_priority(
    days: int = Query(
        default=7,
        ge=1,
        le=365,
        description="ช่วงเวลาย้อนหลัง (วัน) ที่ใช้กรอง Report",
    ),
    w_ppi: Optional[float] = Query(
        default=None,
        ge=0.0,
        le=1.0,
        description="DSS Weight: AI Physical Damage (PPI)",
    ),
    w_cus: Optional[float] = Query(
        default=None,
        ge=0.0,
        le=1.0,
        description="DSS Weight: Community Urgency Score (CUS)",
    ),
    w_c: Optional[float] = Query(
        default=None,
        ge=0.0,
        le=1.0,
        description="DSS CUS Factor: Count Score (C)",
    ),
    w_d: Optional[float] = Query(
        default=None,
        ge=0.0,
        le=1.0,
        description="DSS CUS Factor: Road Density Score (D)",
    ),
    w_r: Optional[float] = Query(
        default=None,
        ge=0.0,
        le=1.0,
        description="DSS CUS Factor: Recency Score (R)",
    ),
    w_n: Optional[float] = Query(
        default=None,
        ge=0.0,
        le=1.0,
        description="DSS CUS Factor: Nearby Road Segment Density (N_new)",
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    CASP DSS Grid Priority Endpoint
    - ดึงเฉพาะ Report ที่ status = COMPLETED (มี PPI แล้ว)
    - กรองตาม study area bbox
    - Assign เข้า Fixed Grid 100×100m
    - คำนวณ 4-Factor CUS (C, D, R, N_new) และ Overall Priority ตามค่าน้ำหนัก DSS
    """

    # ─── DSS Dynamic Weight Normalization ──────────────────────────────────────
    raw_w_ppi = w_ppi if w_ppi is not None else DEFAULT_W_PPI
    raw_w_cus = w_cus if w_cus is not None else DEFAULT_W_CUS
    sum_overall = raw_w_ppi + raw_w_cus
    if sum_overall > 0:
        eff_w_ppi = raw_w_ppi / sum_overall
        eff_w_cus = raw_w_cus / sum_overall
    else:
        eff_w_ppi, eff_w_cus = DEFAULT_W_PPI, DEFAULT_W_CUS

    raw_w_c = w_c if w_c is not None else DEFAULT_W_COUNT
    raw_w_d = w_d if w_d is not None else DEFAULT_W_DENSITY
    raw_w_r = w_r if w_r is not None else DEFAULT_W_RECENCY
    raw_w_n = w_n if w_n is not None else DEFAULT_W_SEGMENT_DENSITY
    sum_cus = raw_w_c + raw_w_d + raw_w_r + raw_w_n
    if sum_cus > 0:
        eff_w_c = raw_w_c / sum_cus
        eff_w_d = raw_w_d / sum_cus
        eff_w_r = raw_w_r / sum_cus
        eff_w_n = raw_w_n / sum_cus
    else:
        eff_w_c, eff_w_d, eff_w_r, eff_w_n = (
            DEFAULT_W_COUNT,
            DEFAULT_W_DENSITY,
            DEFAULT_W_RECENCY,
            DEFAULT_W_SEGMENT_DENSITY,
        )

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

    applied_weights = {
        "w_ppi": round(eff_w_ppi, 4),
        "w_cus": round(eff_w_cus, 4),
        "w_c": round(eff_w_c, 4),
        "w_d": round(eff_w_d, 4),
        "w_r": round(eff_w_r, 4),
        "w_n": round(eff_w_n, 4),
    }

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
                "dss_weights_applied": applied_weights,
            },
        )

    # ─── 3. คำนวณ 4-Factor CUS และ Overall Priority ─────────────────────────────
    grids_out: List[GridCellResponse] = []
    summary_count = {"critical": 0, "high": 0, "low": 0}

    for (row, col), items in grid_map.items():
        bounds = get_grid_bounds(row, col)
        n = len(items)
        grid_key = f"{row}_{col}"

        # 1) Count Score (C): normalize to 0-100 using fixed denominator
        c_score = min((n / N_MAX_FIXED) * 100.0, 100.0)

        # 2) Density Score (D): Reports per km of road
        road_length_km = GRID_ROAD_LENGTH_CACHE.get(grid_key, 0.0)
        if road_length_km > 0:
            density_raw = n / road_length_km
        else:
            # ถ้าไม่มีถนนผ่านเลยใน cache (เช่น error) แต่มีคนแจ้งเหตุ ถือว่าหนาแน่นสูงมาก
            density_raw = D_MAX_FIXED
        d_score = min((density_raw / D_MAX_FIXED) * 100.0, 100.0)

        # 3) Recency Score (R): weighted avg ของ decay ทุก report → scale 0-100
        avg_recency_raw = sum(i["recency"] for i in items) / n
        r_score = avg_recency_raw * 100.0

        # 4) Nearby Road Segment Density (N_new): จำนวนเส้นถนนในรัศมี 100m
        segment_count = get_nearby_road_segment_density(
            bounds["lat_center"], bounds["lon_center"], radius_meters=100.0
        )
        n_score = min((segment_count / S_MAX_FIXED) * 100.0, 100.0)

        # 4-Factor CUS Calculation
        cus = (
            eff_w_c * c_score
            + eff_w_d * d_score
            + eff_w_r * r_score
            + eff_w_n * n_score
        )
        cus = min(100.0, max(0.0, cus))

        # PPI เฉลี่ย
        ppi_values = [i["ppi"] for i in items if i["ppi"] is not None]
        avg_ppi = sum(ppi_values) / len(ppi_values) if ppi_values else 0.0

        # Overall Priority: W_PPI×PPI + W_CUS×CUS
        overall = eff_w_ppi * avg_ppi + eff_w_cus * cus
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
                segment_density_score=round(n_score, 2),
                road_segment_count=segment_count,
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
            "dss_weights_applied": applied_weights,
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
