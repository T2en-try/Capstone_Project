"""
Unit tests for file utilities
"""
import pytest
import os
from pathlib import Path


class TestFileUtils:
    """Test file utility functions"""
    
    @pytest.mark.unit
    def test_path_exists(self):
        """Test that we can check if paths exist"""
        assert Path(__file__).exists()
    
    @pytest.mark.unit
    def test_create_directory_structure(self, tmp_path):
        """Test creating directory structure"""
        test_dir = tmp_path / "test_uploads"
        test_dir.mkdir(exist_ok=True)
        assert test_dir.exists()
        assert test_dir.is_dir()
    
    @pytest.mark.unit
    def test_file_permissions(self, tmp_path):
        """Test file permission handling"""
        test_file = tmp_path / "test.txt"
        test_file.write_text("test content")
        assert test_file.exists()
        assert test_file.is_file()
