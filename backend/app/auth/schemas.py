"""
Admin Auth - Pydantic Schemas
โมเดลสำหรับ Validation ข้อมูลขาเข้า/ขาออกของ Auth API
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr, ConfigDict


# ─── Request Schemas ───────────────────────────────────────────

class LoginRequest(BaseModel):
    """Schema สำหรับ Login Request"""
    email: str = Field(..., description="อีเมลผู้ดูแลระบบ")
    password: str = Field(..., min_length=4, description="รหัสผ่าน")


# ─── Response Schemas ──────────────────────────────────────────

class AdminInfo(BaseModel):
    """ข้อมูล Admin ที่ส่งกลับ (ไม่รวม password)"""
    id: int
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class LoginResponse(BaseModel):
    """Schema สำหรับ Login Response"""
    status: str = "success"
    access_token: str
    token_type: str = "bearer"
    admin: AdminInfo


class AuthMeResponse(BaseModel):
    """Schema สำหรับ /auth/me Response"""
    status: str = "success"
    admin: AdminInfo


class AuthErrorResponse(BaseModel):
    """Schema สำหรับ Auth Error"""
    status: str = "error"
    message: str
