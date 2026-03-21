"""
Road Report Backend - Pydantic Schemas
โมเดลสำหรับ Validation ข้อมูลขาเข้า/ขาออกของ API
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


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


class ReportResponse(BaseModel):
    """Schema สำหรับ Response ข้อมูลรายงาน"""
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

    class Config:
        from_attributes = True


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
