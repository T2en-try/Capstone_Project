"""
Road Report Backend - Database Models
โมเดลฐานข้อมูลสำหรับระบบรายงานสภาพถนน
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Enum as SAEnum
import enum

from app.database import Base


class ReportStatus(str, enum.Enum):
    """สถานะของรายงาน"""
    PENDING = "pending"           # รอตรวจสอบ
    PROCESSING = "processing"     # กำลังประมวลผล
    COMPLETED = "completed"       # ประมวลผลเสร็จแล้ว
    REJECTED = "rejected"         # ปฏิเสธ (เช่น รูปไม่ใช่ถนน)


class RoadReport(Base):
    """
    ตาราง road_reports - เก็บข้อมูลรายงานสภาพถนนจากผู้ใช้
    """
    __tablename__ = "road_reports"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)

    # ข้อมูลรูปภาพ
    image_filename = Column(String(255), nullable=False, comment="ชื่อไฟล์รูปภาพที่บันทึกในเซิร์ฟเวอร์")
    image_original_name = Column(String(255), nullable=True, comment="ชื่อไฟล์ต้นฉบับจากผู้ใช้")
    image_path = Column(String(500), nullable=False, comment="เส้นทางเต็มของไฟล์รูปภาพ")
    image_size_bytes = Column(Integer, nullable=True, comment="ขนาดไฟล์ (bytes)")
    image_mime_type = Column(String(50), nullable=True, comment="ประเภทไฟล์ เช่น image/jpeg")

    # ข้อมูลพิกัด GPS (สกัดจาก EXIF ของรูปภาพ)
    latitude = Column(Float, nullable=True, index=True, comment="ละติจูด")
    longitude = Column(Float, nullable=True, index=True, comment="ลองจิจูด")
    gps_source = Column(
        String(50), nullable=True, default="exif",
        comment="แหล่งที่มาของพิกัด: exif, manual, browser"
    )

    # ข้อมูลเพิ่มเติมจากผู้ใช้
    description = Column(Text, nullable=True, comment="คำอธิบายเพิ่มเติมจากผู้ใช้")
    reporter_name = Column(String(100), nullable=True, comment="ชื่อผู้รายงาน (ไม่บังคับ)")

    # สถานะการประมวลผล
    status = Column(
        SAEnum(ReportStatus),
        default=ReportStatus.PENDING,
        nullable=False,
        comment="สถานะของรายงาน"
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
        comment="วันเวลาที่อัปเดตล่าสุด"
    )

    def __repr__(self):
        return f"<RoadReport(id={self.id}, lat={self.latitude}, lon={self.longitude}, status={self.status})>"
