"""
Road Report Backend - Pydantic Schemas
โมเดลสำหรับ Validation ข้อมูลขาเข้า/ขาออกของ API (3-Table Schema Compatibility)
"""

from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, computed_field, ConfigDict


# ─── Request Schemas ───────────────────────────────────────────

class ReportCreateManual(BaseModel):
    """Schema สำหรับกรณีผู้ใช้ส่งพิกัดมาเอง (ไม่มี EXIF)"""
    latitude: Optional[float] = Field(None, ge=-90, le=90, description="ละติจูด")
    longitude: Optional[float] = Field(None, ge=-180, le=180, description="ลองจิจูด")
    description: Optional[str] = Field(None, max_length=1000, description="คำอธิบายเพิ่มเติม")
    reporter_name: Optional[str] = Field(None, max_length=100, description="ชื่อผู้รายงาน")


class ReportUpdateStatus(BaseModel):
    """Schema สำหรับอัปเดตสถานะรายงาน"""
    status: str = Field(..., description="สถานะใหม่: pending, processing, completed, rejected")


# ─── Response Schemas ──────────────────────────────────────────

class GPSData(BaseModel):
    """ข้อมูล GPS ที่สกัดได้"""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    source: str = "unknown"


class AIAnalysisResponse(BaseModel):
    """Schema สำหรับผลวิเคราะห์รายละเอียดของ AI"""
    id: int
    report_id: int
    model_version: str

    # CV Detections
    cv_defect_count: int
    cv_damage_ratio_percent: float
    cv_max_severity_score: int
    cv_details_json: Optional[Dict[str, int]] = None
    annotated_image_filename: Optional[str] = None

    # GEE Context
    rainfall_last_12m_mm: float
    soil_moisture_last_30d_mm: float
    ndvi_index: float
    estimated_surface_material: Optional[str] = None
    nightlight_radiance: float = 0.0
    slope: float = 0.0

    # OSM Context
    road_name: Optional[str] = None
    road_type: Optional[str] = None
    osm_highway_type: Optional[str] = None
    lanes: int = 2
    speed_limit: float = 50.0
    community_impact_score_pi: int
    nearest_poi_distance_m: float = 1000.0

    # Crowdsource Context
    crowdsource_report_count_30d: int
    days_since_last_report: int
    user_severity_score_avg: float

    # Core scores
    heuristic_score: Optional[float] = None
    fuzzy_score: Optional[float] = None
    ml_score: Optional[float] = None

    # Final
    final_fusion_score: float
    final_decision: str
    analyzed_at: datetime

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class ReportResponse(BaseModel):
    """Schema สำหรับ Response ข้อมูลรายงานหลัก"""
    id: int
    image_filename: str
    image_original_name: Optional[str] = None
    image_size_bytes: Optional[int] = None
    image_mime_type: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    gps_source: Optional[str] = None
    description: Optional[str] = None
    reporter_name: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    
    # ดึงข้อมูลจากตารางสัมพันธ์แบบ 1-to-1
    ai_analysis: Optional[AIAnalysisResponse] = None

    class Config:
        from_attributes = True

    @computed_field
    @property
    def ai_result(self) -> Optional[Dict[str, Any]]:
        """
        แปลงข้อมูลจาก ai_analysis เป็นรูปแบบ Dictionary แบบเดิม (ai_result) 
        เพื่อไม่ให้เกิดผลกระทบ (Breaking Change) ต่อโค้ดของ Frontend เดิมที่กำลังใช้อยู่
        """
        if not self.ai_analysis:
            return None

        ana = self.ai_analysis
        return {
            "cv_features": {
                "cv_damage_ratio_percent": ana.cv_damage_ratio_percent,
                "cv_max_severity_score": ana.cv_max_severity_score,
                "cv_total_defects_count": ana.cv_defect_count,
                "cv_details": ana.cv_details_json,
                "annotated_image_filename": ana.annotated_image_filename
            },
            "context_data": {
                "gee": {
                    "date_analyzed": ana.analyzed_at.strftime('%Y-%m-%d') if ana.analyzed_at else None,
                    "nightlight_radiance": ana.nightlight_radiance,
                    "rainfall_last_12m_mm": ana.rainfall_last_12m_mm,
                    "soil_moisture_last_30d_mm": ana.soil_moisture_last_30d_mm,
                    "ndvi_index": ana.ndvi_index,
                    "estimated_material": ana.estimated_surface_material,
                    "slope_deg": ana.slope
                },
                "gis": {
                    "road_name": ana.road_name,
                    "osm_highway_type": ana.osm_highway_type,
                    "thai_road_type": ana.road_type,
                    "lanes": ana.lanes,
                    "speed_limit": ana.speed_limit
                },
                "poi": {
                    "community_impact_score_pi": ana.community_impact_score_pi,
                    "nearest_poi_distance_m": ana.nearest_poi_distance_m
                },
                "crowdsource": {
                    "crowdsource_report_count_30d": ana.crowdsource_report_count_30d,
                    "days_since_last_report": ana.days_since_last_report,
                    "user_severity_score_avg": ana.user_severity_score_avg
                }
            },
            "fusion_result": {
                "feature_vector": None,
                "fusion_score": ana.final_fusion_score,
                "final_decision": ana.final_decision,
                "analysis_meta": {
                    "is_high_risk_material": ana.estimated_surface_material == "ยางมะตอย (Asphalt)",
                    "environmental_impact_factor": "high" if (ana.rainfall_last_12m_mm or 0) > 1200 or (ana.soil_moisture_last_30d_mm or 0) > 0.4 else "normal"
                }
            }
        }


class ReportListResponse(BaseModel):
    """Schema สำหรับ Response รายการรายงาน (พร้อม pagination)"""
    total: int
    page: int
    per_page: int
    reports: list[ReportResponse]


class UploadResponse(BaseModel):
    """Schema สำหรับ Response หลังอัปโหลด"""
    status: str = "success"
    message: str
    report: ReportResponse
    gps_extracted: GPSData
    ai_result: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Schema สำหรับ Error Response"""
    status: str = "error"
    message: str
    detail: Optional[str] = None


class StatsResponse(BaseModel):
    """Schema สำหรับ Response สถิติ"""
    total_reports: int
    pending_count: int
    processing_count: int
    completed_count: int
    rejected_count: int


# ─── New Schemas for System Entities ────────────────────────────

class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    is_active: int
    created_at: datetime
    last_login: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ReportActionResponse(BaseModel):
    id: int
    report_id: int
    officer_id: Optional[int] = None
    previous_status: Optional[str] = None
    new_status: str
    action_note: Optional[str] = None
    repaired_image_filename: Optional[str] = None
    action_timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class SystemSettingResponse(BaseModel):
    id: int
    config_key: str
    config_value: Dict[str, Any]
    updated_by: Optional[int] = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MapPointItem(BaseModel):
    """จุดพิกัดสำหรับ heatmap / severity map"""
    id: int
    latitude: float
    longitude: float
    status: str
    reporter_name: Optional[str] = None
    created_at: Optional[datetime] = None
    # ความหนาแน่น: weight = 1 ต่อจุด; severity ใช้ค่าด้านล่าง
    severity_score: float = 0.0
    fusion_score: float = 0.0
    decision: Optional[str] = None
    road_name: Optional[str] = None
    damage_level: str = "unknown"  # critical | warning | moderate | good | unknown


class MapPointsResponse(BaseModel):
    """รายการจุดพิกัดทั้งหมดที่มี GPS สำหรับแสดงบนแผนที่"""
    total: int
    points: list[MapPointItem]

