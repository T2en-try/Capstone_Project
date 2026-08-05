import pytest
from app.ai.fusion_engines import FuzzyFusionEngine, RoadReportData

@pytest.fixture
def fuzzy_engine():
    return FuzzyFusionEngine()

def test_sanity_check_table(fuzzy_engine):
    """
    Test the base rules (R1a, R1b, R4a, R4b, R8) for all combinations
    of Severity (0, 2, 4, 5) and Road Type (0, 1, 2, 3) 
    with environmental variables zeroed out.
    """
    # Expected results derived from the 5-anchor, 13-rule logic
    expected_results = {
        # Sev=0
        (0, 0): 8.33,
        (0, 1): 8.33,
        (0, 2): 8.33,
        (0, 3): 8.33,
        # Sev=2
        (2, 0): 22.69,
        (2, 1): 22.69,
        (2, 2): 39.02,
        (2, 3): 39.02,
        # Sev=4
        (4, 0): 46.43,
        (4, 1): 46.43,
        (4, 2): 60.98,
        (4, 3): 60.98,
        # Sev=5
        (5, 0): 75.00,
        (5, 1): 75.00,
        (5, 2): 91.67,
        (5, 3): 91.67,
    }

    for (sev, road), expected in expected_results.items():
        data = RoadReportData(
            cv_severity=sev,
            road_type_enc=road,
            rain_12m=0,
            soil_moist=0.0,
            crowd_30d=0,
            comm_impact=0
        )
        result = fuzzy_engine.predict_ppi(data)
        assert pytest.approx(result, abs=0.1) == expected, f"Failed at Sev={sev}, Road={road}. Got {result}, expected {expected}"

def test_mid_range_case(fuzzy_engine):
    """
    Test a borderline case where multiple rules (R4a, R10) overlap and anchor
    the score exactly to 50.00 (Warning).
    Inputs: Sev=3, Road=2(Main), Rain=1500, Soil=0.5, Crowd=12, Impact=50
    """
    data = RoadReportData(
        cv_severity=3,
        road_type_enc=2,
        rain_12m=1500,
        soil_moist=0.5,
        crowd_30d=12,
        comm_impact=50
    )
    result = fuzzy_engine.predict_ppi(data)
    assert pytest.approx(result, abs=0.1) == 50.00

def test_conflict_case(fuzzy_engine):
    """
    Test R1b (Urgent) vs R2 (Critical) conflict.
    A severe pothole on a local road should normally cap at 75.00 (Urgent).
    However, if it's near a hospital (High Impact), it should override 
    the local road ceiling and pull the score up towards Critical (91.67).
    Expected result: ~79.17
    """
    data = RoadReportData(
        cv_severity=5,
        road_type_enc=1,
        rain_12m=0,
        soil_moist=0.0,
        crowd_30d=0,
        comm_impact=90
    )
    result = fuzzy_engine.predict_ppi(data)
    assert result > 75.00, f"Expected score to break the Urgent ceiling of 75.00, but got {result}"
    assert pytest.approx(result, abs=0.1) == 79.17
