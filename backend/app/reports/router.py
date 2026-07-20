"""
Road Report Backend - Report Routes
API Endpoints สำหรับจัดการรายงานสภาพถนน (Version: Multi-Fusion & PostgreSQL Optimized)
"""

<<<<<<< HEAD
import asyncio
from typing import Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, Request, BackgroundTasks
=======
from typing import Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, Request
>>>>>>> 6cd57bc99f5614195a2ce183e5c468a14c0c855e
from sqlalchemy import func, select
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

# --- [IMPORT จากโครงสร้าง 3-Table Normalized Schema] ---
from app.ai.engine import ai_engine
<<<<<<< HEAD
from app.core.database import get_db, async_session
from app.reports.models import RoadReport, AIAnalysis, ApiCacheGeeOsm, ReportStatus
from app.reports.schemas import (
    ErrorResponse,
=======
from app.core.database import get_db
from app.reports.models import RoadReport, AIAnalysis, ApiCacheGeeOsm, ReportStatus
from app.reports.schemas import (
    ErrorResponse,
    MapPointItem,
    MapPointsResponse,
>>>>>>> 6cd57bc99f5614195a2ce183e5c468a14c0c855e
    ReportListResponse,
    ReportResponse,
    ReportUpdateStatus,
    StatsResponse,
    UploadResponse,
    GPSData,
)
from app.core.file_utils import save_upload_file
from app.services.gps_extractor import extract_gps_from_exif
# -----------------------------------------------------

router = APIRouter(prefix="/api/reports", tags=["Reports"])

<<<<<<< HEAD

async def process_report_background(
    report_id: int,
    file_info: dict,
    final_lat: Optional[float],
    final_lon: Optional[float],
    gps_source: str
):
    """ฟังก์ชันทำงานเบื้องหลังสำหรับ AI Inference และดึงข้อมูล API ภายนอก"""
    async with async_session() as db:
        try:
            # 1. Gatekeeper: ตรวจสอบว่าเป็นรูปถนนจริงหรือไม่
            if ai_engine.classifier_model:
                # รัน AI ใน thread ป้องกัน event loop block
                is_road = await asyncio.to_thread(ai_engine.validate_is_road, file_info["path"])
                if not is_road:
                    print(f"🚫 [Gatekeeper] รูปภาพ {file_info['filename']} ไม่ใช่ถนน")
                    report = await db.get(RoadReport, report_id)
                    if report:
                        report.status = ReportStatus.REJECTED
                        
                        ai_analysis_record = AIAnalysis(
                            report_id=report_id,
                            model_version="YOLO-Gatekeeper",
                            final_decision="Rejected (Image is not a road)",
                            final_fusion_score=0.0,
                            heuristic_score=0.0,
                            fuzzy_score=0.0,
                            ml_score=0.0
                        )
                        db.add(ai_analysis_record)
                        await db.commit()
                    return

            # 2. จัดการแคชข้อมูล API ภายนอก (GEE & OSM)
            cached_gee, cached_osm = None, None
            grid_key = None

            if final_lat is not None and final_lon is not None:
                grid_key = f"{round(final_lat, 3)},{round(final_lon, 3)}"
                try:
                    cache_query = select(ApiCacheGeeOsm).where(ApiCacheGeeOsm.coordinate_grid == grid_key)
                    cache_result = await db.execute(cache_query)
                    for entry in cache_result.scalars().all():
                        if entry.source_api == "gee": cached_gee = entry.cached_response_json
                        elif entry.source_api == "osm": cached_osm = entry.cached_response_json
                except Exception as cache_err:
                    print(f"⚠️ ไม่สามารถดึงข้อมูล Cache ได้: {cache_err}")

            # 3. ดึงสถิติ Crowdsourcing
            real_crowd_data = {
                "crowdsource_report_count_30d": 0,
                "days_since_last_report": 999,
                "user_severity_score_avg": 0.0
            }

            if final_lat is not None and final_lon is not None:
                try:
                    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
                    lat_offset, lon_offset = 0.00045, 0.00045
                    
                    crowd_query = select(RoadReport).options(joinedload(RoadReport.ai_analysis)).where(
                        RoadReport.latitude.between(final_lat - lat_offset, final_lat + lat_offset),
                        RoadReport.longitude.between(final_lon - lon_offset, final_lon + lon_offset),
                        RoadReport.created_at >= thirty_days_ago
                    ).order_by(RoadReport.created_at.desc())

                    crowd_result = await db.execute(crowd_query)
                    recent_reports = crowd_result.scalars().all()

                    if recent_reports:
                        real_crowd_data["crowdsource_report_count_30d"] = len(recent_reports)
                        real_crowd_data["days_since_last_report"] = (datetime.now(timezone.utc) - recent_reports[0].created_at).days
                        
                        total_sev, valid_sev = 0, 0
                        for r in recent_reports:
                            if r.ai_analysis:
                                total_sev += int(r.ai_analysis.cv_max_severity_score)
                                valid_sev += 1
                        if valid_sev > 0:
                            real_crowd_data["user_severity_score_avg"] = round(total_sev / valid_sev, 1)
                except Exception as e:
                    print(f"⚠️ Crowdsource Error: {e}")

            # 4. ประมวลผลวิเคราะห์ด้วย AI Engine
            ai_analysis = None
            if ai_engine.model is not None:
                print(f"🔍 AI Engine กำลังวิเคราะห์ภาพ: {file_info['filename']}")
                try:
                    if final_lat is not None and final_lon is not None:
                        import app.ai.engine as ai_engine_mod
                        orig_get_env = ai_engine_mod.get_environment_data
                        orig_get_road = ai_engine_mod.get_road_type

                        if cached_gee: ai_engine_mod.get_environment_data = lambda l, ln: cached_gee
                        if cached_osm: ai_engine_mod.get_road_type = lambda l, ln: cached_osm

                        try:
                            # รัน AI หนักๆ ใน thread
                            ai_analysis = await asyncio.to_thread(
                                ai_engine.calculate_priority_index,
                                final_lat, final_lon, file_info["path"], real_crowd_data
                            )
                        finally:
                            ai_engine_mod.get_environment_data = orig_get_env
                            ai_engine_mod.get_road_type = orig_get_road
                    else:
                        cv_result = await asyncio.to_thread(ai_engine.predict_damage, file_info["path"])
                        ai_analysis = {
                            "status": "partial_success",
                            "priority_index_ppi": 0.0,
                            "ai_analysis": cv_result,
                            "context_data": None
                        }
                except Exception as ai_err:
                    print(f"⚠️ AI Engine Error: {ai_err}")

            # 5. บันทึกแคช
            if grid_key and ai_analysis and ai_analysis.get("status") != "partial_success":
                context = ai_analysis.get("context_data")
                if context:
                    if not cached_gee and context.get("gee", {}).get("estimated_material") != "ไม่ระบุ":
                        db.add(ApiCacheGeeOsm(coordinate_grid=grid_key, source_api="gee", cached_response_json=context["gee"]))
                    if not cached_osm and context.get("gis", {}).get("thai_road_type") != "ไม่ใช่ถนน/ไม่พบข้อมูล":
                        db.add(ApiCacheGeeOsm(coordinate_grid=grid_key, source_api="osm", cached_response_json=context["gis"]))

            # 6. บันทึก AI Analysis และอัปเดตสถานะ Report
            report = await db.get(RoadReport, report_id)
            if report and ai_analysis:
                if ai_analysis.get("status") == "partial_success":
                    cv_f = ai_analysis.get("ai_analysis", {})
                    cx_d = {}
                    fusion_r = {"fusion_score": 0.0, "final_decision": "Good (สภาพปกติ) - ไม่มีพิกัด"}
                else:
                    cv_f = ai_analysis.get("cv_features", {})
                    cx_d = ai_analysis.get("context_data", {})
                    fusion_r = ai_analysis.get("fusion_result", {})

                ai_rec = AIAnalysis(
                    report_id=report_id,
                    model_version="RT-DETR-Fold2",
                    cv_defect_count=cv_f.get("cv_total_defects_count", 0),
                    cv_damage_ratio_percent=cv_f.get("cv_damage_ratio_percent", 0.0),
                    cv_max_severity_score=cv_f.get("cv_max_severity_score", 0),
                    cv_details_json=cv_f.get("cv_details", {}),
                    annotated_image_filename=cv_f.get("annotated_image_filename"),
                    rainfall_last_12m_mm=cx_d.get("gee", {}).get("rainfall_last_12m_mm", 0.0) if cx_d.get("gee") else 0.0,
                    soil_moisture_last_30d_mm=cx_d.get("gee", {}).get("soil_moisture_last_30d_mm", 0.0) if cx_d.get("gee") else 0.0,
                    ndvi_index=cx_d.get("gee", {}).get("ndvi_index", 0.0) if cx_d.get("gee") else 0.0,
                    estimated_surface_material=cx_d.get("gee", {}).get("estimated_material", "ไม่ระบุ") if cx_d.get("gee") else "ไม่ระบุ",
                    nightlight_radiance=cx_d.get("gee", {}).get("nightlight_radiance", 0.0) if cx_d.get("gee") else 0.0,
                    road_name=cx_d.get("gis", {}).get("road_name") if cx_d.get("gis") else None,
                    road_type=cx_d.get("gis", {}).get("thai_road_type") if cx_d.get("gis") else None,
                    osm_highway_type=cx_d.get("gis", {}).get("osm_highway_type") if cx_d.get("gis") else None,
                    community_impact_score_pi=cx_d.get("poi", {}).get("community_impact_score_pi", 0) if cx_d.get("poi") else 0,
                    crowdsource_report_count_30d=real_crowd_data["crowdsource_report_count_30d"],
                    days_since_last_report=real_crowd_data["days_since_last_report"],
                    user_severity_score_avg=real_crowd_data["user_severity_score_avg"],
                    heuristic_score=fusion_r.get("heuristic_score"),
                    fuzzy_score=fusion_r.get("fuzzy_score"),
                    ml_score=fusion_r.get("ml_score"),
                    final_fusion_score=fusion_r.get("fusion_score", 0.0),
                    final_decision=fusion_r.get("final_decision", "Good (สภาพปกติ)")
                )
                db.add(ai_rec)
                
                # Update status
                if fusion_r.get("final_decision", "").startswith("Rejected"):
                    report.status = ReportStatus.REJECTED
                else:
                    report.status = ReportStatus.COMPLETED

            await db.commit()
            print(f"✅ ประมวลผลรายงาน {report_id} ในเบื้องหลังสำเร็จ")

        except Exception as e:
            await db.rollback()
            print(f"❌ Background task error: {e}")
            import traceback; traceback.print_exc()


=======
>>>>>>> 6cd57bc99f5614195a2ce183e5c468a14c0c855e
@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=201,
<<<<<<< HEAD
    summary="อัปโหลดรูปภาพถนนและประมวลผลด้วย AI เบื้องหลัง",
=======
    summary="อัปโหลดรูปภาพถนนและประมวลผลวิเคราะห์ด้วย AI",
>>>>>>> 6cd57bc99f5614195a2ce183e5c468a14c0c855e
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def upload_report(
    request: Request,
<<<<<<< HEAD
    background_tasks: BackgroundTasks,
=======
>>>>>>> 6cd57bc99f5614195a2ce183e5c468a14c0c855e
    image: UploadFile = File(..., description="รูปภาพถนน (jpg, png, webp)"),
    latitude: Optional[float] = Form(None, description="ละติจูดจากหน้าเว็บ"),
    longitude: Optional[float] = Form(None, description="ลองจิจูดจากหน้าเว็บ"),
    description: Optional[str] = Form(None, description="คำอธิบายเพิ่มเติม"),
    reporter_name: Optional[str] = Form(None, description="ชื่อผู้รายงาน"),
    db: AsyncSession = Depends(get_db),
):
    try:
<<<<<<< HEAD
        file_info = await save_upload_file(image)

=======
        # 1. บันทึกไฟล์รูปภาพไปยังที่จัดเก็บ
        file_info = await save_upload_file(image)

        # 2. คัดเลือกพิกัดใช้งานจริง (ลำดับความสำคัญ: Manual > EXIF)
>>>>>>> 6cd57bc99f5614195a2ce183e5c468a14c0c855e
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

<<<<<<< HEAD
        # บันทึกข้อมูลรายงานสภาพถนนผู้ใช้ (RoadReport) แบบเร็ว
=======
        # 2.5 Gatekeeper: ตรวจสอบว่าเป็นรูปถนนจริงหรือไม่ด้วยโมเดล Classification
        if ai_engine.classifier_model:
            is_road = ai_engine.validate_is_road(file_info["path"])
            if not is_road:
                print(f"🚫 [Gatekeeper] รูปภาพ {file_info['filename']} ไม่ใช่ถนน ปฏิเสธการประมวลผลต่อ")
                report = RoadReport(
                    image_filename=file_info["filename"],
                    image_original_name=file_info["original_name"],
                    image_size_bytes=file_info["size_bytes"],
                    image_mime_type=file_info["mime_type"],
                    latitude=final_lat,
                    longitude=final_lon,
                    gps_source=gps_source,
                    description=description,
                    reporter_name=reporter_name,
                    status=ReportStatus.REJECTED,
                )
                db.add(report)
                await db.flush()
                
                ai_analysis_record = AIAnalysis(
                    report_id=report.id,
                    model_version="YOLO-Gatekeeper",
                    final_decision="Rejected (Image is not a road)",
                    final_fusion_score=0.0,
                    heuristic_score=0.0,
                    fuzzy_score=0.0,
                    ml_score=0.0
                )
                db.add(ai_analysis_record)
                await db.commit()
                
                stmt = select(RoadReport).options(joinedload(RoadReport.ai_analysis)).where(RoadReport.id == report.id)
                result = await db.execute(stmt)
                refreshed_report = result.scalar_one()

                return UploadResponse(
                    status="success",
                    message="อัปโหลดสำเร็จ แต่ระบบปฏิเสธเนื่องจากรูปภาพไม่ใช่ถนน",
                    report=ReportResponse.model_validate(refreshed_report),
                    gps_extracted=GPSData(latitude=final_lat, longitude=final_lon, source=gps_source),
                    ai_result={"status": "rejected", "reason": "Image is not a road"}
                )

        # 3. จัดการแคชข้อมูล API ภายนอก (GEE & OSM) ตามพิกัดกริด (~110m)
        cached_gee = None
        cached_osm = None
        grid_key = None

        if final_lat is not None and final_lon is not None:
            grid_key = f"{round(final_lat, 3)},{round(final_lon, 3)}"
            try:
                cache_query = select(ApiCacheGeeOsm).where(ApiCacheGeeOsm.coordinate_grid == grid_key)
                cache_result = await db.execute(cache_query)
                cache_entries = cache_result.scalars().all()
                for entry in cache_entries:
                    if entry.source_api == "gee":
                        cached_gee = entry.cached_response_json
                    elif entry.source_api == "osm":
                        cached_osm = entry.cached_response_json
            except Exception as cache_err:
                print(f"⚠️ ไม่สามารถดึงข้อมูล Cache ได้: {cache_err}")

        # 4. ดึงสถิติความถี่การแจ้งเหตุในพื้นที่ใกล้เคียง (Crowdsourcing) ด้วยความสัมพันธ์ของ SQL
        real_crowd_data = {
            "crowdsource_report_count_30d": 0,
            "days_since_last_report": 999,
            "user_severity_score_avg": 0.0
        }

        if final_lat is not None and final_lon is not None:
            try:
                thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
                lat_offset = 0.00045  # รัศมี ~50 เมตร
                lon_offset = 0.00045

                # Query ประวัตรายงานย้อนหลัง 30 วัน ที่พิกัดใกล้เคียง
                crowd_query = select(RoadReport).options(joinedload(RoadReport.ai_analysis)).where(
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
                        if r.ai_analysis:
                            total_severity += int(r.ai_analysis.cv_max_severity_score)
                            valid_severity_count += 1

                    if valid_severity_count > 0:
                        real_crowd_data["user_severity_score_avg"] = round(total_severity / valid_severity_count, 1)

            except Exception as crowd_err:
                print(f"⚠️ เกิดข้อผิดพลาดในการดึงประวัติการแจ้งเหตุ Crowdsource: {crowd_err}")

        # 5. ประมวลผลวิเคราะห์ด้วย AI Engine (รองรับ RT-DETR + Late Fusion)
        ai_analysis = None
        if ai_engine.model is not None:
            print(f"🔍 AI Engine กำลังวิเคราะห์ภาพ: {file_info['filename']}")
            try:
                if final_lat is not None and final_lon is not None:
                    # ทำการ Patch GEE/OSM API ที่ Engine เรียกใช้งานแบบ dynamic ชั่วคราวหากมีแคช
                    import app.ai.engine as ai_engine_mod
                    orig_get_env = ai_engine_mod.get_environment_data
                    orig_get_road = ai_engine_mod.get_road_type

                    if cached_gee:
                        print(f"💡 โหลดข้อมูล GEE ของพิกัด {grid_key} จาก Cache")
                        ai_engine_mod.get_environment_data = lambda l, ln: cached_gee
                    if cached_osm:
                        print(f"💡 โหลดข้อมูล OSM ของพิกัด {grid_key} จาก Cache")
                        ai_engine_mod.get_road_type = lambda l, ln: cached_osm

                    try:
                        ai_analysis = ai_engine.calculate_priority_index(
                            lat=final_lat,
                            lon=final_lon,
                            image_path=file_info["path"],
                            real_crowd_data=real_crowd_data
                        )
                    finally:
                        # กู้คืนฟังก์ชันดึง API ดั้งเดิมกลับมา
                        ai_engine_mod.get_environment_data = orig_get_env
                        ai_engine_mod.get_road_type = orig_get_road
                else:
                    print("⚠️ ไม่พบพิกัด GPS จะรันเฉพาะประเมินรอยร้าวเบื้องต้น (Computer Vision Only)")
                    cv_result = ai_engine.predict_damage(file_info["path"])
                    ai_analysis = {
                        "status": "partial_success",
                        "priority_index_ppi": 0.0,
                        "ai_analysis": cv_result,
                        "context_data": None,
                        "note": "Analysis limited to Computer Vision due to missing GPS"
                    }
            except Exception as ai_err:
                print(f"⚠️ AI Engine ประมวลผลผิดพลาด: {ai_err}")

        # 6. บันทึกข้อมูลรายงานสภาพถนนผู้ใช้ (RoadReport)
        initial_status = ReportStatus.PENDING
        if ai_analysis and ai_analysis.get("fusion_result", {}).get("final_decision", "").startswith("Rejected"):
            initial_status = ReportStatus.REJECTED

>>>>>>> 6cd57bc99f5614195a2ce183e5c468a14c0c855e
        report = RoadReport(
            image_filename=file_info["filename"],
            image_original_name=file_info["original_name"],
            image_size_bytes=file_info["size_bytes"],
            image_mime_type=file_info["mime_type"],
            latitude=final_lat,
            longitude=final_lon,
            gps_source=gps_source,
            description=description,
            reporter_name=reporter_name,
<<<<<<< HEAD
            status=ReportStatus.PROCESSING,
        )
        db.add(report)
        await db.commit()
        await db.refresh(report)

        # สั่งให้รัน AI ในเบื้องหลัง
        background_tasks.add_task(
            process_report_background,
            report_id=report.id,
            file_info=file_info,
            final_lat=final_lat,
            final_lon=final_lon,
            gps_source=gps_source
        )

        return UploadResponse(
            status="success",
            message="อัปโหลดสำเร็จ ระบบกำลังวิเคราะห์ผลด้วย AI ในเบื้องหลัง",
            report=ReportResponse.model_validate(report),
            gps_extracted=GPSData(latitude=final_lat, longitude=final_lon, source=gps_source),
            ai_result=None
=======
            status=initial_status,
        )
        db.add(report)
        await db.flush()  # เพื่อให้มีรายงาน id ไปอ้างอิงในผลลัพธ์ AI

        # 7. บันทึกแคชเพิ่มเติมหากดึงข้อมูลใหม่ได้สำเร็จ
        if grid_key and ai_analysis and ai_analysis.get("status") != "partial_success" and "context_data" in ai_analysis:
            context = ai_analysis["context_data"]
            if context:
                gee_data = context.get("gee")
                if not cached_gee and gee_data and gee_data.get("estimated_material") != "ไม่ระบุ":
                    try:
                        gee_cache = ApiCacheGeeOsm(
                            coordinate_grid=grid_key,
                            source_api="gee",
                            cached_response_json=gee_data
                        )
                        db.add(gee_cache)
                    except Exception as cache_save_err:
                        print(f"⚠️ ไม่สามารถบันทึกแคช GEE ได้: {cache_save_err}")

                gis_data = context.get("gis")
                if not cached_osm and gis_data and gis_data.get("thai_road_type") != "ไม่ใช่ถนน/ไม่พบข้อมูล":
                    try:
                        osm_cache = ApiCacheGeeOsm(
                            coordinate_grid=grid_key,
                            source_api="osm",
                            cached_response_json=gis_data
                        )
                        db.add(osm_cache)
                    except Exception as cache_save_err:
                        print(f"⚠️ ไม่สามารถบันทึกแคช OSM ได้: {cache_save_err}")

        # 8. บันทึกผลวิเคราะห์ AI ลงตารางแยก (AIAnalysis)
        if ai_analysis:
            if ai_analysis.get("status") == "partial_success":
                cv_features = ai_analysis.get("ai_analysis", {})
                context_data = {}
                fusion_result = {
                    "fusion_score": 0.0,
                    "heuristic_score": 0.0,
                    "fuzzy_score": 0.0,
                    "ml_score": 0.0,
                    "final_decision": "Good (สภาพปกติ) - ไม่มีพิกัด"
                }
            else:
                cv_features = ai_analysis.get("cv_features", {})
                context_data = ai_analysis.get("context_data", {})
                fusion_result = ai_analysis.get("fusion_result", {})

            ai_analysis_record = AIAnalysis(
                report_id=report.id,
                model_version="RT-DETR-Fold2",
                
                # CV Detections
                cv_defect_count=cv_features.get("cv_total_defects_count", 0),
                cv_damage_ratio_percent=cv_features.get("cv_damage_ratio_percent", 0.0),
                cv_max_severity_score=cv_features.get("cv_max_severity_score", 0),
                cv_details_json=cv_features.get("cv_details", {}),
                annotated_image_filename=cv_features.get("annotated_image_filename"),

                # GEE Context
                rainfall_last_12m_mm=context_data.get("gee", {}).get("rainfall_last_12m_mm", 0.0) if context_data.get("gee") else 0.0,
                soil_moisture_last_30d_mm=context_data.get("gee", {}).get("soil_moisture_last_30d_mm", 0.0) if context_data.get("gee") else 0.0,
                ndvi_index=context_data.get("gee", {}).get("ndvi_index", 0.0) if context_data.get("gee") else 0.0,
                estimated_surface_material=context_data.get("gee", {}).get("estimated_material", "ไม่ระบุ") if context_data.get("gee") else "ไม่ระบุ",
                nightlight_radiance=context_data.get("gee", {}).get("nightlight_radiance", 0.0) if context_data.get("gee") else 0.0,

                # OSM Context
                road_name=context_data.get("gis", {}).get("road_name") if context_data.get("gis") else None,
                road_type=context_data.get("gis", {}).get("thai_road_type") if context_data.get("gis") else None,
                osm_highway_type=context_data.get("gis", {}).get("osm_highway_type") if context_data.get("gis") else None,
                community_impact_score_pi=context_data.get("poi", {}).get("community_impact_score_pi", 0) if context_data.get("poi") else 0,

                # Crowdsource Context
                crowdsource_report_count_30d=real_crowd_data["crowdsource_report_count_30d"],
                days_since_last_report=real_crowd_data["days_since_last_report"],
                user_severity_score_avg=real_crowd_data["user_severity_score_avg"],

                # Multi-Fusion scoring
                heuristic_score=fusion_result.get("heuristic_score"),
                fuzzy_score=fusion_result.get("fuzzy_score"),
                ml_score=fusion_result.get("ml_score"),

                # Decision
                final_fusion_score=fusion_result.get("fusion_score", 0.0),
                final_decision=fusion_result.get("final_decision", "Good (สภาพปกติ)"),
            )
            db.add(ai_analysis_record)

        await db.commit()
        
        # โหลดความสัมพันธ์ของ report ทั้งหมดเพื่อใช้ Validate ใน Pydantic
        stmt = select(RoadReport).options(joinedload(RoadReport.ai_analysis)).where(RoadReport.id == report.id)
        result = await db.execute(stmt)
        refreshed_report = result.scalar_one()

        return UploadResponse(
            status="success",
            message="สร้างรายงานและวิเคราะห์ผล AI สำเร็จ",
            report=ReportResponse.model_validate(refreshed_report),
            gps_extracted=GPSData(latitude=final_lat, longitude=final_lon, source=gps_source),
            ai_result=ai_analysis
>>>>>>> 6cd57bc99f5614195a2ce183e5c468a14c0c855e
        )

    except Exception as e:
        await db.rollback()
<<<<<<< HEAD
        print(e)
        raise HTTPException(status_code=500, detail=str(e))


=======
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ─── GET: ดึงรายการรายงานทั้งหมด (พร้อม Pagination และ Join Table) ───

>>>>>>> 6cd57bc99f5614195a2ce183e5c468a14c0c855e
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
<<<<<<< HEAD
=======
    """ดึงข้อมูลรายการรายงานทั้งหมด พร้อม Joined table ผลลัพธ์ AI เพื่อประสิทธิภาพที่ดีที่สุด"""
>>>>>>> 6cd57bc99f5614195a2ce183e5c468a14c0c855e
    query = select(RoadReport).options(joinedload(RoadReport.ai_analysis))
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


<<<<<<< HEAD
=======
# ─── GET: สถิติภาพรวม (ต้องอยู่ก่อน /{report_id}) ───────────────

@router.get(
    "/stats/summary",
    response_model=StatsResponse,
    summary="ดึงสถิติภาพรวมรายงาน",
)
async def get_stats(db: AsyncSession = Depends(get_db)):
    """ดึงสถิติจำนวนรายงานแยกตามสถานะการพิจารณา"""
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


def _classify_damage_level(decision: Optional[str], fusion_score: float, severity_score: float) -> str:
    """จัดระดับความเสียหายจากผลโมเดล fusion / CV"""
    text = (decision or "").lower()
    if "reject" in text:
        return "unknown"
    if "critical" in text or "วิกฤต" in text or fusion_score >= 0.75 or severity_score >= 5:
        return "critical"
    if "warning" in text or "เตือน" in text or fusion_score >= 0.5 or severity_score >= 4:
        return "warning"
    if fusion_score >= 0.3 or severity_score >= 2:
        return "moderate"
    if decision:
        return "good"
    return "unknown"


# ─── GET: จุดพิกัดสำหรับ Heatmap / Severity Map ─────────────────

@router.get(
    "/map/points",
    response_model=MapPointsResponse,
    summary="ดึงจุดพิกัดรายงานสำหรับแผนที่ heatmap และระดับความเสียหาย",
)
async def get_map_points(
    include_rejected: bool = Query(False, description="รวมรายงานที่ถูกปฏิเสธหรือไม่"),
    db: AsyncSession = Depends(get_db),
):
    """
    คืนรายการจุดที่มี latitude/longitude สำหรับ:
    1) Kernel density heatmap (ความหนาแน่นการแจ้ง)
    2) Severity markers (ระดับความเสียหายจากโมเดล)
    """
    query = (
        select(RoadReport)
        .options(joinedload(RoadReport.ai_analysis))
        .where(RoadReport.latitude.isnot(None), RoadReport.longitude.isnot(None))
    )
    if not include_rejected:
        query = query.where(RoadReport.status != ReportStatus.REJECTED)

    result = await db.execute(query.order_by(RoadReport.created_at.desc()))
    reports = result.scalars().all()

    points: list[MapPointItem] = []
    for r in reports:
        ana = r.ai_analysis
        severity = float(ana.cv_max_severity_score) if ana and ana.cv_max_severity_score is not None else 0.0
        fusion = float(ana.final_fusion_score) if ana and ana.final_fusion_score is not None else 0.0
        decision = ana.final_decision if ana else None
        points.append(
            MapPointItem(
                id=r.id,
                latitude=float(r.latitude),
                longitude=float(r.longitude),
                status=r.status.value if hasattr(r.status, "value") else str(r.status),
                reporter_name=r.reporter_name,
                created_at=r.created_at,
                severity_score=severity,
                fusion_score=fusion,
                decision=decision,
                road_name=ana.road_name if ana else None,
                damage_level=_classify_damage_level(decision, fusion, severity),
            )
        )

    return MapPointsResponse(total=len(points), points=points)


# ─── GET: ดึงรายงานตาม ID (Join Table) ───────────────────────────

>>>>>>> 6cd57bc99f5614195a2ce183e5c468a14c0c855e
@router.get(
    "/{report_id}",
    response_model=ReportResponse,
    summary="ดึงรายงานตาม ID",
    responses={404: {"model": ErrorResponse}},
)
async def get_report(report_id: int, db: AsyncSession = Depends(get_db)):
<<<<<<< HEAD
=======
    """ดึงข้อมูลรายงานเดี่ยวที่มีความสัมพันธ์ครบถ้วน"""
>>>>>>> 6cd57bc99f5614195a2ce183e5c468a14c0c855e
    result = await db.execute(
        select(RoadReport).options(joinedload(RoadReport.ai_analysis)).where(RoadReport.id == report_id)
    )
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=404, detail=f"ไม่พบรายงาน ID: {report_id}")

    return ReportResponse.model_validate(report)


<<<<<<< HEAD
=======
# ─── PATCH: อัปเดตสถานะรายงาน ───────────────────────────────────

>>>>>>> 6cd57bc99f5614195a2ce183e5c468a14c0c855e
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
<<<<<<< HEAD
=======
    """อัปเดตสถานะการอนุมัติรายงาน"""
>>>>>>> 6cd57bc99f5614195a2ce183e5c468a14c0c855e
    result = await db.execute(
        select(RoadReport).options(joinedload(RoadReport.ai_analysis)).where(RoadReport.id == report_id)
    )
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=404, detail=f"ไม่พบรายงาน ID: {report_id}")

    try:
        new_status = ReportStatus(body.status)
    except ValueError:
        valid = ", ".join([s.value for s in ReportStatus])
        raise HTTPException(status_code=400, detail=f"สถานะไม่ถูกต้อง ค่าที่รองรับคือ: {valid}")

    report.status = new_status
    await db.commit()
    await db.refresh(report)

    return ReportResponse.model_validate(report)


