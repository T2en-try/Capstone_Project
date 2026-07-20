"""
Road Report Backend - File Service
บริการจัดการไฟล์รูปภาพที่อัปโหลด
"""

import os
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import UploadFile, HTTPException

from app.core.config import settings


def ensure_upload_dir() -> str:
    """สร้างโฟลเดอร์สำหรับเก็บรูปภาพ (ถ้ายังไม่มี)"""
    upload_path = Path(settings.UPLOAD_DIR)
    upload_path.mkdir(parents=True, exist_ok=True)
    return str(upload_path)


def validate_file(file: UploadFile) -> None:
    """
    ตรวจสอบความถูกต้องของไฟล์ที่อัปโหลด

    Raises:
        HTTPException: กรณีไฟล์ไม่ถูกต้อง
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="ไม่พบชื่อไฟล์")

    # ตรวจสอบนามสกุลไฟล์
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        allowed = ", ".join(settings.ALLOWED_EXTENSIONS)
        raise HTTPException(
            status_code=400,
            detail=f"ประเภทไฟล์ไม่ถูกต้อง รองรับเฉพาะ: {allowed}"
        )

    # ตรวจสอบ Content-Type
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="ไฟล์ที่อัปโหลดไม่ใช่รูปภาพ"
        )


class StorageService:
    """บริการจัดเก็บไฟล์ รองรับทั้ง Local และ Cloud Storage ในอนาคต"""
    
    def __init__(self):
        self.upload_dir = ensure_upload_dir()

    async def save_file(self, file: UploadFile) -> dict:
        """
        บันทึกไฟล์ที่อัปโหลด
        ในอนาคต: สามารถเพิ่มเงื่อนไขถ้าใช้ S3 ให้เรียก self._save_to_s3(file)
        """
        validate_file(file)

        contents = await file.read()
        file_size = len(contents)
        if file_size > settings.MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=400,
                detail=f"ไฟล์มีขนาดใหญ่เกินไป (สูงสุด {settings.MAX_FILE_SIZE_MB} MB)"
            )

        ext = os.path.splitext(file.filename)[1].lower()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_name = f"{timestamp}_{uuid.uuid4().hex[:8]}{ext}"
        
        file_path = os.path.join(self.upload_dir, unique_name)
        
        # Local Storage Save
        with open(file_path, "wb") as f:
            f.write(contents)

        # TODO: S3 Cloud Storage Integration (to be implemented by teammate)
        # s3_client.upload_fileobj(...)
        # url = f"https://{S3_BUCKET}.s3.amazonaws.com/{unique_name}"

        print(f"✅ บันทึกไฟล์สำเร็จ: {unique_name} ({file_size:,} bytes)")

        return {
            "filename": unique_name,
            "original_name": file.filename,
            "path": file_path, # In cloud mode, this could be the URL
            "size_bytes": file_size,
            "mime_type": file.content_type,
            "contents": contents,
        }

# Instance สำหรับใช้งานแบบ Singleton
storage_service = StorageService()

async def save_upload_file(file: UploadFile) -> dict:
    """Wrapper function เพื่อให้โค้ดเก่าทำงานได้ปกติ"""
    return await storage_service.save_file(file)
