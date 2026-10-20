"""
Pytest fixtures: in-memory SQLite for fast tests,
two users (alice=owner, bob=viewer), HTTPX async client.
"""
from __future__ import annotations

import asyncio
import io
import os
import sys
import pytest
import pytest_asyncio

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("SYNC_DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing-only")
os.environ.setdefault("UPLOAD_DIR", "/tmp/trustvault_test_uploads")
os.environ.setdefault("ENVIRONMENT", "test")

from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.main import app
from app.core.security import hash_password
from app.models.user import User, UserRole

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(scope="session")
async def db_session(test_engine):
    factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        yield session


@pytest_asyncio.fixture
async def client(test_engine):
    factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async def override_db():
        async with factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="session")
async def tokens(test_engine):
    factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async def override_db():
        async with factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r1 = await ac.post("/api/auth/register", json={
            "email": "alice@test.com", "username": "alice",
            "full_name": "Alice Admin", "password": "Alice1234!",
        })
        assert r1.status_code in (201, 409)
        r2 = await ac.post("/api/auth/login", json={
            "email": "alice@test.com", "password": "Alice1234!",
        })
        assert r2.status_code == 200
        alice_c = dict(r2.cookies)

        r3 = await ac.post("/api/auth/register", json={
            "email": "bob@test.com", "username": "bob",
            "full_name": "Bob Viewer", "password": "Bob12345!",
        })
        assert r3.status_code in (201, 409)
        r4 = await ac.post("/api/auth/login", json={
            "email": "bob@test.com", "password": "Bob12345!",
        })
        assert r4.status_code == 200
        bob_c = dict(r4.cookies)
    app.dependency_overrides.clear()
    return alice_c, bob_c


@pytest_asyncio.fixture(scope="session")
async def alice_token(tokens):
    return tokens[0]


@pytest_asyncio.fixture(scope="session")
async def bob_token(tokens):
    return tokens[1]


def make_pdf_bytes() -> bytes:
    return b"%PDF-1.4 test document content"


def fake_upload(filename: str = "test.pdf", content: bytes | None = None) -> dict:
    data = content or make_pdf_bytes()
    return {"file": (filename, io.BytesIO(data), "application/pdf")}
