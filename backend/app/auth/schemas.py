"""
Auth - Pydantic Schemas
โมเดลสำหรับ Validation ข้อมูลขาเข้า/ขาออกของ Auth API
"""

from datetime import datetime
from typing import Optional

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
)


# =========================================================
# Request Schemas
# =========================================================

class LoginRequest(BaseModel):
    """Schema สำหรับ Login Request"""

    email: EmailStr = Field(
        ...,
        description="อีเมลผู้ใช้งาน",
    )

    password: str = Field(
        ...,
        max_length=128,
        description="รหัสผ่าน",
    )


# =========================================================
# Response Schemas
# =========================================================

class AdminInfo(BaseModel):
    """
    ข้อมูล User ที่ส่งกลับหลัง Login
    ไม่รวม password
    """

    id: int

    employee_code: Optional[str] = None

    email: EmailStr

    first_name: Optional[str] = None

    last_name: Optional[str] = None

    phone: Optional[str] = None

    department: Optional[str] = None

    position: Optional[str] = None

    role: str

    is_active: bool

    created_at: datetime

    last_login: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True
    )


# =========================================================
# Login Response
# =========================================================

class LoginResponse(BaseModel):
    """Schema สำหรับ Login Response"""

    status: str = "success"

    access_token: str

    token_type: str = "bearer"

    admin: AdminInfo


# =========================================================
# Auth Me Response
# =========================================================

class AuthMeResponse(BaseModel):
    """Schema สำหรับ /auth/me Response"""

    status: str = "success"

    admin: AdminInfo


# =========================================================
# Auth Error Response
# =========================================================

class AuthErrorResponse(BaseModel):
    """Schema สำหรับ Auth Error"""

    status: str = "error"

    message: str