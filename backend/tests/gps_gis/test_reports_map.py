"""Map-point and damage-level tests for the GPS/GIS group."""

import pytest

from app.reports.models import ReportStatus


@pytest.mark.integration
@pytest.mark.asyncio
async def test_map_points_excludes_rejected_reports_by_default(client, create_report):
    await create_report(status=ReportStatus.COMPLETED)
    await create_report(status=ReportStatus.REJECTED)

    response = await client.get("/api/reports/map/points")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["points"][0]["status"] == ReportStatus.COMPLETED.value


@pytest.mark.integration
@pytest.mark.asyncio
async def test_map_points_can_include_rejected_reports(client, create_report):
    await create_report(status=ReportStatus.REJECTED)

    response = await client.get("/api/reports/map/points?include_rejected=true")

    assert response.status_code == 200
    assert response.json()["total"] == 1


@pytest.mark.integration
@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("fusion_score", "severity_score", "decision", "expected_level"),
    [
        (0.75, 1, "Critical", "critical"),
        (0.50, 1, "Warning", "warning"),
        (0.30, 1, "Moderate", "moderate"),
        (0.10, 0, "Good", "good"),
    ],
)
async def test_map_points_classifies_damage_level_from_ai_scores(
    client,
    create_report,
    create_ai_analysis,
    fusion_score,
    severity_score,
    decision,
    expected_level,
):
    report_id = await create_report(status=ReportStatus.COMPLETED)
    await create_ai_analysis(
        report_id,
        final_fusion_score=fusion_score,
        cv_max_severity_score=severity_score,
        final_decision=decision,
    )

    response = await client.get("/api/reports/map/points")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["points"][0]["damage_level"] == expected_level


@pytest.mark.integration
@pytest.mark.asyncio
async def test_map_points_omits_reports_without_coordinates(client, create_report):
    await create_report(latitude=None, longitude=None, gps_source="none")

    response = await client.get("/api/reports/map/points")

    assert response.status_code == 200
    assert response.json() == {"total": 0, "points": []}
