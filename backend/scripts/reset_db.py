import asyncio
from app.core.database import engine, Base
# นำเข้าโมเดลทั้งหมดเพื่อให้ SQLAlchemy รู้จักโครงสร้าง 3-Table
from app.reports.models import RoadReport, AIAnalysis, ApiCacheGeeOsm

async def reset_database():
    print("⏳ กำลังเชื่อมต่อ PostgreSQL เพื่อรีเซ็ตฐานข้อมูล...")
    
    async with engine.begin() as conn:
        # 1. สั่งลบตารางเก่าทิ้งทั้งหมด (Drop All)
        print("🗑️ กำลังลบตารางเก่า...")
        await conn.run_sync(Base.metadata.drop_all)
        
        # 2. สร้างตารางใหม่ทั้งหมดจากไฟล์ models.py (Create All)
        print("✨ กำลังสร้างตารางใหม่ (3-Table Architecture)...")
        await conn.run_sync(Base.metadata.create_all)
        
    print("✅ รีเซ็ต Database สมบูรณ์แบบ! คอลัมน์ ML และ Fuzzy พร้อมใช้งานแล้ว")

if __name__ == "__main__":
    asyncio.run(reset_database())