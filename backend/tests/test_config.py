"""
Unit tests for core configuration
"""
import pytest
from app.core.config import settings


class TestSettings:
    """Test application settings"""
    
    @pytest.mark.unit
    def test_settings_exist(self):
        """Test that settings object exists"""
        assert settings is not None
    
    @pytest.mark.unit
    def test_upload_dir_configured(self):
        """Test that upload directory is configured"""
        assert hasattr(settings, 'UPLOAD_DIR')
        assert settings.UPLOAD_DIR is not None
    
    @pytest.mark.unit
    def test_database_url_configured(self):
        """Test that database URL is configured"""
        assert hasattr(settings, 'DATABASE_URL')
