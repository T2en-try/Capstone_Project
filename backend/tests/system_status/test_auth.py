"""Authentication tests for the system-status/authentication group."""

import pytest


@pytest.mark.integration
@pytest.mark.asyncio
async def test_admin_login_returns_token_for_valid_credentials(client, create_admin):
    admin = await create_admin()

    response = await client.post(
        "/api/auth/login",
        json={"email": admin["email"], "password": admin["password"]},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["admin"]["email"] == admin["email"]
    assert body["admin"]["role"] == "admin"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_admin_login_rejects_wrong_password(client, create_admin):
    admin = await create_admin()

    response = await client.post(
        "/api/auth/login",
        json={"email": admin["email"], "password": "wrong-password"},
    )

    assert response.status_code == 401


@pytest.mark.integration
@pytest.mark.asyncio
async def test_admin_login_rejects_inactive_account(client, create_admin):
    admin = await create_admin(is_active=False)

    response = await client.post(
        "/api/auth/login",
        json={"email": admin["email"], "password": admin["password"]},
    )

    assert response.status_code == 401


@pytest.mark.integration
@pytest.mark.asyncio
async def test_auth_me_returns_admin_for_valid_bearer_token(client, create_admin):
    admin = await create_admin()
    login_response = await client.post(
        "/api/auth/login",
        json={"email": admin["email"], "password": admin["password"]},
    )
    token = login_response.json()["access_token"]

    response = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert body["admin"]["email"] == admin["email"]


@pytest.mark.integration
@pytest.mark.asyncio
async def test_auth_me_rejects_missing_token(client):
    response = await client.get("/api/auth/me")

    assert response.status_code == 401


@pytest.mark.integration
@pytest.mark.asyncio
async def test_auth_me_rejects_invalid_token(client):
    response = await client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid-token"},
    )

    assert response.status_code == 401
