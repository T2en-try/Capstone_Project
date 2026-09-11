"""
Auth - API Router
API Endpoints สำหรับระบบยืนยันตัวตน
ใช้ตาราง users เป็นหลัก
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.reports.models import User, UserRole

from app.auth.schemas import (
    LoginRequest,
    LoginResponse,
    AuthMeResponse,
    AuthErrorResponse,
    AdminInfo,
)

from app.auth.utils import (
    verify_password,
    create_access_token,
    verify_token,
)


router = APIRouter(
    prefix="/api/auth",
    tags=["Auth"],
)


# =========================================================
# Helper: ดึง User จาก Token
# =========================================================

async def get_current_admin(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependency สำหรับตรวจสอบ JWT Token
    และดึงข้อมูล Admin จากตาราง users
    """

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="ไม่พบ Token หรือรูปแบบไม่ถูกต้อง",
        )

    token = authorization.split(" ", 1)[1]

    payload = verify_token(token)

    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Token ไม่ถูกต้องหรือหมดอายุ",
        )

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Token ไม่มีข้อมูลผู้ใช้",
        )

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="ข้อมูลผู้ใช้ใน Token ไม่ถูกต้อง",
        )

    # ค้นหา User จากตาราง users
    result = await db.execute(
        select(User).where(User.id == user_id)
    )

    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="ไม่พบผู้ใช้ในระบบ",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=401,
            detail="บัญชีถูกปิดใช้งาน",
        )

    # เฉพาะ ADMIN เท่านั้น
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="ไม่มีสิทธิ์เข้าถึงส่วนผู้ดูแลระบบ",
        )

    return user


# =========================================================
# POST: Login
# =========================================================

@router.post(
    "/login",
    response_model=LoginResponse,
    responses={
        401: {
            "model": AuthErrorResponse
        }
    },
    summary="เข้าสู่ระบบสำหรับผู้ดูแลระบบ",
)
async def admin_login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    ตรวจสอบ email/password
    จากตาราง users และส่งคืน JWT Token
    """

    # -----------------------------------------------------
    # ค้นหา User จาก email
    # -----------------------------------------------------

    result = await db.execute(
        select(User).where(
            User.email == str(body.email).lower()
        )
    )

    user = result.scalar_one_or_none()

    # -----------------------------------------------------
    # ตรวจสอบ Email / Password
    # -----------------------------------------------------

    if not user or not verify_password(
        body.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=401,
            detail="อีเมลหรือรหัสผ่านไม่ถูกต้อง",
        )

    # -----------------------------------------------------
    # ตรวจสอบสถานะบัญชี
    # -----------------------------------------------------

    if not user.is_active:
        raise HTTPException(
            status_code=401,
            detail="บัญชีนี้ถูกปิดใช้งาน",
        )

    # -----------------------------------------------------
    # ตรวจสอบ Role
    # -----------------------------------------------------

    if user.role not in (
        UserRole.ADMIN,
        UserRole.OFFICER,
    ):
        raise HTTPException(
            status_code=403,
            detail="บัญชีนี้ไม่มีสิทธิ์เข้าสู่ระบบ",
        )

    # -----------------------------------------------------
    # Update last_login
    # -----------------------------------------------------

    user.last_login = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(user)

    # -----------------------------------------------------
    # Create JWT Token
    # -----------------------------------------------------

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
        }
    )

    # -----------------------------------------------------
    # Response
    # -----------------------------------------------------

    return LoginResponse(
        access_token=access_token,
        admin=AdminInfo.model_validate(user),
    )


# =========================================================
# GET: Me
# =========================================================

@router.get(
    "/me",
    response_model=AuthMeResponse,
    responses={
        401: {
            "model": AuthErrorResponse
        }
    },
    summary="ดึงข้อมูลผู้ดูแลระบบจาก Token",
)
async def get_me(
    admin: User = Depends(get_current_admin),
):
    """
    ตรวจสอบ Token
    และส่งคืนข้อมูล Admin
    """

    return AuthMeResponse(
        admin=AdminInfo.model_validate(admin),
    )