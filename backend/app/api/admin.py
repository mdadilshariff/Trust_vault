from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.authorization import get_current_user, require_admin
from app.database import get_db
from app.models.audit import AuditEvent
from app.models.document import Document
from app.models.user import User, UserRole
from app.schemas.user import UserOut, UserUpdate
from app.services.audit_service import record_event, verify_chain

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    user_count = (await db.execute(select(func.count(User.id)))).scalar_one()
    doc_count = (await db.execute(select(func.count(Document.id)))).scalar_one()
    denied_count = (await db.execute(
        select(func.count(AuditEvent.id)).where(AuditEvent.outcome == "denied")
    )).scalar_one()
    recent_events_res = await db.execute(
        select(AuditEvent).order_by(AuditEvent.sequence.desc()).limit(10)
    )
    recent_events = recent_events_res.scalars().all()

    integrity = await verify_chain(db)

    return {
        "user_count": user_count,
        "document_count": doc_count,
        "denied_attempt_count": denied_count,
        "recent_events": [
            {
                "id": str(e.id),
                "sequence": e.sequence,
                "actor_email": e.actor_email,
                "action": e.action,
                "outcome": e.outcome,
                "timestamp": e.timestamp.isoformat(),
            }
            for e in recent_events
        ],
        "audit_integrity": integrity,
    }


@router.get("/users", response_model=list[UserOut])
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    q: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    base = select(User)
    if q:
        base = base.where(
            (User.email.ilike(f"%{q}%")) | (User.username.ilike(f"%{q}%"))
        )
    result = await db.execute(
        base.order_by(User.created_at.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    return result.scalars().all()


@router.get("/users/{user_id}", response_model=UserOut)
async def get_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user


@router.patch("/users/{user_id}", response_model=UserOut)
async def update_user(
    user_id: uuid.UUID, body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    changed = {}
    if body.full_name is not None:
        user.full_name = body.full_name
        changed["full_name"] = True
    if body.is_active is not None:
        user.is_active = body.is_active
        changed["is_active"] = body.is_active
    if body.role is not None:
        if body.role not in ("admin", "user"):
            raise HTTPException(status_code=422, detail="Invalid role.")
        user.role = UserRole(body.role)
        changed["role"] = body.role

    await db.flush()
    await record_event(
        db, action="admin.update_user", outcome="success",
        actor_id=str(admin.id), actor_email=admin.email,
        resource_type="user", resource_id=str(user_id),
        metadata={"changed": list(changed.keys())},
    )
    await db.commit()
    return user


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if str(user_id) == str(admin.id):
        raise HTTPException(status_code=400, detail="Cannot delete your own account.")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    await db.delete(user)
    await record_event(
        db, action="admin.delete_user", outcome="success",
        actor_id=str(admin.id), actor_email=admin.email,
        resource_type="user", resource_id=str(user_id),
        metadata={"deleted_email": user.email},
    )
    await db.commit()
