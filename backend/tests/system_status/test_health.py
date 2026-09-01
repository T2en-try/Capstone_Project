"""Health-check tests for the system-status/authentication group."""

import pytest


@pytest.mark.integration
@pytest.mark.asyncio
async def test_health_check_returns_service_status(client):
    response = await client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "Road Report Backend",
        "version": "2.0.0",
    }
