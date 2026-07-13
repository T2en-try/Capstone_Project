"""
Road Report Backend - Database Models
โมดูลโมเดลฐานข้อมูลแบบ Normalized (3-Table Schema) รองรับ PostgreSQL
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class ReportStatus(str, enum.Enum):
    """สถานะการประมวลผลและการอนุมัติรายงาน"""
    PENDING = "pending"           # รอตรวจสอบ / กำลังประมวลผล
    PROCESSING = "processing"     # กำลังประมวลผล (สำหรับระบบคิว/เบื้องหลัง)
    COMPLETED = "completed"       # อนุมัติ / ดำเนินการวิเคราะห์เสร็จสิ้น
    REJECTED = "rejected"         # ปฏิเสธ (เช่น รูปไม่ใช่ถนน หรือข้อมูลไม่ชัดเจน)


class RoadReport(Base):
    """
    ตาราง road_reports - เก็บข้อมูลคำขอและรูปภาพที่ส่งมาจากผู้ใช้ (User Submissions)
    """
    __tablename__ = "road_reports"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)

    # ข้อมูลรูปภาพที่อัปโหลด
    image_filename = Column(String(255), nullable=False, comment="ชื่อไฟล์รูปภาพสุ่มที่บันทึกในเซิร์ฟเวอร์")
    image_original_name = Column(String(255), nullable=True, comment="ชื่อไฟล์ต้นฉบับจากฝั่งผู้ใช้")
    image_size_bytes = Column(Integer, nullable=True, comment="ขนาดไฟล์รูปภาพ (bytes)")
    image_mime_type = Column(String(50), nullable=True, comment="ประเภทไฟล์ เช่น image/jpeg, image/png")

    # ข้อมูลพิกัดและตำแหน่ง (สกัดจาก EXIF หรือส่งมาแบบ Manual)
    latitude = Column(Float, nullable=True, index=True, comment="ละติจูด (Latitude)")
    longitude = Column(Float, nullable=True, index=True, comment="ลองจิจูด (Longitude)")
    gps_source = Column(
        String(50), nullable=True, default="exif",
        comment="แหล่งที่มาของพิกัด: exif, manual, browser, none"
    )

    # ข้อมูลเพิ่มเติมจากผู้รายงาน
    description = Column(Text, nullable=True, comment="คำอธิบาย/หมายเหตุเพิ่มเติมจากผู้ใช้")
    reporter_name = Column(String(100), nullable=True, comment="ชื่อหรือข้อมูลระบุตัวตนผู้รายงาน")

    # สถานะของรายงาน
    status = Column(
        SAEnum(ReportStatus),
        default=ReportStatus.PENDING,
        nullable=False,
        comment="สถานะรายงาน"
    )

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="วันเวลาที่สร้างรายงาน"
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="วันเวลาที่แก้ไขล่าสุด"
    )

    # ความสัมพันธ์แบบ 1-to-1 กับผลวิเคราะห์ AI (AIAnalysis)
    # cascade="all, delete-orphan" เพื่อเวลาลบ report จะลบผลวิเคราะห์ทิ้งไปด้วยโดยอัตโนมัติ
    ai_analysis = relationship(
        "AIAnalysis",
        back_populates="report",
        uselist=False,
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<RoadReport(id={self.id}, lat={self.latitude}, lon={self.longitude}, status={self.status})>"


class AIAnalysis(Base):
    """
    ตาราง ai_analyses - เก็บผลลัพธ์การสกัดคุณลักษณะ CV และคะแนนการประเมิน Priority (Late Fusion)
    """
    __tablename__ = "ai_analyses"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    report_id = Column(
        Integer,
        ForeignKey("road_reports.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
        comment="ID อ้างอิงตารางรายงานหลัก"
    )
    model_version = Column(String(50), nullable=False, comment="เวอร์ชันของโมเดล AI ที่ใช้ประมวลผล")

    # 1. Computer Vision (CV) Features
    cv_defect_count = Column(Integer, default=0, comment="จำนวนจุดบกพร่อง/รอยร้าวที่โมเดลตรวจเจอทั้งหมด")
    cv_damage_ratio_percent = Column(Float, default=0.0, comment="อัตราส่วนความเสียหายต่อพื้นที่ภาพ (%)")
    cv_max_severity_score = Column(Integer, default=0, comment="คะแนนความรุนแรงสูงสุดที่พบ (D00=2, D10=2, D20=4, D40=5)")
    cv_details_json = Column(JSONB, nullable=True, comment="รายละเอียดจำนวนประเภทรอยร้าวที่ตรวจพบ เช่น {'D00': 1, 'D40': 2}")
    annotated_image_filename = Column(String(255), nullable=True, comment="ชื่อไฟล์ภาพผลลัพธ์แบบ Bounding Box")

    # 2. GEE Environmental Context Features
    rainfall_last_12m_mm = Column(Float, default=0.0, comment="ปริมาณน้ำฝนสะสมย้อนหลัง 12 เดือนล่าสุด (มม.)")
    soil_moisture_last_30d_mm = Column(Float, default=0.0, comment="ระดับความชื้นในผิวดินเฉลี่ย 30 วันย้อนหลัง")
    ndvi_index = Column(Float, default=0.0, comment="ดัชนีพื้นที่สีเขียว/พืชพรรณ NDVI")
    estimated_surface_material = Column(String(100), nullable=True, comment="ประเภทวัสดุผิวถนนที่ประเมินจาก Sentinel-2")
    nightlight_radiance = Column(Float, default=0.0, comment="ความเข้มข้นแสงไฟกลางคืน (Nightlight Radiance)")
    slope = Column(Float, default=0.0, comment="ความลาดชันของพื้นที่ (องศา)")

    # 3. OSM GIS Context Features
    road_name = Column(String(255), nullable=True, comment="ชื่อถนนที่รายงานจาก OpenStreetMap")
    road_type = Column(String(100), nullable=True, comment="ประเภทถนน (Primary, Secondary, Local)")
    osm_highway_type = Column(String(100), nullable=True, comment="ประเภทถนนแบบ Raw Tag (OSM Highway)")
    lanes = Column(Integer, default=2, comment="จำนวนเลนของถนน")
    speed_limit = Column(Float, default=50.0, comment="ความเร็วจำกัดของถนน (km/h)")
    community_impact_score_pi = Column(Integer, default=0, comment="คะแนนผลกระทบชุมชนประเมินจาก POIs (โรงพยาบาล/โรงเรียน)")
    nearest_poi_distance_m = Column(Float, default=1000.0, comment="ระยะห่างไปยังสถานที่สำคัญที่ใกล้ที่สุด (เมตร)")

    # 4. Crowdsourced Context Features
    crowdsource_report_count_30d = Column(Integer, default=0, comment="จำนวนการรายงานในรัศมีรอบๆ 30 วันที่ผ่านมา")
    days_since_last_report = Column(Integer, default=999, comment="จำนวนวันนับตั้งแต่รายงานล่าสุดในรัศมี")
    user_severity_score_avg = Column(Float, default=0.0, comment="ระดับความรุนแรงเฉลี่ยจากการประเมินในบริเวณนั้น")

    # 5. Core Multi-Fusion Scoring Systems (AI Architecture)
    heuristic_score = Column(Float, nullable=True, comment="ดัชนีความสำคัญคำนวณด้วย Rule-based Heuristics")
    fuzzy_score = Column(Float, nullable=True, comment="ดัชนีความสำคัญคำนวณด้วย Fuzzy logic DSS")
    ml_score = Column(Float, nullable=True, comment="ดัชนีความสำคัญทำนายด้วย Machine Learning Model")

    # 6. Final Decision
    final_fusion_score = Column(Float, nullable=False, comment="คะแนนลำดับความสำคัญรวม (Late Fusion Decision Score)")
    final_decision = Column(String(50), nullable=False, comment="ระดับการตัดสินใจด่วน เช่น Critical, Warning, Good")

    analyzed_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="วันเวลาที่ประมวลผลวิเคราะห์เสร็จสิ้น"
    )

    # เชื่อมโยงย้อนกลับไปยัง RoadReport
    report = relationship("RoadReport", back_populates="ai_analysis")

    def __repr__(self):
        return f"<AIAnalysis(id={self.id}, report_id={self.report_id}, final_fusion_score={self.final_fusion_score}, final_decision={self.final_decision})>"


class ApiCacheGeeOsm(Base):
    """
    ตาราง api_cache_gee_osm - แคชคำตอบของ API ภายนอก (GEE และ OSM) 
    ตามพิกัดกริดที่ปัดทศนิยม 3 ตำแหน่ง เพื่อลด Network Latency และหลีกเลี่ยง Rate Limits
    """
    __tablename__ = "api_cache_gee_osm"

    # Composite Primary Key (coordinate_grid + source_api)
    coordinate_grid = Column(
        String(50),
        primary_key=True,
        comment="กริดละติจูด,ลองจิจูด ปัดเศษทศนิยม 3 ตำแหน่ง (ขนาด ~110m)"
    )
    source_api = Column(
        String(20),
        primary_key=True,
        comment="แหล่งที่มาของข้อมูล: 'gee' หรือ 'osm'"
    )
    cached_response_json = Column(JSONB, nullable=False, comment="ข้อมูลดิบผลลัพธ์ API แบบ JSONB")
    fetched_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="วันเวลาที่บันทึกหรือดึงข้อมูลล่าสุด"
    )

    def __repr__(self):
        return f"<ApiCacheGeeOsm(grid={self.coordinate_grid}, api={self.source_api}, fetched_at={self.fetched_at})>"