"""Report GPS-source tests for the GPS/GIS group."""

import pytest

from app.reports.models import ReportStatus


@pytest.mark.integration
@pytest.mark.asyncio
async def test_upload_report_creates_processing_report_with_manual_gps(
    client, stub_report_upload_dependencies
):
    response = await client.post(
        "/api/reports/upload",
        files={"image": ("road.jpg", b"fake-image", "image/jpeg")},
        data={
            "latitude": "13.7563",
            "longitude": "100.5018",
            "description": "Pothole near intersection",
            "reporter_name": "tester",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "success"
    assert body["report"]["status"] == ReportStatus.PROCESSING.value
    assert body["report"]["image_filename"] == "stored-road.jpg"
    assert body["gps_extracted"] == {
        "latitude": 13.7563,
        "longitude": 100.5018,
        "source": "manual",
    }
    assert stub_report_upload_dependencies["save_upload_file"] == 1


@pytest.mark.integration
@pytest.mark.asyncio
async def test_upload_report_uses_exif_gps_when_manual_gps_is_missing(
    client, monkeypatch, stub_report_upload_dependencies
):
    import app.reports.router as reports_router

    monkeypatch.setattr(
        reports_router, "extract_gps_from_exif", lambda _contents: (14.123456, 101.654321)
    )

    response = await client.post(
        "/api/reports/upload",
        files={"image": ("road.jpg", b"fake-image", "image/jpeg")},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["gps_extracted"] == {
        "latitude": 14.123456,
        "longitude": 101.654321,
        "source": "exif",
    }
    assert body["report"]["gps_source"] == "exif"
    assert stub_report_upload_dependencies["save_upload_file"] == 1


@pytest.mark.integration
@pytest.mark.asyncio
async def test_upload_report_allows_missing_gps_and_marks_source_none(
    client, monkeypatch, stub_report_upload_dependencies
):
    import app.reports.router as reports_router

    monkeypatch.setattr(
        reports_router, "extract_gps_from_exif", lambda _contents: (None, None)
    )

    response = await client.post(
        "/api/reports/upload",
        files={"image": ("road.jpg", b"fake-image", "image/jpeg")},
        data={"description": "No GPS image", "reporter_name": "tester"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["gps_extracted"] == {
        "latitude": None,
        "longitude": None,
        "source": "none",
    }
    assert body["report"]["latitude"] is None
    assert body["report"]["longitude"] is None
    assert body["report"]["gps_source"] == "none"
    assert stub_report_upload_dependencies["save_upload_file"] == 1
