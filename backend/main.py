"""
Road Report Backend - Main Application Entry Point
จุดเริ่มต้นของ FastAPI Application
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import init_db
from app.reports.router import router as reports_router
from app.core.file_utils import ensure_upload_dir

# --- [UPDATE] เปลี่ยนมาใช้ ai_engine ตัวใหม่แทน load_trained_model ---
from app.ai.engine import ai_engine


# ─── Lifespan Event: ทำงานตอนเริ่มต้น/ปิดเซิร์ฟเวอร์ ────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup & Shutdown events"""
    # Startup: สร้างตารางฐานข้อมูล + โฟลเดอร์อัปโหลด
    print("🚀 กำลังเริ่มต้นระบบ Road Report Backend...")
    await init_db()
    ensure_upload_dir()

    # --- [UPDATE] โหลดสมองกล RT-DETR ---
    ai_engine.load_model()
    # นำไปผูกกับ app.state ไว้ด้วยเผื่อระบบเก่าเรียกใช้งาน
    app.state.model = ai_engine.model 

    print("✅ ฐานข้อมูลพร้อมใช้งาน")
    print(f"📁 โฟลเดอร์อัปโหลด: {settings.UPLOAD_DIR}")
    yield
    # Shutdown
    print("👋 ปิดระบบ Road Report Backend")


# ─── สร้าง FastAPI Application ─────────────────────────────────

app = FastAPI(
    title="Road Report API",
    description=(
        "## ระบบรายงานสภาพถนน\n\n"
        "API สำหรับรับรูปภาพถนนจากผู้ใช้ สกัดพิกัด GPS จาก EXIF "
        "และบันทึกข้อมูลลงฐานข้อมูลเพื่อใช้ในการทำนายอายุการใช้งานถนนด้วย AI (RT-DETR)"
    ),
    version="2.0.0",
    lifespan=lifespan,
)


# ─── Middleware ─────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Mount Static Files (สำหรับเสิร์ฟรูปภาพที่อัปโหลด) ───────

ensure_upload_dir()
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


# ─── Register Routers ─────────────────────────────────────────

app.include_router(reports_router)


# ─── Health Check ──────────────────────────────────────────────

@app.get("/api/health", tags=["System"])
async def health_check():
    """ตรวจสอบสถานะเซิร์ฟเวอร์"""
    return {"status": "ok", "service": "Road Report Backend", "version": "2.0.0"}


# ─── Root ──────────────────────────────────────────────────────

@app.get("/", tags=["System"])
async def root():
    """หน้าแรกของ API"""
    return {
        "message": "Road Report API is running smoothly!",
        "docs": "/docs",
        "redoc": "/redoc",
    }