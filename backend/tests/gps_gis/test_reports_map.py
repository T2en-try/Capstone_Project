"""Map-point and damage-level tests for the GPS/GIS group."""

import pytest

from app.reports.models import PriorityClass, ReportStatus


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
    ("priority_class", "expected_level"),
    [
        (PriorityClass.CRITICAL, "critical"),
        (PriorityClass.WARNING, "warning"),
        (PriorityClass.NORMAL, "good"),
    ],
)
async def test_map_points_classifies_damage_level_from_ai_scores(
    client,
    create_report,
    create_ai_analysis,
    priority_class,
    expected_level,
):
    report_id = await create_report(status=ReportStatus.COMPLETED)
    await create_ai_analysis(
        report_id,
        priority_class=priority_class,
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
