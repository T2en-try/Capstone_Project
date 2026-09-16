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


@pytest.mark.integration
@pytest.mark.asyncio
async def test_grid_priority_returns_4_factor_cus_and_dss_weights(client, create_report):
    """Verify that 4-Factor CUS fields (including N_new) and DSS default weights are present."""
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

    # Verify grid cell structure has 4-factor fields
    assert body["total_grids_with_reports"] == 1
    grid = body["grids"][0]
    assert "count_score" in grid
    assert "density_score" in grid
    assert "recency_score" in grid
    assert "segment_density_score" in grid
    assert "road_segment_count" in grid
    assert "cus" in grid
    assert "avg_ppi" in grid
    assert "overall_priority" in grid
    assert grid["report_ids"] == [report_id]

    # Verify DSS weights applied in summary
    dss = body["summary"].get("dss_weights_applied")
    assert dss is not None
    assert dss["w_ppi"] == 0.8
    assert dss["w_cus"] == 0.2
    assert dss["w_c"] == 0.3
    assert dss["w_d"] == 0.25
    assert dss["w_r"] == 0.25
    assert dss["w_n"] == 0.2


@pytest.mark.integration
@pytest.mark.asyncio
async def test_grid_priority_applies_custom_dss_weights_and_normalizes(client, create_report):
    """Verify that custom DSS weights are normalized and properly affect CUS and Overall Priority."""
    recent_report_time = datetime.now(timezone.utc) - timedelta(days=2)
    await create_report(
        status=ReportStatus.COMPLETED,
        latitude=STUDY_AREA_LAT,
        longitude=STUDY_AREA_LON,
        created_at=recent_report_time,
    )

    # Citizen & Public Focus preset: W_PPI=0.6, W_CUS=0.4, W_C=0.45, W_D=0.15, W_R=0.30, W_N=0.10
    response = await client.get(
        "/api/analytics/grid-priority?days=7&w_ppi=0.6&w_cus=0.4&w_c=0.45&w_d=0.15&w_r=0.30&w_n=0.10"
    )
    assert response.status_code == 200
    body = response.json()

    dss = body["summary"]["dss_weights_applied"]
    assert dss["w_ppi"] == 0.6
    assert dss["w_cus"] == 0.4
    assert dss["w_c"] == 0.45
    assert dss["w_d"] == 0.15
    assert dss["w_r"] == 0.3
    assert dss["w_n"] == 0.1

    # Verify that unnormalized weights (sum != 1.0) within [0, 1] are auto-normalized to sum=1.0
    unnormalized_res = await client.get(
        "/api/analytics/grid-priority?days=7&w_ppi=0.6&w_cus=0.2&w_c=0.1&w_d=0.1&w_r=0.1&w_n=0.1"
    )
    assert unnormalized_res.status_code == 200
    unnorm_dss = unnormalized_res.json()["summary"]["dss_weights_applied"]
    assert unnorm_dss["w_ppi"] == 0.75
    assert unnorm_dss["w_cus"] == 0.25
    assert unnorm_dss["w_c"] == 0.25
    assert unnorm_dss["w_d"] == 0.25
    assert unnorm_dss["w_r"] == 0.25
    assert unnorm_dss["w_n"] == 0.25


@pytest.mark.integration
@pytest.mark.asyncio
async def test_grid_priority_dss_weights_change_final_scores_deterministically(client, create_report):
    """
    Prove that applying different DSS weights actually changes the final CUS and Overall Priority scores
    deterministically (not random), and that different presets yield different results.
    """
    recent_report_time = datetime.now(timezone.utc) - timedelta(days=2)
    await create_report(
        status=ReportStatus.COMPLETED,
        latitude=STUDY_AREA_LAT,
        longitude=STUDY_AREA_LON,
        created_at=recent_report_time,
    )

    # 1. Test Baseline Preset (Default)
    # W_PPI=0.8, W_CUS=0.2 | C=0.3, D=0.25, R=0.25, N=0.2
    res_baseline = await client.get("/api/analytics/grid-priority?days=7")
    assert res_baseline.status_code == 200
    grid_baseline = res_baseline.json()["grids"][0]
    baseline_cus = grid_baseline["cus"]
    baseline_overall = grid_baseline["overall_priority"]

    # 2. Test Citizen Focus Preset
    # W_PPI=0.6, W_CUS=0.4 | C=0.45, D=0.15, R=0.3, N=0.1
    res_citizen = await client.get(
        "/api/analytics/grid-priority?days=7&w_ppi=0.6&w_cus=0.4&w_c=0.45&w_d=0.15&w_r=0.30&w_n=0.10"
    )
    assert res_citizen.status_code == 200
    grid_citizen = res_citizen.json()["grids"][0]
    citizen_cus = grid_citizen["cus"]
    citizen_overall = grid_citizen["overall_priority"]

    # Assert that the weights actually changed the output, proving it's not a dummy calculation
    assert baseline_cus != citizen_cus, f"CUS should change! Baseline: {baseline_cus}, Citizen: {citizen_cus}"
    assert baseline_overall != citizen_overall, f"Overall should change! Baseline: {baseline_overall}, Citizen: {citizen_overall}"
    
    # 3. Test Determinism (Calling the exact same params should yield the exact same score)
    res_citizen_again = await client.get(
        "/api/analytics/grid-priority?days=7&w_ppi=0.6&w_cus=0.4&w_c=0.45&w_d=0.15&w_r=0.30&w_n=0.10"
    )
    grid_citizen_again = res_citizen_again.json()["grids"][0]
    assert citizen_cus == grid_citizen_again["cus"], "CUS calculation is not deterministic"
    assert citizen_overall == grid_citizen_again["overall_priority"], "Overall calculation is not deterministic"
