"""
Road Report Backend - File Service
บริการจัดการไฟล์รูปภาพที่อัปโหลด
"""

import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

import boto3
from botocore.client import Config as BotoConfig
from botocore.exceptions import BotoCoreError, ClientError
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
    """บริการจัดเก็บไฟล์ -- บันทึกลง Local Disk เสมอ (เป็น working copy ที่
    ai_engine.predict_damage()/validate_is_road() และ reprocess_report_location
    อ่านโดยตรงผ่าน path บนดิสก์) และอัปโหลดขึ้น S3-compatible Cloud Storage
    เพิ่มเติมเมื่อตั้งค่า CLOUD_ENDPOINT/CLOUD_ACCESS_KEY/CLOUD_SECRET_KEY/BUCKET_NAME
    ครบทั้ง 4 ตัวใน config.py -- เป็น dual-write ไม่ใช่ทางเลือกแทนที่กัน เพื่อไม่ให้
    ต้องแก้ pipeline การวิเคราะห์ AI ที่ต้องใช้ local file path เสมอ"""

    def __init__(self):
        self.upload_dir = ensure_upload_dir()
        self._s3_client = None
        if self._cloud_configured():
            self._s3_client = boto3.client(
                "s3",
                endpoint_url=settings.CLOUD_ENDPOINT,
                aws_access_key_id=settings.CLOUD_ACCESS_KEY,
                aws_secret_access_key=settings.CLOUD_SECRET_KEY,
                config=BotoConfig(s3={"addressing_style": "path"}),
            )

    @staticmethod
    def _cloud_configured() -> bool:
        """Graceful-degrade เหมือน init_gee() -- อัปโหลดขึ้น Cloud เฉพาะเมื่อครบทั้ง 4
        ตัวเท่านั้น ถ้าขาดตัวใดตัวหนึ่งถือว่ายังไม่ได้ตั้งค่า ไม่ raise, ใช้ local เพียงอย่างเดียว"""
        return bool(
            settings.CLOUD_ENDPOINT
            and settings.CLOUD_ACCESS_KEY
            and settings.CLOUD_SECRET_KEY
            and settings.BUCKET_NAME
        )

    def _upload_to_s3(self, unique_name: str, contents: bytes, mime_type: Optional[str]) -> Optional[str]:
        """อัปโหลดไปยัง S3-compatible storage คืนค่า URL ถาวร หรือ None ถ้าไม่ได้ตั้งค่า Cloud
        ไว้หรืออัปโหลดไม่สำเร็จ -- ความล้มเหลวตรงนี้ไม่ทำให้ทั้งคำขออัปโหลดล้มเหลว เพราะไฟล์ local
        ถูกบันทึกไว้แล้วและยังใช้งานได้ตามปกติผ่าน image_filename"""
        if not self._s3_client:
            return None
        try:
            self._s3_client.put_object(
                Bucket=settings.BUCKET_NAME,
                Key=unique_name,
                Body=contents,
                ContentType=mime_type or "application/octet-stream",
            )
            return f"{settings.CLOUD_ENDPOINT.rstrip('/')}/{settings.BUCKET_NAME}/{unique_name}"
        except (BotoCoreError, ClientError) as e:
            print(f"⚠️ อัปโหลดขึ้น Cloud Storage ไม่สำเร็จ (ใช้ไฟล์ local ต่อไป): {e}")
            return None

    async def save_file(self, file: UploadFile) -> dict:
        """
        บันทึกไฟล์ที่อัปโหลดลง Local Disk เสมอ แล้วอัปโหลดขึ้น S3-compatible Cloud
        Storage เพิ่มเติมถ้าตั้งค่า CLOUD_* ครบ (ดู StorageService docstring)
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

        # Local Storage Save (เสมอ -- ยังเป็น working copy ให้ AI pipeline อ่าน)
        with open(file_path, "wb") as f:
            f.write(contents)

        # Cloud Storage Upload (เพิ่มเติม, ไม่ทดแทน local)
        image_url = self._upload_to_s3(unique_name, contents, file.content_type)

        print(
            f"✅ บันทึกไฟล์สำเร็จ: {unique_name} ({file_size:,} bytes)"
            + (" + Cloud Storage" if image_url else "")
        )

        return {
            "filename": unique_name,
            "original_name": file.filename,
            "path": file_path,
            "size_bytes": file_size,
            "mime_type": file.content_type,
            "contents": contents,
            "url": image_url,
        }

# Instance สำหรับใช้งานแบบ Singleton
storage_service = StorageService()

async def save_upload_file(file: UploadFile) -> dict:
    """Wrapper function เพื่อให้โค้ดเก่าทำงานได้ปกติ"""
    return await storage_service.save_file(file)
