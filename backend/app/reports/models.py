"""
Road Report Backend - Database Models
โมดูลโมเดลฐานข้อมูลแบบ Normalized (3-Table Schema) รองรับ PostgreSQL
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, BigInteger, String, Float, Boolean, DateTime, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.ext.associationproxy import association_proxy
import enum

from app.core.database import Base


class ReportStatus(str, enum.Enum):
    """สถานะการประมวลผลและการอนุมัติรายงาน"""
    PENDING = "pending"           # รอตรวจสอบ / กำลังประมวลผล
    PROCESSING = "processing"     # กำลังประมวลผล (สำหรับระบบคิว/เบื้องหลัง)
    COMPLETED = "completed"       # อนุมัติ / ดำเนินการวิเคราะห์เสร็จสิ้น
    REJECTED = "rejected"         # ปฏิเสธ (เช่น รูปไม่ใช่ถนน หรือข้อมูลไม่ชัดเจน)


class PriorityClass(int, enum.Enum):
    """Mirrors decision_heads' GT_priority_class convention exactly (1/2/3), so the
    production RF's output and the research ground truth stay numerically
    identical -- no re-mapping table to keep in sync or get wrong."""
    NORMAL = 1
    WARNING = 2
    CRITICAL = 3


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

    # เหตุผลการปฏิเสธ (เมื่อ status=REJECTED) -- อยู่ที่ RoadReport ไม่ใช่ AIAnalysis
    # เพราะ Gatekeeper อาจ reject ก่อนที่จะมีแถว AIAnalysis เกิดขึ้นเลยด้วยซ้ำ
    rejection_reason = Column(
        String(50), nullable=True,
        comment="รหัสเหตุผลการปฏิเสธ: not_a_road (Gatekeeper), analysis_failed (AI/GEE error), "
                "NULL = ปฏิเสธโดยผู้ดูแลระบบด้วยตนเอง หรือไม่ทราบสาเหตุ"
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

    actions = relationship(
        "ReportAction",
        back_populates="report",
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

    # The 37 original flat columns (CV/GEE/GIS/POI/crowdsource/priority-decision/
    # legacy) have moved to the 7 satellite tables below. They are NOT redeclared
    # here as Columns -- doing so would silently shadow the association_proxy
    # definitions of the same name later in this class body (Python class-body
    # assignment is just dict-key overwrite; whichever is declared last wins the
    # attribute name, and SQLAlchemy would then never see the earlier Column as
    # mapped at all). See the association_proxy block below for the flat
    # attribute-compatibility layer that replaces them.

    analyzed_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="วันเวลาที่ประมวลผลวิเคราะห์เสร็จสิ้น"
    )

    # เชื่อมโยงย้อนกลับไปยัง RoadReport
    report = relationship("RoadReport", back_populates="ai_analysis")

    # ─── Normalized satellite relationships (see the 7 classes below) ─────────
    # lazy="selectin": every query that loads an AIAnalysis row automatically
    # fires small batched `WHERE analysis_id IN (...)` queries for all 7
    # satellites, regardless of whether the calling code asked for them. Chosen
    # deliberately over per-call-site joinedload(): this project has already hit
    # two related failure classes this session (live-DB schema drift, and a
    # MissingGreenlet from an un-eager-loaded relationship read in an async
    # context) -- a fixed default here removes that whole risk class at every
    # one of the ~12 query sites that touch ai_analysis, present and future, at
    # the cost of a few trivial extra indexed-PK queries per request.
    cv_features = relationship("AiCvFeatures", back_populates="analysis", uselist=False,
                                lazy="selectin", cascade="all, delete-orphan")
    gee_context = relationship("AiGeeContext", back_populates="analysis", uselist=False,
                                lazy="selectin", cascade="all, delete-orphan")
    gis_context = relationship("AiGisContext", back_populates="analysis", uselist=False,
                                lazy="selectin", cascade="all, delete-orphan")
    poi_context = relationship("AiPoiContext", back_populates="analysis", uselist=False,
                                lazy="selectin", cascade="all, delete-orphan")
    crowdsource_context = relationship("AiCrowdsourceContext", back_populates="analysis", uselist=False,
                                        lazy="selectin", cascade="all, delete-orphan")
    priority_decision = relationship("AiPriorityDecision", back_populates="analysis", uselist=False,
                                      lazy="selectin", cascade="all, delete-orphan")
    legacy_scores = relationship("AiLegacyScores", back_populates="analysis", uselist=False,
                                  lazy="selectin", cascade="all, delete-orphan")

    # ─── association_proxy: flat attribute compatibility layer ────────────────
    # Deliberate choice, not an oversight: the DB is normalized into 7 satellite
    # tables above, but every existing consumer of AIAnalysis (schemas.py's
    # Pydantic from_attributes, the CASP module, the reprocess-location update
    # block, backfill scripts, ~40+ read/write sites across the codebase) was
    # written against a single wide row and expects e.g. `ana.cv_defect_count`
    # or `existing.priority_class = x` to just work. association_proxy makes
    # every one of the 37 original column names still readable AND writable as
    # a flat attribute on AIAnalysis, transparently delegating to the correct
    # satellite object underneath. This keeps the application layer's interface
    # stable while the schema is normalized, shrinking this refactor's real
    # blast radius down to the single row-construction site in router.py instead
    # of rewriting every call site to a nested path. (Write only works once the
    # target satellite row already exists, which is guaranteed here -- the
    # insert path always creates all 7 satellites together; see router.py.)
    cv_defect_count = association_proxy("cv_features", "cv_defect_count")
    cv_damage_ratio_percent = association_proxy("cv_features", "cv_damage_ratio_percent")
    cv_max_severity_score = association_proxy("cv_features", "cv_max_severity_score")
    cv_details_json = association_proxy("cv_features", "cv_details_json")
    annotated_image_filename = association_proxy("cv_features", "annotated_image_filename")

    rainfall_last_12m_mm = association_proxy("gee_context", "rainfall_last_12m_mm")
    soil_moisture_last_30d_mm = association_proxy("gee_context", "soil_moisture_last_30d_mm")
    ndvi_index = association_proxy("gee_context", "ndvi_index")
    estimated_surface_material = association_proxy("gee_context", "estimated_surface_material")
    nightlight_radiance = association_proxy("gee_context", "nightlight_radiance")
    slope = association_proxy("gee_context", "slope")

    road_name = association_proxy("gis_context", "road_name")
    road_type = association_proxy("gis_context", "road_type")
    osm_highway_type = association_proxy("gis_context", "osm_highway_type")
    osm_way_id = association_proxy("gis_context", "osm_way_id")
    lanes = association_proxy("gis_context", "lanes")
    speed_limit = association_proxy("gis_context", "speed_limit")
    admin_province = association_proxy("gis_context", "admin_province")
    admin_district = association_proxy("gis_context", "admin_district")
    admin_subdistrict = association_proxy("gis_context", "admin_subdistrict")

    community_impact_score_pi = association_proxy("poi_context", "community_impact_score_pi")
    nearest_poi_distance_m = association_proxy("poi_context", "nearest_poi_distance_m")

    crowdsource_report_count_30d = association_proxy("crowdsource_context", "crowdsource_report_count_30d")
    days_since_last_report = association_proxy("crowdsource_context", "days_since_last_report")
    user_severity_score_avg = association_proxy("crowdsource_context", "user_severity_score_avg")

    heuristic_score = association_proxy("priority_decision", "heuristic_score")
    fuzzy_score = association_proxy("priority_decision", "fuzzy_score")
    ml_score = association_proxy("priority_decision", "ml_score")
    priority_class = association_proxy("priority_decision", "priority_class")
    confidence_score = association_proxy("priority_decision", "confidence_score")
    proba_normal = association_proxy("priority_decision", "proba_normal")
    proba_warning = association_proxy("priority_decision", "proba_warning")
    proba_critical = association_proxy("priority_decision", "proba_critical")
    gps_anomaly_flagged = association_proxy("priority_decision", "gps_anomaly_flagged")
    gps_anomaly_reason = association_proxy("priority_decision", "gps_anomaly_reason")

    final_fusion_score = association_proxy("legacy_scores", "final_fusion_score")
    final_decision = association_proxy("legacy_scores", "final_decision")

    def __repr__(self):
        return f"<AIAnalysis(id={self.id}, report_id={self.report_id})>"


# ─── AIAnalysis normalization -- 7 satellite tables (1:1 via shared PK) ───────
# Additive-only for now: analysis_id is both PK and FK back to ai_analyses.id.
# Deliberately NOT wiring relationship()/back_populates from either side yet --
# that, plus the association_proxy flat-attribute layer on AIAnalysis, lands
# together in one reviewable step once these tables are created, populated, and
# diff-verified against the live data. Column defs are copied verbatim (type,
# nullability, default, comment) from the original AIAnalysis columns they
# replace -- no field renamed, no default changed.

class AiCvFeatures(Base):
    """ตาราง ai_cv_features - ผลลัพธ์การตรวจจับความเสียหายจาก Computer Vision (RT-DETR)
    Satellite ของ AIAnalysis (normalized 1:1 ผ่าน analysis_id เป็นทั้ง PK และ FK)"""
    __tablename__ = "ai_cv_features"

    analysis_id = Column(Integer, ForeignKey("ai_analyses.id", ondelete="CASCADE"), primary_key=True)

    cv_defect_count = Column(Integer, default=0, comment="จำนวนจุดบกพร่อง/รอยร้าวที่โมเดลตรวจเจอทั้งหมด")
    cv_damage_ratio_percent = Column(Float, default=0.0, comment="อัตราส่วนความเสียหายต่อพื้นที่ภาพ (%)")
    cv_max_severity_score = Column(Integer, default=0, comment="คะแนนความรุนแรงสูงสุดที่พบ (D00=2, D10=2, D20=4, D40=5)")
    cv_details_json = Column(JSONB, nullable=True, comment="รายละเอียดจำนวนประเภทรอยร้าวที่ตรวจพบ เช่น {'D00': 1, 'D40': 2}")
    annotated_image_filename = Column(String(255), nullable=True, comment="ชื่อไฟล์ภาพผลลัพธ์แบบ Bounding Box")

    analysis = relationship("AIAnalysis", back_populates="cv_features")


class AiGeeContext(Base):
    """ตาราง ai_gee_context - บริบทสิ่งแวดล้อมจาก Google Earth Engine. Satellite ของ AIAnalysis."""
    __tablename__ = "ai_gee_context"

    analysis_id = Column(Integer, ForeignKey("ai_analyses.id", ondelete="CASCADE"), primary_key=True)

    rainfall_last_12m_mm = Column(Float, default=0.0, comment="ปริมาณน้ำฝนสะสมย้อนหลัง 12 เดือนล่าสุด (มม.)")
    soil_moisture_last_30d_mm = Column(Float, default=0.0, comment="ระดับความชื้นในผิวดินเฉลี่ย 30 วันย้อนหลัง")
    ndvi_index = Column(Float, default=0.0, comment="ดัชนีพื้นที่สีเขียว/พืชพรรณ NDVI")
    estimated_surface_material = Column(String(100), nullable=True, comment="ประเภทวัสดุผิวถนนที่ประเมินจาก Sentinel-2")
    nightlight_radiance = Column(Float, default=0.0, comment="ความเข้มข้นแสงไฟกลางคืน (Nightlight Radiance)")
    slope = Column(Float, default=0.0, comment="ความลาดชันของพื้นที่ (องศา)")

    analysis = relationship("AIAnalysis", back_populates="gee_context")


class AiGisContext(Base):
    """ตาราง ai_gis_context - บริบทถนน/ที่ตั้งทางปกครองจาก OSM + pyrosm boundary cache.
    Satellite ของ AIAnalysis (รวม admin_province/district/subdistrict -- แหล่งข้อมูลเดียวกัน
    กับ OSM context, เล็กเกินไปที่จะแยกเป็นตารางของตัวเอง)."""
    __tablename__ = "ai_gis_context"

    analysis_id = Column(Integer, ForeignKey("ai_analyses.id", ondelete="CASCADE"), primary_key=True)

    road_name = Column(String(255), nullable=True, comment="ชื่อถนนที่รายงานจาก OpenStreetMap")
    road_type = Column(String(100), nullable=True, comment="ประเภทถนน (Primary, Secondary, Local)")
    osm_highway_type = Column(String(100), nullable=True, comment="ประเภทถนนแบบ Raw Tag (OSM Highway)")
    osm_way_id = Column(BigInteger, nullable=True, index=True, comment="OSM Way ID ของถนนที่ใกล้ที่สุด (สำหรับ road-segment aggregation)")
    lanes = Column(Integer, default=2, comment="จำนวนเลนของถนน")
    speed_limit = Column(Float, default=50.0, comment="ความเร็วจำกัดของถนน (km/h)")
    admin_province = Column(String(100), nullable=True, comment="จังหวัด (admin_level=4)")
    admin_district = Column(String(100), nullable=True, comment="อำเภอ (admin_level=6)")
    admin_subdistrict = Column(String(100), nullable=True, comment="ตำบล (admin_level=8)")

    analysis = relationship("AIAnalysis", back_populates="gis_context")


class AiPoiContext(Base):
    """ตาราง ai_poi_context - คะแนนผลกระทบชุมชนจาก Points of Interest. Satellite ของ AIAnalysis."""
    __tablename__ = "ai_poi_context"

    analysis_id = Column(Integer, ForeignKey("ai_analyses.id", ondelete="CASCADE"), primary_key=True)

    community_impact_score_pi = Column(Integer, default=0, comment="คะแนนผลกระทบชุมชนประเมินจาก POIs (โรงพยาบาล/โรงเรียน)")
    nearest_poi_distance_m = Column(Float, default=1000.0, comment="ระยะห่างไปยังสถานที่สำคัญที่ใกล้ที่สุด (เมตร)")

    analysis = relationship("AIAnalysis", back_populates="poi_context")


class AiCrowdsourceContext(Base):
    """ตาราง ai_crowdsource_context - สถิติการแจ้งซ้ำในบริเวณใกล้เคียง. Satellite ของ AIAnalysis."""
    __tablename__ = "ai_crowdsource_context"

    analysis_id = Column(Integer, ForeignKey("ai_analyses.id", ondelete="CASCADE"), primary_key=True)

    crowdsource_report_count_30d = Column(Integer, default=0, comment="จำนวนการรายงานในรัศมีรอบๆ 30 วันที่ผ่านมา")
    days_since_last_report = Column(Integer, default=999, comment="จำนวนวันนับตั้งแต่รายงานล่าสุดในรัศมี")
    user_severity_score_avg = Column(Float, default=0.0, comment="ระดับความรุนแรงเฉลี่ยจากการประเมินในบริเวณนั้น")

    analysis = relationship("AIAnalysis", back_populates="crowdsource_context")


class AiPriorityDecision(Base):
    """ตาราง ai_priority_decision - ผลลัพธ์การตัดสินใจ Priority (Multi-Fusion scores + RF Decision
    Head + GPS/NDVI sanity check). Satellite ของ AIAnalysis. gps_anomaly_* อยู่ที่นี่แทนที่จะแยกไป
    กับ legacy fields เพราะเป็นฟีเจอร์ที่ยังใช้งานจริง (ไม่ใช่ deprecated) และเกี่ยวข้องโดยตรงกับ
    ความน่าเชื่อถือของผลการตัดสินใจในแถวเดียวกัน"""
    __tablename__ = "ai_priority_decision"

    analysis_id = Column(Integer, ForeignKey("ai_analyses.id", ondelete="CASCADE"), primary_key=True)

    heuristic_score = Column(Float, nullable=True, comment="ดัชนีความสำคัญคำนวณด้วย Rule-based Heuristics")
    fuzzy_score = Column(Float, nullable=True, comment="ดัชนีความสำคัญคำนวณด้วย Fuzzy logic DSS")
    ml_score = Column(Float, nullable=True, comment="ดัชนีความสำคัญทำนายด้วย Machine Learning Model")

    priority_class = Column(SAEnum(PriorityClass), nullable=True, comment="RF-predicted priority class (1=Normal/2=Warning/3=Critical), matches GT_priority_class convention")
    confidence_score = Column(Float, nullable=True, comment="RF predict_proba() value for the predicted class (0.0-1.0)")
    proba_normal = Column(Float, nullable=True, comment="RF predict_proba()[Normal] -- full distribution, needed for CASP's expected-value aggregation")
    proba_warning = Column(Float, nullable=True, comment="RF predict_proba()[Warning]")
    proba_critical = Column(Float, nullable=True, comment="RF predict_proba()[Critical]")

    gps_anomaly_flagged = Column(Boolean, nullable=False, default=False, comment="NDVI ตรวจพบความเป็นไปได้ว่าพิกัด GPS ไม่ตรงกับภาพ -- รอผู้ใช้ยืนยัน/แก้ไขตำแหน่ง")
    gps_anomaly_reason = Column(String(100), nullable=True, comment="เหตุผลที่ถูก flag เช่น ndvi_high / ndvi_low (สำหรับ debug/แสดงผล admin)")

    analysis = relationship("AIAnalysis", back_populates="priority_decision")


class AiLegacyScores(Base):
    """ตาราง ai_legacy_scores - คะแนน/ผลลัพธ์แบบเดิมก่อนเปลี่ยนมาใช้ RF Decision Head
    (DEPRECATED, เก็บไว้เพื่อ backward compat เท่านั้น). แยกออกจาก ai_priority_decision
    โดยเจตนา เพื่อให้การเลิกใช้งานในอนาคตทำได้ง่าย (drop ตารางนี้ตารางเดียว)."""
    __tablename__ = "ai_legacy_scores"

    analysis_id = Column(Integer, ForeignKey("ai_analyses.id", ondelete="CASCADE"), primary_key=True)

    final_fusion_score = Column(Float, nullable=True, comment="[DEPRECATED] legacy continuous fusion score, superseded by priority_class")
    final_decision = Column(String(50), nullable=True, comment="[DEPRECATED] legacy decision string, superseded by priority_class")

    analysis = relationship("AIAnalysis", back_populates="legacy_scores")


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


class UserRole(str, enum.Enum):
    """บทบาทของผู้ใช้งานระบบ (เจ้าหน้าที่ และ ผู้ดูแลระบบ)"""
    OFFICER = "officer"
    ADMIN = "admin"


class User(Base):
    """
    ตาราง users - สำหรับเจ้าหน้าที่ (Officers) และผู้ดูแลระบบ (Admins) 
    (General Users ไม่มีบัญชีผู้ใช้)
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False, comment="อีเมลสำหรับเข้าสู่ระบบ")
    hashed_password = Column(String(255), nullable=False, comment="รหัสผ่านที่เข้ารหัสแล้ว")
    role = Column(SAEnum(UserRole), default=UserRole.OFFICER, nullable=False, comment="บทบาทของผู้ใช้")
    is_active = Column(Integer, default=1, comment="สถานะบัญชี (1=Active, 0=Inactive) ใช้ Integer แทน Boolean ให้เข้ากับบาง DB")
    
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    last_login = Column(DateTime(timezone=True), nullable=True)

    # ความสัมพันธ์
    actions = relationship("ReportAction", back_populates="officer")
    settings_updated = relationship("SystemSetting", back_populates="admin")


