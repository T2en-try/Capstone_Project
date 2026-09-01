"""Fuzzy priority-score tests for the support-functions group."""

import pytest

from app.ai.fusion_engines import FuzzyFusionEngine, RoadReportData


@pytest.fixture
def fuzzy_engine():
    return FuzzyFusionEngine()


@pytest.mark.unit
def test_sanity_check_table(fuzzy_engine):
    expected_results = {
        (0, 0): 8.33,
        (0, 1): 8.33,
        (0, 2): 8.33,
        (0, 3): 8.33,
        (2, 0): 22.69,
        (2, 1): 22.69,
        (2, 2): 39.02,
        (2, 3): 39.02,
        (4, 0): 46.43,
        (4, 1): 46.43,
        (4, 2): 60.98,
        (4, 3): 60.98,
        (5, 0): 75.00,
        (5, 1): 75.00,
        (5, 2): 91.67,
        (5, 3): 91.67,
    }

    for (severity, road_type), expected in expected_results.items():
        data = RoadReportData(
            cv_severity=severity,
            road_type_enc=road_type,
            rain_12m=0,
            soil_moist=0.0,
            crowd_30d=0,
            comm_impact=0,
        )

        result = fuzzy_engine.predict_ppi(data)

        assert pytest.approx(result, abs=0.1) == expected


@pytest.mark.unit
def test_mid_range_case(fuzzy_engine):
    data = RoadReportData(
        cv_severity=3,
        road_type_enc=2,
        rain_12m=1500,
        soil_moist=0.5,
        crowd_30d=12,
        comm_impact=50,
    )

    result = fuzzy_engine.predict_ppi(data)

    assert pytest.approx(result, abs=0.1) == 50.00


@pytest.mark.unit
def test_conflict_case(fuzzy_engine):
    data = RoadReportData(
        cv_severity=5,
        road_type_enc=1,
        rain_12m=0,
        soil_moist=0.0,
        crowd_30d=0,
        comm_impact=90,
    )

    result = fuzzy_engine.predict_ppi(data)

    assert result > 75.00
    assert pytest.approx(result, abs=0.1) == 79.17
