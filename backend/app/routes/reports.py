"""
Road Report Backend - Report Routes
API Endpoints สำหรับจัดการรายงานสภาพถนน
"""

from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import RoadReport, ReportStatus
from app.schemas import (
    ErrorResponse,
    ReportListResponse,
    ReportResponse,
    ReportUpdateStatus,
    StatsResponse,
    UploadResponse,
    GPSData,
)
from app.services.file_service import save_upload_file
from app.services.gps_extractor import extract_gps_from_exif

router = APIRouter(prefix="/api/reports", tags=["Reports"])


# ─── POST: อัปโหลดรูปภาพและสร้างรายงาน ─────────────────────

@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=201,
    summary="อัปโหลดรูปภาพถนนและสร้างรายงาน",
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def upload_report(
    image: UploadFile = File(..., description="รูปภาพถนน (jpg, png, webp)"),
    latitude: Optional[float] = Form(None, description="ละติจูด (ไม่บังคับ, ระบบจะสกัดจาก EXIF ก่อน)"),
    longitude: Optional[float] = Form(None, description="ลองจิจูด (ไม่บังคับ)"),
    description: Optional[str] = Form(None, description="คำอธิบายเพิ่มเติม"),
    reporter_name: Optional[str] = Form(None, description="ชื่อผู้รายงาน"),
    db: AsyncSession = Depends(get_db),
):
    """
    อัปโหลดรูปภาพถนนและสร้างรายงานใหม่

    **ขั้นตอนการทำงาน:**
    1. ตรวจสอบและบันทึกไฟล์รูปภาพ
    2. สกัดพิกัด GPS จาก EXIF metadata ของรูปภาพ
    3. ถ้าไม่พบ GPS ใน EXIF จะใช้พิกัดที่ผู้ใช้ส่งมา (ถ้ามี)
    4. บันทึกข้อมูลทั้งหมดลงฐานข้อมูล
    """
    try:
        # 1. บันทึกไฟล์รูปภาพ
        file_info = await save_upload_file(image)

        # 2. สกัดพิกัด GPS จาก EXIF
        exif_lat, exif_lon = extract_gps_from_exif(file_info["contents"])

        # 3. ตัดสินว่าจะใช้พิกัดจากแหล่งไหน
        final_lat = exif_lat
        final_lon = exif_lon
        gps_source = "exif"

        if final_lat is None or final_lon is None:
            # ถ้าไม่พบ EXIF GPS → ใช้พิกัดที่ผู้ใช้ส่งมา
            if latitude is not None and longitude is not None:
                final_lat = latitude
                final_lon = longitude
                gps_source = "manual"
            else:
                gps_source = "none"

        # 4. สร้าง Record ในฐานข้อมูล
        report = RoadReport(
            image_filename=file_info["filename"],
            image_original_name=file_info["original_name"],
            image_path=file_info["path"],
            image_size_bytes=file_info["size_bytes"],
            image_mime_type=file_info["mime_type"],
            latitude=final_lat,
            longitude=final_lon,
            gps_source=gps_source,
            description=description,
            reporter_name=reporter_name,
            status=ReportStatus.PENDING,
        )
        db.add(report)
        await db.commit()
        await db.refresh(report)

        return UploadResponse(
            status="success",
            message="อัปโหลดรูปภาพและสร้างรายงานสำเร็จ",
            report=ReportResponse.model_validate(report),
            gps_extracted=GPSData(
                latitude=final_lat,
                longitude=final_lon,
                source=gps_source,
            ),
        )

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดภายในระบบ: {str(e)}")


# ─── GET: ดึงรายการรายงานทั้งหมด (พร้อม Pagination) ──────────

