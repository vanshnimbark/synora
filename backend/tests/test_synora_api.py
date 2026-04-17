"""
Synora Backend API Tests
Tests for mock OTP authentication and health endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthEndpoints:
    """Health check endpoint tests"""
    
    def test_root_endpoint(self):
        """Test root endpoint returns HTML (frontend) - 200 OK"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
        # Root returns frontend HTML, not JSON
        assert "<!DOCTYPE html>" in response.text or "<html" in response.text
        print(f"Root endpoint OK: returns HTML frontend")
    
    def test_health_endpoint(self):
        """Test /api/health returns status ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print(f"Health endpoint OK: {data}")


class TestMockOTPAuth:
    """Mock OTP authentication endpoint tests"""
    
    def test_mock_otp_existing_user(self):
        """Test mock OTP with seeded user (Aarav - 9000000001)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/mock-otp",
            json={"phone": "9000000001", "otp": "123456"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert "password" in data
        assert "created" in data
        assert data["email"] == "u9000000001@synora.app"
        # Existing user should return created=False
        assert data["created"] is False
        print(f"Mock OTP existing user OK: {data}")
    
    def test_mock_otp_new_user(self):
        """Test mock OTP with new phone number"""
        import time
        test_phone = f"999{int(time.time()) % 10000000:07d}"
        response = requests.post(
            f"{BASE_URL}/api/auth/mock-otp",
            json={"phone": test_phone, "otp": "654321"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert "password" in data
        assert "created" in data
        assert data["email"] == f"u{test_phone}@synora.app"
        print(f"Mock OTP new user OK: {data}")
    
    def test_mock_otp_invalid_phone_short(self):
        """Test mock OTP with invalid short phone number"""
        response = requests.post(
            f"{BASE_URL}/api/auth/mock-otp",
            json={"phone": "12345", "otp": "123456"}
        )
        # Pydantic validation returns 422 for invalid phone length
        assert response.status_code == 422
        print(f"Mock OTP invalid short phone rejected: {response.status_code}")
    
    def test_mock_otp_invalid_otp_short(self):
        """Test mock OTP with invalid short OTP"""
        response = requests.post(
            f"{BASE_URL}/api/auth/mock-otp",
            json={"phone": "9000000001", "otp": "123"}
        )
        assert response.status_code == 422  # Pydantic validation error
        print(f"Mock OTP invalid short OTP rejected: {response.status_code}")
    
    def test_mock_otp_missing_fields(self):
        """Test mock OTP with missing fields"""
        response = requests.post(
            f"{BASE_URL}/api/auth/mock-otp",
            json={}
        )
        assert response.status_code == 422
        print(f"Mock OTP missing fields rejected: {response.status_code}")
    
    def test_mock_otp_seeded_woman_user(self):
        """Test mock OTP with seeded woman user (Ananya - 9000000101)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/mock-otp",
            json={"phone": "9000000101", "otp": "123456"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "u9000000101@synora.app"
        assert data["created"] is False
        print(f"Mock OTP seeded woman user OK: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
