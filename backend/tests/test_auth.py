"""Auth endpoint tests."""
import pytest


@pytest.mark.asyncio
async def test_register_and_login(client):
    r = await client.post("/api/auth/register", json={
        "email": "carol@test.com", "username": "carol",
        "full_name": "Carol T", "password": "Carol1234!",
    })
    assert r.status_code in (201, 409)

    r2 = await client.post("/api/auth/login", json={
        "email": "carol@test.com", "password": "Carol1234!",
    })
    assert r2.status_code == 200
    assert r2.json()["email"] == "carol@test.com"


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    r = await client.post("/api/auth/login", json={
        "email": "carol@test.com", "password": "wrongpassword",
    })
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_me_unauthenticated(client):
    r = await client.get("/api/auth/me")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_me_authenticated(client, alice_token):
    r = await client.get("/api/auth/me", cookies=alice_token)
    assert r.status_code == 200
    assert r.json()["username"] == "alice"


@pytest.mark.asyncio
async def test_duplicate_register(client):
    r = await client.post("/api/auth/register", json={
        "email": "alice@test.com", "username": "alice",
        "full_name": "Alice Dup", "password": "Alice1234!",
    })
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_logout(client, alice_token):
    r = await client.post("/api/auth/logout", cookies=alice_token)
    assert r.status_code == 200
