"""
Road Report Backend - Report Routes
API Endpoints สำหรับจัดการรายงานสภาพถนน
"""

from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

# --- [NEW] Imports สำหรับ AI ---
import cv2
import torch
import numpy as np
from app.services.ai_model import extract_cv_features, perform_late_fusion
from app.services.context_api import get_environment_data, get_road_type, get_crowdsource_data
# -----------------------------

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
    request: Request,
    image: UploadFile = File(..., description="รูปภาพถนน (jpg, png, webp)"),
    latitude: Optional[float] = Form(None, description="ละติจูดจากหน้าเว็บ"),
    longitude: Optional[float] = Form(None, description="ลองจิจูดจากหน้าเว็บ"),
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
    4. ส่งข้อมูลให้ AI และดึงข้อมูลแวดล้อม
    5. บันทึกข้อมูลทั้งหมดลงฐานข้อมูล
    """
    try:
        # 1. บันทึกไฟล์รูปภาพ
        file_info = await save_upload_file(image)

        # 2. [Logic ใหม่] การตัดสินใจเรื่องพิกัด (Priority: Manual > EXIF)
        final_lat = None
        final_lon = None
        gps_source = "none"

        # เช็คก่อนว่า User ปักหมุดมาจากหน้าเว็บไหม
        if latitude is not None and longitude is not None:
            final_lat = latitude
            final_lon = longitude
            gps_source = "manual"
            print(f"📍 ใช้พิกัดจากการปักหมุดเอง: {final_lat}, {final_lon}")
        else:
            # ถ้าไม่ได้ปักหมุดมา ค่อยไปลองแกะจาก EXIF
            exif_lat, exif_lon = extract_gps_from_exif(file_info["contents"])
            if exif_lat is not None and exif_lon is not None:
                final_lat = exif_lat
                final_lon = exif_lon
                gps_source = "exif"

        # 3. ส่งข้อมูลให้ AI และดึงข้อมูลแวดล้อม
        ai_analysis = None
        if hasattr(request.app.state, 'model') and request.app.state.model is not None:
            print("🔍 AI กำลังทำงาน...")
            
            # 3.1 ประมวลผลภาพ (AI ทำงานได้แม้ไม่มีพิกัด)
            img_cv = cv2.imread(file_info["path"])
            img_rgb = cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB)
            height, width, _ = img_rgb.shape
            
            # ใช้ YOLO หรือ Faster R-CNN ตามที่คุณเซ็ตไว้
            image_tensor = torch.as_tensor(img_rgb.transpose(2, 0, 1), dtype=torch.float32).to(request.app.state.device) / 255.0
            with torch.no_grad():
                prediction = request.app.state.model([image_tensor])[0]
            cv_features = extract_cv_features(prediction, width, height)
            
            # 3.2 [Safe GEE/GIS] ดึงข้อมูลแวดล้อม (ดักจับ Error เพื่อให้เพื่อนรันได้)
            gee_data = {"rainfall_last_12m_mm": 0, "note": "GEE ไม่พร้อมใช้งาน"}
            gis_data = {"thai_road_type": "ไม่ทราบประเภท"}
            crowd_data = {"crowdsource_report_count_30d": 0}

            if final_lat and final_lon:
                try:
                    # ใส่ try-except คลุมไว้ ถ้าเพื่อนไม่ได้ login GEE ระบบจะไม่แครช
                    gee_data = get_environment_data(final_lat, final_lon)
                    gis_data = get_road_type(final_lat, final_lon)
                    crowd_data = get_crowdsource_data(final_lat, final_lon)
                except Exception as gee_err:
                    print(f"⚠️ คำเตือน: ดึงข้อมูล GEE/GIS ไม่สำเร็จ (อาจยังไม่ล็อกอิน): {gee_err}")

            # [เพิ่มใหม่] นำข้อมูลแวดล้อมจัดใส่ Dict
            context_data_dict = {"gee": gee_data, "gis": gis_data, "crowdsource": crowd_data}

            # [เพิ่มใหม่] ส่งข้อมูลทั้ง 2 ขาเข้าสู่กระบวนการ Late Fusion
            fusion_result = perform_late_fusion(cv_features, context_data_dict)

            ai_analysis = {
                "cv_features": cv_features,
                "context_data": context_data_dict,
                "fusion_result": fusion_result
            }

        # 4. บันทึกข้อมูล
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
            ai_result=ai_analysis
        )
        db.add(report)
        await db.commit()
        await db.refresh(report)

        return UploadResponse(
            status="success",
            message="สร้างรายงานสำเร็จ",
            report=ReportResponse.model_validate(report),
            gps_extracted=GPSData(latitude=final_lat, longitude=final_lon, source=gps_source),
            ai_result=ai_analysis
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


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
    query = select(RoadReport)
    count_query = select(func.count(RoadReport.id))

    if status:
        try:
            status_enum = ReportStatus(status)
            query = query.where(RoadReport.status == status_enum)
            count_query = count_query.where(RoadReport.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"สถานะไม่ถูกต้อง: {status}")

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

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