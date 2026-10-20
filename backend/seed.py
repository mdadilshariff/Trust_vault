"""
Development seed script — creates demo accounts.
NEVER run in production with real credentials.

Usage:
    cd backend
    python seed.py
"""
from __future__ import annotations

import asyncio
import os
import sys

# Load .env
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings
from app.core.security import hash_password
from app.models.user import User, UserRole

settings = get_settings()

DEMO_USERS = [
    {"email": "admin@trustvault.dev", "username": "admin", "full_name": "Admin User",
     "password": "Admin1234!", "role": UserRole.admin},
    {"email": "alice@trustvault.dev", "username": "alice", "full_name": "Alice Owner",
     "password": "Alice1234!", "role": UserRole.user},
    {"email": "bob@trustvault.dev", "username": "bob", "full_name": "Bob Viewer",
     "password": "Bob12345!", "role": UserRole.user},
]


async def seed():
    engine = create_async_engine(settings.database_url, echo=False)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with factory() as session:
        for u in DEMO_USERS:
            existing = (await session.execute(select(User).where(User.email == u["email"]))).scalar_one_or_none()
            if existing:
                print(f"  Skipping {u['email']} (already exists)")
                continue
            user = User(
                email=u["email"], username=u["username"],
                full_name=u["full_name"],
                hashed_password=hash_password(u["password"]),
                role=u["role"],
            )
            session.add(user)
            print(f"  Created {u['email']} / role={u['role'].value}")
        await session.commit()

    await engine.dispose()
    print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
