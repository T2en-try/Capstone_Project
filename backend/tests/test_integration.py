"""Integration tests for the public backend API."""

import pytest

from app.reports.models import ReportStatus


@pytest.mark.integration
@pytest.mark.asyncio
async def test_health_check_returns_service_status(client):
    response = await client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "Road Report Backend",
        "version": "2.0.0",
    }


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_reports_returns_empty_paginated_list(client):
    response = await client.get("/api/reports/")

    assert response.status_code == 200
    assert response.json() == {
        "total": 0,
        "page": 1,
        "per_page": 20,
        "reports": [],
    }


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_report_returns_404_when_missing(client):
    response = await client.get("/api/reports/999")

    assert response.status_code == 404
    assert response.json()["detail"] == "ไม่พบรายงาน ID: 999"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_update_report_status_changes_saved_value(client, create_report):
    report_id = await create_report(status=ReportStatus.PENDING)

    response = await client.patch(
        f"/api/reports/{report_id}/status",
        json={"status": ReportStatus.COMPLETED.value},
    )

    assert response.status_code == 200
    assert response.json()["id"] == report_id
    assert response.json()["status"] == ReportStatus.COMPLETED.value


@pytest.mark.integration
@pytest.mark.asyncio
async def test_delete_report_removes_existing_resource(client, create_report):
    report_id = await create_report()

    delete_response = await client.delete(f"/api/reports/{report_id}")
    fetch_response = await client.get(f"/api/reports/{report_id}")

    assert delete_response.status_code == 200
    assert delete_response.json()["status"] == "success"
    assert fetch_response.status_code == 404
