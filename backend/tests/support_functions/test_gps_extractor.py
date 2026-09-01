"""EXIF GPS utility tests for the support-functions group."""

import pytest

from app.services.gps_extractor import _convert_to_degrees, extract_gps_from_exif


@pytest.mark.unit
def test_convert_to_degrees_from_fraction_tuples():
    result = _convert_to_degrees([(13, 1), (45, 1), (30, 1)])

    assert result == pytest.approx(13.7583333333)


@pytest.mark.unit
def test_convert_to_degrees_returns_zero_for_invalid_value():
    assert _convert_to_degrees("invalid") == 0.0


@pytest.mark.unit
def test_extract_gps_returns_none_when_image_has_no_exif():
    assert extract_gps_from_exif(b"not-an-image") == (None, None)
