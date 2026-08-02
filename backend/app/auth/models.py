"""
Admin Auth - Database Models
โมเดลสำหรับเก็บข้อมูล Admin User ในฐานข้อมูล
"""

from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.core.database import Base


class AdminUser(Base):
    """ตาราง admin_users สำหรับเก็บข้อมูลผู้ดูแลระบบ"""

    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=True, default="Admin")
    role = Column(String(50), nullable=False, default="admin")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime(timezone=True), nullable=True)
