"""
Road Report Backend - Main Application Entry Point
จุดเริ่มต้นของ FastAPI Application
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import init_db
from app.routes.reports import router as reports_router
from app.services.file_service import ensure_upload_dir

from app.services.ai_model import load_trained_model


# ─── Lifespan Event: ทำงานตอนเริ่มต้น/ปิดเซิร์ฟเวอร์ ────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup & Shutdown events"""
    # Startup: สร้างตารางฐานข้อมูล + โฟลเดอร์อัปโหลด
    print("🚀 กำลังเริ่มต้นระบบ Road Report Backend...")
    await init_db()
    ensure_upload_dir()

    print("🧠 กำลังโหลดสมอง AI เข้าสู่ระบบ...")
    import os
    MODEL_PATH = "faster_rcnn_road_damage_final.pth"
    if os.path.exists(MODEL_PATH):
        app.state.model, app.state.device = load_trained_model(MODEL_PATH)
        print("✅ โมเดล AI พร้อมทำนาย!")
    else:
        print("⚠️ คำเตือน: ไม่พบไฟล์โมเดล AI ระบบจะทำงานแบบไม่มี AI")
        app.state.model = None

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
        "และบันทึกข้อมูลลงฐานข้อมูลเพื่อใช้ในการทำนายอายุการใช้งานถนน"
    ),
    version="1.0.0",
    lifespan=lifespan,
)


# ─── Middleware ─────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # อนุญาตทุกแหล่งที่มา (ในเครื่อง Local ใช้แบบนี้ได้ครับ)
    # allow_origins=settings.ALLOWED_ORIGINS,
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
    return {"status": "ok", "service": "Road Report Backend", "version": "1.0.0"}


# ─── Root ──────────────────────────────────────────────────────

@app.get("/", tags=["System"])
async def root():
    """หน้าแรกของ API"""
    return {
        "message": "Road Report API is running",
        "docs": "/docs",
        "redoc": "/redoc",
    }
