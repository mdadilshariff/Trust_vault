from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.authorization import get_current_user, require_admin
from app.database import get_db
from app.models.audit import AuditEvent
from app.models.user import User
from app.schemas.audit import AuditEventOut, AuditListOut, IntegrityResult
from app.services.audit_service import verify_chain

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=AuditListOut)
async def list_audit_events(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    action: Optional[str] = Query(None),
    outcome: Optional[str] = Query(None),
    actor_email: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    base = select(AuditEvent)
    if action:
        base = base.where(AuditEvent.action.ilike(f"%{action}%"))
    if outcome:
        base = base.where(AuditEvent.outcome == outcome)
    if actor_email:
        base = base.where(AuditEvent.actor_email.ilike(f"%{actor_email}%"))

    count_q = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_q)).scalar_one()

    result = await db.execute(
        base.order_by(AuditEvent.sequence.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    events = result.scalars().all()
    return AuditListOut(
        items=[AuditEventOut.model_validate(e) for e in events],
        total=total, page=page, page_size=page_size,
    )


@router.get("/my", response_model=AuditListOut)
async def my_audit_events(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Non-admin users can see their own audit trail."""
    base = select(AuditEvent).where(AuditEvent.actor_id == current_user.id)
    count_q = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_q)).scalar_one()
    result = await db.execute(
        base.order_by(AuditEvent.sequence.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    events = result.scalars().all()
    return AuditListOut(
        items=[AuditEventOut.model_validate(e) for e in events],
        total=total, page=page, page_size=page_size,
    )


@router.get("/integrity", response_model=IntegrityResult)
async def check_integrity(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """
    Walk the entire hash chain and verify every record.
    NOTE: A full-chain rewrite by a DB-level attacker would defeat this check.
    See THREATS.md for full risk documentation.
    """
    return await verify_chain(db)