class ReportAction(Base):
    """
    ตาราง report_actions - Audit Log สำหรับติดตามการแก้ไขสถานะรายงานโดยเจ้าหน้าที่
    """
    __tablename__ = "report_actions"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    report_id = Column(Integer, ForeignKey("road_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    officer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    previous_status = Column(SAEnum(ReportStatus), nullable=True, comment="สถานะก่อนหน้า")
    new_status = Column(SAEnum(ReportStatus), nullable=False, comment="สถานะใหม่")
    
    action_note = Column(Text, nullable=True, comment="บันทึกการปฏิบัติงานเพิ่มเติม")
    repaired_image_filename = Column(String(255), nullable=True, comment="ไฟล์รูปภาพหลังซ่อมแซมสำเร็จ (ถ้ามี)")
    
    action_timestamp = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # ความสัมพันธ์
    report = relationship("RoadReport", back_populates="actions")
    officer = relationship("User", back_populates="actions")


class SystemSetting(Base):
    """
    ตาราง system_settings - สำหรับ Admin ในการตั้งค่าพารามิเตอร์ AI แบบไดนามิก
    """
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    config_key = Column(String(100), unique=True, nullable=False, comment="คีย์การตั้งค่า (เช่น ACTIVE_AI_MODEL)")
    config_value = Column(JSONB, nullable=False, comment="ค่าของการตั้งค่าแบบ JSON")
    
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    admin = relationship("User", back_populates="settings_updated")