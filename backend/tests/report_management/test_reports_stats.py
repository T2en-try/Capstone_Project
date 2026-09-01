"""Dashboard-summary tests for the report-management group."""

import pytest

from app.reports.models import ReportStatus


@pytest.mark.integration
@pytest.mark.asyncio
async def test_stats_summary_counts_each_status(client, create_report):
    await create_report(status=ReportStatus.PENDING)
    await create_report(status=ReportStatus.PROCESSING)
    await create_report(status=ReportStatus.COMPLETED)
    await create_report(status=ReportStatus.REJECTED)

    response = await client.get("/api/reports/stats/summary")

    assert response.status_code == 200
    assert response.json() == {
        "total_reports": 4,
        "pending_count": 1,
        "processing_count": 1,
        "completed_count": 1,
        "rejected_count": 1,
    }
