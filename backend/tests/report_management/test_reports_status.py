"""Report status-update tests for the report-management group."""

import pytest

from app.reports.models import ReportStatus


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
async def test_update_report_status_rejects_unknown_status(client, create_report):
    report_id = await create_report()

    response = await client.patch(
        f"/api/reports/{report_id}/status",
        json={"status": "unknown"},
    )

    assert response.status_code == 400


@pytest.mark.integration
@pytest.mark.asyncio
async def test_update_report_status_returns_404_when_report_is_missing(client):
    response = await client.patch(
        "/api/reports/999/status",
        json={"status": ReportStatus.COMPLETED.value},
    )

    assert response.status_code == 404
