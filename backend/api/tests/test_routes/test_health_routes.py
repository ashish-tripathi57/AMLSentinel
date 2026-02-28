import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check_returns_200(client: AsyncClient) -> None:
    """GET /api/health responds with HTTP 200."""
    response = await client.get("/api/health")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_health_check_body(client: AsyncClient) -> None:
    """GET /api/health returns the expected JSON payload."""
    response = await client.get("/api/health")
    body = response.json()
    assert body["status"] == "healthy"
    assert body["service"] == "AML Sentinel API"
