"""File validation and storage tests for the support-functions group."""

from io import BytesIO
from types import SimpleNamespace

import pytest
from fastapi import UploadFile
from starlette.datastructures import Headers

from app.core import file_utils
from app.core.config import settings


def make_upload(filename: str, content_type: str = "image/jpeg", content: bytes = b"image"):
    return UploadFile(
        file=BytesIO(content),
        filename=filename,
        headers=Headers({"content-type": content_type}),
    )


@pytest.mark.unit
@pytest.mark.parametrize(
    ("filename", "content_type"),
    [
        ("", "image/jpeg"),
        ("road.exe", "image/jpeg"),
        ("road.jpg", "application/pdf"),
    ],
)
def test_validate_file_rejects_invalid_uploads(filename, content_type):
    file = SimpleNamespace(filename=filename, content_type=content_type)

    with pytest.raises(file_utils.HTTPException) as exc_info:
        file_utils.validate_file(file)

    assert exc_info.value.status_code == 400


@pytest.mark.unit
@pytest.mark.asyncio
async def test_save_file_persists_contents_and_metadata(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))
    service = file_utils.StorageService()
    upload = make_upload("Road.JPG", content=b"test-image")

    result = await service.save_file(upload)

    saved_path = tmp_path / result["filename"]
    assert result["original_name"] == "Road.JPG"
    assert result["size_bytes"] == len(b"test-image")
    assert result["mime_type"] == "image/jpeg"
    assert saved_path.exists()
    assert saved_path.read_bytes() == b"test-image"
    assert saved_path.suffix == ".jpg"


@pytest.mark.unit
@pytest.mark.asyncio
async def test_save_file_rejects_files_over_configured_limit(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))
    monkeypatch.setattr(settings, "MAX_FILE_SIZE_BYTES", 3)
    service = file_utils.StorageService()

    with pytest.raises(file_utils.HTTPException) as exc_info:
        await service.save_file(make_upload("road.jpg", content=b"1234"))

    assert exc_info.value.status_code == 400
