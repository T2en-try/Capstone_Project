"""Tests for the CASP `/api/analytics/grid-priority` endpoint's `days` lookback filter.

Regression coverage for a bug where `days` was declared as a query parameter
(with a docstring claiming it filters reports) but was never actually applied
to the report query -- every report ever recorded in the study area was
included regardless of `?days=`. See docs/production_migration_log.md for the
full writeup of the original bug.
"""

from datetime import datetime, timedelta, timezone

import pytest

from app.reports.models import ReportStatus

# A coordinate inside app/analytics/router.py's STUDY_AREA bbox
# (lat 14.85-14.92, lon 101.97-102.07). create_report's own default
# coordinate (Bangkok, ~13.76/100.50) falls outside this bbox and would
# never be assigned to a grid cell at all.
STUDY_AREA_LAT = 14.88
STUDY_AREA_LON = 102.02


@pytest.mark.integration
@pytest.mark.asyncio
async def test_grid_priority_excludes_reports_older_than_days_window(client, create_report):
    old_report_time = datetime.now(timezone.utc) - timedelta(days=10)
    await create_report(
        status=ReportStatus.COMPLETED,
        latitude=STUDY_AREA_LAT,
        longitude=STUDY_AREA_LON,
        created_at=old_report_time,
    )

    response = await client.get("/api/analytics/grid-priority?days=7")

    assert response.status_code == 200
    body = response.json()
    assert body["total_grids_with_reports"] == 0
    assert body["grids"] == []
    assert body["summary"]["total_reports_analyzed"] == 0


@pytest.mark.integration
@pytest.mark.asyncio
async def test_grid_priority_includes_reports_within_days_window(client, create_report):
    recent_report_time = datetime.now(timezone.utc) - timedelta(days=1)
    report_id = await create_report(
        status=ReportStatus.COMPLETED,
        latitude=STUDY_AREA_LAT,
        longitude=STUDY_AREA_LON,
        created_at=recent_report_time,
    )

    response = await client.get("/api/analytics/grid-priority?days=7")

    assert response.status_code == 200
    body = response.json()
    assert body["total_grids_with_reports"] == 1
    assert body["grids"][0]["report_count"] == 1
    assert body["grids"][0]["report_ids"] == [report_id]
    assert body["summary"]["total_reports_analyzed"] == 1


@pytest.mark.integration
@pytest.mark.asyncio
async def test_grid_priority_respects_custom_days_value(client, create_report):
    """A report 20 days old is excluded at the default (days=7) but included
    once the caller widens the window with `?days=30` -- this is the specific
    behavior that was silently broken before the fix (both calls used to
    return the same, unfiltered result)."""
    old_report_time = datetime.now(timezone.utc) - timedelta(days=20)
    report_id = await create_report(
        status=ReportStatus.COMPLETED,
        latitude=STUDY_AREA_LAT,
        longitude=STUDY_AREA_LON,
        created_at=old_report_time,
    )

    default_response = await client.get("/api/analytics/grid-priority")
    assert default_response.status_code == 200
    assert default_response.json()["total_grids_with_reports"] == 0

    widened_response = await client.get("/api/analytics/grid-priority?days=30")
    assert widened_response.status_code == 200
    body = widened_response.json()
    assert body["total_grids_with_reports"] == 1
    assert body["grids"][0]["report_ids"] == [report_id]
