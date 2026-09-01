"""Report listing and detail tests for the report-management group."""

import pytest

from app.reports.models import ReportStatus


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
async def test_get_reports_filters_by_status_and_returns_total(client, create_report):
    await create_report(status=ReportStatus.PENDING)
    await create_report(status=ReportStatus.COMPLETED)

    response = await client.get("/api/reports/?status=completed&per_page=1")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["page"] == 1
    assert body["per_page"] == 1
    assert len(body["reports"]) == 1
    assert body["reports"][0]["status"] == ReportStatus.COMPLETED.value


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_reports_rejects_unknown_status(client):
    response = await client.get("/api/reports/?status=unknown")

    assert response.status_code == 400


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_reports_rejects_invalid_pagination(client):
    response = await client.get("/api/reports/?page=0")

    assert response.status_code == 422


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_report_returns_404_when_missing(client):
    response = await client.get("/api/reports/999")

    assert response.status_code == 404


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_report_includes_ai_result_compatibility_payload(
    client, create_report, create_ai_analysis
):
    report_id = await create_report(status=ReportStatus.COMPLETED)
    await create_ai_analysis(
        report_id,
        cv_max_severity_score=5,
        final_fusion_score=0.82,
        final_decision="Critical",
        road_name="Main Street",
    )

    response = await client.get(f"/api/reports/{report_id}")

    assert response.status_code == 200
    body = response.json()
    assert body["ai_analysis"]["final_decision"] == "Critical"
    assert body["ai_result"]["cv_features"]["cv_max_severity_score"] == 5
    assert body["ai_result"]["context_data"]["gis"]["road_name"] == "Main Street"
    assert body["ai_result"]["fusion_result"]["fusion_score"] == 0.82