@router.get(
    "/",
    response_model=ReportListResponse,
    summary="ดึงรายการรายงานทั้งหมด",
)
async def get_reports(
    page: int = Query(1, ge=1, description="หน้าที่ต้องการ"),
    per_page: int = Query(20, ge=1, le=100, description="จำนวนรายการต่อหน้า"),
    status: Optional[str] = Query(None, description="กรองตามสถานะ"),
    db: AsyncSession = Depends(get_db),
):
    """ดึงรายการรายงานทั้งหมด พร้อมระบบแบ่งหน้า และกรองตามสถานะ"""
    # สร้าง query
    query = select(RoadReport)
    count_query = select(func.count(RoadReport.id))

    # กรองตามสถานะ (ถ้ามี)
    if status:
        try:
            status_enum = ReportStatus(status)
            query = query.where(RoadReport.status == status_enum)
            count_query = count_query.where(RoadReport.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"สถานะไม่ถูกต้อง: {status}")

    # นับจำนวนทั้งหมด
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Pagination
    offset = (page - 1) * per_page
    query = query.order_by(RoadReport.created_at.desc()).offset(offset).limit(per_page)

    result = await db.execute(query)
    reports = result.scalars().all()

    return ReportListResponse(
        total=total,
        page=page,
        per_page=per_page,
        reports=[ReportResponse.model_validate(r) for r in reports],
    )


# ─── GET: ดึงรายงานตาม ID ────────────────────────────────────

@router.get(
    "/{report_id}",
    response_model=ReportResponse,
    summary="ดึงรายงานตาม ID",
    responses={404: {"model": ErrorResponse}},
)
async def get_report(report_id: int, db: AsyncSession = Depends(get_db)):
    """ดึงข้อมูลรายงานเดี่ยวจาก ID"""
    result = await db.execute(select(RoadReport).where(RoadReport.id == report_id))
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=404, detail=f"ไม่พบรายงาน ID: {report_id}")

    return ReportResponse.model_validate(report)


# ─── PATCH: อัปเดตสถานะรายงาน ────────────────────────────────

@router.patch(
    "/{report_id}/status",
    response_model=ReportResponse,
    summary="อัปเดตสถานะรายงาน",
    responses={404: {"model": ErrorResponse}},
)
async def update_report_status(
    report_id: int,
    body: ReportUpdateStatus,
    db: AsyncSession = Depends(get_db),
):
    """อัปเดตสถานะของรายงาน (pending → processing → completed/rejected)"""
    result = await db.execute(select(RoadReport).where(RoadReport.id == report_id))
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=404, detail=f"ไม่พบรายงาน ID: {report_id}")

    try:
        new_status = ReportStatus(body.status)
    except ValueError:
        valid = ", ".join([s.value for s in ReportStatus])
        raise HTTPException(status_code=400, detail=f"สถานะไม่ถูกต้อง ค่าที่รองรับ: {valid}")

    report.status = new_status
    await db.commit()
    await db.refresh(report)

    return ReportResponse.model_validate(report)


# ─── DELETE: ลบรายงาน ─────────────────────────────────────────

@router.delete(
    "/{report_id}",
    summary="ลบรายงาน",
    responses={404: {"model": ErrorResponse}},
)
async def delete_report(report_id: int, db: AsyncSession = Depends(get_db)):
    """ลบรายงานจากฐานข้อมูล"""
    result = await db.execute(select(RoadReport).where(RoadReport.id == report_id))
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=404, detail=f"ไม่พบรายงาน ID: {report_id}")

    await db.delete(report)
    await db.commit()

    return {"status": "success", "message": f"ลบรายงาน ID: {report_id} สำเร็จ"}


# ─── GET: สถิติภาพรวม ─────────────────────────────────────────

@router.get(
    "/stats/summary",
    response_model=StatsResponse,
    summary="ดึงสถิติภาพรวมรายงาน",
)
async def get_stats(db: AsyncSession = Depends(get_db)):
    """ดึงสถิติจำนวนรายงานแยกตามสถานะ"""
    total = (await db.execute(select(func.count(RoadReport.id)))).scalar() or 0

    async def count_status(s: ReportStatus) -> int:
        r = await db.execute(
            select(func.count(RoadReport.id)).where(RoadReport.status == s)
        )
        return r.scalar() or 0

    return StatsResponse(
        total_reports=total,
        pending_count=await count_status(ReportStatus.PENDING),
        processing_count=await count_status(ReportStatus.PROCESSING),
        completed_count=await count_status(ReportStatus.COMPLETED),
        rejected_count=await count_status(ReportStatus.REJECTED),
    )