<<<<<<< HEAD
=======
# ─── DELETE: ลบรายงาน ──────────────────────────────────────────

>>>>>>> 6cd57bc99f5614195a2ce183e5c468a14c0c855e
@router.delete(
    "/{report_id}",
    summary="ลบรายงาน",
    responses={404: {"model": ErrorResponse}},
)
async def delete_report(report_id: int, db: AsyncSession = Depends(get_db)):
<<<<<<< HEAD
=======
    """ลบรายงานจากฐานข้อมูล (ความสัมพันธ์ AI Analysis จะโดน Cascade ลบไปด้วยอัตโนมัติ)"""
>>>>>>> 6cd57bc99f5614195a2ce183e5c468a14c0c855e
    result = await db.execute(select(RoadReport).where(RoadReport.id == report_id))
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=404, detail=f"ไม่พบรายงาน ID: {report_id}")

    await db.delete(report)
    await db.commit()

    return {"status": "success", "message": f"ลบรายงาน ID: {report_id} สำเร็จ"}

<<<<<<< HEAD

@router.get(
    "/stats/summary",
    response_model=StatsResponse,
    summary="ดึงสถิติภาพรวมรายงาน",
)
async def get_stats(db: AsyncSession = Depends(get_db)):
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
=======
>>>>>>> 6cd57bc99f5614195a2ce183e5c468a14c0c855e
