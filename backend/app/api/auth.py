from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.authorization import get_current_user
from app.core.security import hash_password, verify_password, needs_rehash
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserLogin, UserOut, ChangePassword
from app.services.audit_service import record_event

router = APIRouter(prefix="/auth", tags=["auth"])


def _ip(request: Request) -> str | None:
    ff = request.headers.get("X-Forwarded-For")
    return ff.split(",")[0].strip() if ff else request.client.host if request.client else None


@router.post("/register", response_model=UserOut, status_code=201)
async def register(body: UserCreate, request: Request, db: AsyncSession = Depends(get_db)):
    # Check uniqueness
    existing = await db.execute(
        select(User).where((User.email == body.email) | (User.username == body.username))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email or username already registered.")

    # First ever user becomes admin
    count_res = await db.execute(select(User))
    is_first = count_res.first() is None

    user = User(
        email=body.email,
        username=body.username,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
        role=UserRole.admin if is_first else UserRole.user,
    )
    db.add(user)
    await db.flush()
    await record_event(db, action="user.register", outcome="success",
                       actor_id=str(user.id), actor_email=user.email,
                       resource_type="user", resource_id=str(user.id),
                       ip_address=_ip(request))
    await db.commit()
    return user


@router.post("/login", response_model=UserOut)
async def login(body: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        # Record denied attempt even on unknown user
        await record_event(db, action="auth.login", outcome="denied",
                           actor_email=body.email, ip_address=_ip(request),
                           metadata={"reason": "bad_credentials"})
        await db.commit()
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    if not user.is_active:
        await record_event(db, action="auth.login", outcome="denied",
                           actor_id=str(user.id), actor_email=user.email,
                           ip_address=_ip(request), metadata={"reason": "inactive"})
        await db.commit()
        raise HTTPException(status_code=403, detail="Account is disabled.")

    if needs_rehash(user.hashed_password):
        user.hashed_password = hash_password(body.password)
        await db.flush()

    request.session["user_id"] = str(user.id)
    await record_event(db, action="auth.login", outcome="success",
                       actor_id=str(user.id), actor_email=user.email,
                       ip_address=_ip(request))
    await db.commit()
    return user


@router.post("/logout")
async def logout(request: Request, db: AsyncSession = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    await record_event(db, action="auth.logout", outcome="success",
                       actor_id=str(current_user.id), actor_email=current_user.email,
                       ip_address=_ip(request))
    await db.commit()
    request.session.clear()
    return {"message": "Logged out."}


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/change-password")
async def change_password(
    body: ChangePassword, request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        await record_event(db, action="auth.change_password", outcome="denied",
                           actor_id=str(current_user.id), actor_email=current_user.email,
                           ip_address=_ip(request))
        await db.commit()
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    current_user.hashed_password = hash_password(body.new_password)
    await db.flush()
    await record_event(db, action="auth.change_password", outcome="success",
                       actor_id=str(current_user.id), actor_email=current_user.email,
                       ip_address=_ip(request))
    await db.commit()
    return {"message": "Password changed."}
