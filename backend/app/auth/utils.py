"""
Admin Auth - Utility Functions
ฟังก์ชันสำหรับจัดการ Password Hashing และ JWT Token
"""

from datetime import datetime, timezone, timedelta
from typing import Optional

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings


# ─── Password Hashing ─────────────────────────────────────────

def hash_password(password: str) -> str:
    """เข้ารหัสรหัสผ่านด้วย bcrypt"""
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """ตรวจสอบรหัสผ่านกับ hash ที่เก็บไว้"""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


# ─── JWT Token ─────────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """สร้าง JWT Access Token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=24))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_token(token: str) -> Optional[dict]:
    """ตรวจสอบและถอดรหัส JWT Token"""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None
