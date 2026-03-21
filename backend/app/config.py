"""
Road Report Backend - Configuration Module
โมดูลจัดการการตั้งค่าระบบจาก Environment Variables
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./road_reports.db")

    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8080"))

    # Upload
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "10"))
    MAX_FILE_SIZE_BYTES: int = MAX_FILE_SIZE_MB * 1024 * 1024
    ALLOWED_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".webp", ".heic"}

    # CORS
    ALLOWED_ORIGINS: list = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5500"
    ).split(",")


settings = Settings()
