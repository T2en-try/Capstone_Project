"""
Road Report Backend - Report Routes
API Endpoints สำหรับจัดการรายงานสภาพถนน (Version: RT-DETR Optimized)
"""

from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

# --- [IMPORT ใหม่จากโครงสร้าง Domain-Driven] ---
from app.ai.engine import ai_engine
from app.core.database import get_db
from app.reports.models import RoadReport, ReportStatus
from app.reports.schemas import (
    ErrorResponse,
    ReportListResponse,
    ReportResponse,
    ReportUpdateStatus,
    StatsResponse,
    UploadResponse,
    GPSData,
)
from app.core.file_utils import save_upload_file
from app.services.gps_extractor import extract_gps_from_exif
# --------------------------------------------

router = APIRouter(prefix="/api/reports", tags=["Reports"])

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
    try:
        # 1. บันทึกไฟล์รูปภาพ
        file_info = await save_upload_file(image)

        # 2. ตัดสินใจเรื่องพิกัด (Priority: Manual > EXIF)
        final_lat, final_lon = None, None
        gps_source = "none"

        if latitude is not None and longitude is not None:
            final_lat, final_lon = latitude, longitude
            gps_source = "manual"
        else:
            exif_lat, exif_lon = extract_gps_from_exif(file_info["contents"])
            if exif_lat is not None and exif_lon is not None:
                final_lat, final_lon = exif_lat, exif_lon
                gps_source = "exif"

        # 3. ส่งข้อมูลให้ AI Engine ประมวลผล (ใช้ RT-DETR + Late Fusion)
        ai_analysis = None
        
        # ตรวจสอบว่าโหลด Model สำเร็จหรือไม่ (โหลดผ่าน ai_engine)
        if ai_engine.model is not None:
            print(f"🔍 PRIIGS Engine กำลังวิเคราะห์ภาพ: {file_info['filename']}")
            
            try:
                if final_lat and final_lon:
                    # === Fetch Real Crowdsource Data ===
                    from datetime import datetime, timedelta, timezone
                    
                    real_crowd_data = {
                        "crowdsource_report_count_30d": 0,
                        "days_since_last_report": 999,
                        "user_severity_score_avg": 0.0
                    }
                    
                    try:
                        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
                        lat_offset = 0.00045 # ~50m
                        lon_offset = 0.00045 # ~50m
                        
                        crowd_query = select(RoadReport).where(
                            RoadReport.latitude.between(final_lat - lat_offset, final_lat + lat_offset),
                            RoadReport.longitude.between(final_lon - lon_offset, final_lon + lon_offset),
                            RoadReport.created_at >= thirty_days_ago
                        ).order_by(RoadReport.created_at.desc())
                        
                        crowd_result = await db.execute(crowd_query)
                        recent_reports = crowd_result.scalars().all()
                        
                        if recent_reports:
                            real_crowd_data["crowdsource_report_count_30d"] = len(recent_reports)
                            delta = datetime.now(timezone.utc) - recent_reports[0].created_at
                            real_crowd_data["days_since_last_report"] = delta.days
                            
                            total_severity = 0
                            valid_severity_count = 0
                            for r in recent_reports:
                                if r.ai_result and isinstance(r.ai_result, dict):
                                    cv_data = r.ai_result.get("cv_features") or r.ai_result.get("ai_analysis")
                                    if cv_data and "cv_max_severity_score" in cv_data:
                                        total_severity += int(cv_data["cv_max_severity_score"])
                                        valid_severity_count += 1
                                        
                            if valid_severity_count > 0:
                                real_crowd_data["user_severity_score_avg"] = round(total_severity / valid_severity_count, 1)
                                
                    except Exception as e:
                        print(f"⚠️ ไม่สามารถดึงข้อมูล Crowdsource จาก Database ได้: {e}")

                    # กรณีมีพิกัด: คำนวณแบบ Full Fusion (AI + GEE + GIS + Crowd)
                    ai_analysis = ai_engine.calculate_priority_index(
                        lat=final_lat, 
                        lon=final_lon, 
                        image_path=file_info["path"],
                        real_crowd_data=real_crowd_data
                    )
                else:
                    # กรณีไม่มีพิกัด: รันเฉพาะ AI Detection (Computer Vision Only)
                    print("⚠️ ไม่พบพิกัด GPS รันเฉพาะประเมินรอยร้าวเบื้องต้น")
                    cv_result = ai_engine.predict_damage(file_info["path"])
                    ai_analysis = {
                        "status": "partial_success",
                        "priority_index_ppi": 0.0,
                        "ai_analysis": cv_result,
                        "context_data": None,
                        "note": "Analysis limited to Computer Vision due to missing GPS"
                    }
            except Exception as ai_err:
                print(f"⚠️ PRIIGS Engine Error: {ai_err}")
                # ถ้า AI พัง ยังยอมให้เซฟ Report ลงฐานข้อมูลได้ (แต่ไม่มีผลวิเคราะห์)
        
        # 4. บันทึกข้อมูลลงฐานข้อมูล
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