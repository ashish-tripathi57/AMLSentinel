import pytest
from httpx import ASGITransport, AsyncClient

from api.main import create_app


@pytest.fixture()
async def auth_client():
    """Provide an httpx AsyncClient wired to the FastAPI app for auth tests."""
    application = create_app()
    async with AsyncClient(
        transport=ASGITransport(app=application),
        base_url="http://test",
    ) as test_client:
        yield test_client


@pytest.fixture()
async def authenticated_client(auth_client: AsyncClient):
    """Return a client with a valid auth token from a successful login."""
    response = await auth_client.post(
        "/api/auth/login",
        json={"username": "sarah.chen", "password": "analyst123"},
    )
    token = response.json()["token"]
    auth_client.headers["Authorization"] = f"Bearer {token}"
    return auth_client


async def test_login_success(auth_client: AsyncClient):
    """Valid credentials return a token and analyst info."""
    response = await auth_client.post(
        "/api/auth/login",
        json={"username": "sarah.chen", "password": "analyst123"},
    )

    assert response.status_code == 200
    body = response.json()
    assert "token" in body
    assert len(body["token"]) > 0
    assert body["analyst"]["username"] == "sarah.chen"
    assert body["analyst"]["full_name"] == "Sarah Chen"
    assert body["analyst"]["role"] == "Senior Analyst"


async def test_login_invalid_credentials(auth_client: AsyncClient):
    """Wrong password returns 401 Unauthorized."""
    response = await auth_client.post(
        "/api/auth/login",
        json={"username": "sarah.chen", "password": "wrong_password"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid username or password"


async def test_login_unknown_user(auth_client: AsyncClient):
    """Unknown username returns 401 Unauthorized."""
    response = await auth_client.post(
        "/api/auth/login",
        json={"username": "unknown.user", "password": "analyst123"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid username or password"


async def test_me_authenticated(authenticated_client: AsyncClient):
    """With a valid token, GET /api/auth/me returns the analyst info."""
    response = await authenticated_client.get("/api/auth/me")

    assert response.status_code == 200
    body = response.json()
    assert body["username"] == "sarah.chen"
    assert body["full_name"] == "Sarah Chen"
    assert body["role"] == "Senior Analyst"


async def test_me_unauthenticated(auth_client: AsyncClient):
    """Without a token, GET /api/auth/me returns 401."""
    response = await auth_client.get("/api/auth/me")

    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication required"


async def test_me_invalid_token(auth_client: AsyncClient):
    """With an invalid token, GET /api/auth/me returns 401."""
    auth_client.headers["Authorization"] = "Bearer invalid_token_value"
    response = await auth_client.get("/api/auth/me")

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or expired token"


async def test_logout(authenticated_client: AsyncClient):
    """After logout, the token is invalidated and /me returns 401."""
    response = await authenticated_client.post("/api/auth/logout")
    assert response.status_code == 200
    assert response.json()["message"] == "Logged out successfully"

    response = await authenticated_client.get("/api/auth/me")
    assert response.status_code == 401
