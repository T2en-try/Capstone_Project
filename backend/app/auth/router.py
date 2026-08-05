"""
Admin Auth - API Router
API Endpoints สำหรับระบบยืนยันตัวตนผู้ดูแลระบบ (Admin Only)
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.auth.models import AdminUser
from app.auth.schemas import (
    LoginRequest,
    LoginResponse,
    AuthMeResponse,
    AuthErrorResponse,
    AdminInfo,
)
from app.auth.utils import verify_password, create_access_token, verify_token


router = APIRouter(prefix="/api/auth", tags=["Auth"])


# ─── Helper: ดึง Admin จาก Token ──────────────────────────────

async def get_current_admin(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
) -> AdminUser:
    """Dependency: ตรวจสอบ JWT Token และดึงข้อมูล Admin"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="ไม่พบ Token หรือรูปแบบไม่ถูกต้อง")

    token = authorization.split(" ")[1]
    payload = verify_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Token ไม่ถูกต้องหรือหมดอายุ")

    admin_id = payload.get("sub")
    if not admin_id:
        raise HTTPException(status_code=401, detail="Token ไม่มีข้อมูลผู้ใช้")

    result = await db.execute(
        select(AdminUser).where(AdminUser.id == int(admin_id))
    )
    admin = result.scalar_one_or_none()

    if not admin or not admin.is_active:
        raise HTTPException(status_code=401, detail="ไม่พบผู้ดูแลระบบหรือบัญชีถูกปิดใช้งาน")

    return admin


# ─── POST: Login ───────────────────────────────────────────────

@router.post(
    "/login",
    response_model=LoginResponse,
    responses={401: {"model": AuthErrorResponse}},
    summary="เข้าสู่ระบบสำหรับผู้ดูแลระบบ",
)
async def admin_login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """ตรวจสอบ email/password และส่งคืน JWT Token"""

    # ค้นหา Admin ด้วย email
    result = await db.execute(
        select(AdminUser).where(AdminUser.email == body.email)
    )
    admin = result.scalar_one_or_none()

    if not admin or not verify_password(body.password, admin.hashed_password):
        raise HTTPException(status_code=401, detail="อีเมลหรือรหัสผ่านไม่ถูกต้อง")

    if not admin.is_active:
        raise HTTPException(status_code=401, detail="บัญชีนี้ถูกปิดใช้งาน")

    # อัพเดท last_login
    admin.last_login = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(admin)

    # สร้าง JWT Token
    access_token = create_access_token(
        data={"sub": str(admin.id), "email": admin.email, "role": admin.role}
    )

    return LoginResponse(
        access_token=access_token,
        admin=AdminInfo.model_validate(admin),
    )


# ─── GET: Me ──────────────────────────────────────────────────

@router.get(
    "/me",
    response_model=AuthMeResponse,
    responses={401: {"model": AuthErrorResponse}},
    summary="ดึงข้อมูลผู้ดูแลระบบจาก Token",
)
async def get_me(admin: AdminUser = Depends(get_current_admin)):
    """ตรวจสอบ Token และส่งคืนข้อมูล Admin"""
    return AuthMeResponse(
        admin=AdminInfo.model_validate(admin),
    )
