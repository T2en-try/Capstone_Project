"""Report deletion tests for the report-management group."""

import pytest

from app.reports.models import ReportStatus


@pytest.mark.integration
@pytest.mark.asyncio
async def test_delete_report_removes_existing_resource(client, create_report):
    report_id = await create_report()

    delete_response = await client.delete(f"/api/reports/{report_id}")
    fetch_response = await client.get(f"/api/reports/{report_id}")

    assert delete_response.status_code == 200
    assert delete_response.json()["status"] == "success"
    assert fetch_response.status_code == 404


@pytest.mark.integration
@pytest.mark.asyncio
async def test_delete_report_returns_404_when_missing(client):
    response = await client.delete("/api/reports/999")

    assert response.status_code == 404


@pytest.mark.integration
@pytest.mark.asyncio
async def test_delete_report_removes_linked_ai_analysis(
    client, create_report, create_ai_analysis
):
    report_id = await create_report(status=ReportStatus.COMPLETED)
    await create_ai_analysis(report_id)

    delete_response = await client.delete(f"/api/reports/{report_id}")
    list_response = await client.get("/api/reports/")

    assert delete_response.status_code == 200
    assert list_response.status_code == 200
    assert list_response.json()["total"] == 0
