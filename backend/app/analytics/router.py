"""
Analytics Module - Community-Aware Spatial Priority (CASP)
สร้าง Grid Priority โดยคำนวณ CUS (Community Urgency Score) และรวมกับ PPI เดิม

Grid System: Fixed Grid 100×100m
Recency: Exponential Decay R(t) = e^(-t/30)
Formula: CUS = 0.4C + 0.3D + 0.3R
Overall Priority = 0.8×PPI + 0.2×CUS
"""

import math
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.reports.models import RoadReport, AIAnalysis, ReportStatus

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

        # ดึง PPI จาก AIAnalysis (final_fusion_score scale 0-100)
        ppi = 0.0
        if rpt.ai_analysis and rpt.ai_analysis.final_fusion_score is not None:
            ppi = float(rpt.ai_analysis.final_fusion_score)

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
    all_counts = [len(v) for v in grid_map.values()]
    max_count = max(all_counts) if all_counts else 1

    # ─── 4. คำนวณ Density Score (reports per unit area, normalize 0-100) ───────
    # Grid area ≈ 100m × 100m = 10,000 m²
    # Density = count / grid_area_ha → normalize
    max_density_raw = max_count  # normalize เหมือน count (grid area คงที่)

    # ─── 5. คำนวณ CUS และ Overall Priority ────────────────────────────────────
    grids_out: List[GridCellResponse] = []
    summary_count = {"critical": 0, "high": 0, "medium": 0, "low": 0}

    for (row, col), items in grid_map.items():
        bounds = get_grid_bounds(row, col)
        n = len(items)

        # Count Score (C): normalize to 0-100
        c_score = (n / max_count) * 100.0

        # Density Score (D): เหมือน C เนื่องจาก grid คงที่ขนาดเดียวกัน
        # ในกรณีจริงอาจใช้พื้นที่จริงของถนนในกริด แต่ตอนนี้ normalize แบบเดียวกัน
        d_score = (n / max_density_raw) * 100.0

        # Recency Score (R): weighted avg ของ decay ทุก report → scale 0-100
        avg_recency_raw = sum(i["recency"] for i in items) / n
        r_score = avg_recency_raw * 100.0

        # CUS
        cus = W_COUNT * c_score + W_DENSITY * d_score + W_RECENCY * r_score

        # PPI เฉลี่ย
        avg_ppi = sum(i["ppi"] for i in items) / n

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
