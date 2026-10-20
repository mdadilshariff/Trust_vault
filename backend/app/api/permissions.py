from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.authorization import get_current_user, require_document_owner
from app.database import get_db
from app.models.document import Document, DocumentPermission, PermissionLevel
from app.models.user import User
from app.schemas.document import PermissionCreate, PermissionOut, PermissionUpdate
from app.services.audit_service import record_event

router = APIRouter(prefix="/documents/{document_id}/permissions", tags=["permissions"])


def _ip(r: Request) -> str | None:
    ff = r.headers.get("X-Forwarded-For")
    return ff.split(",")[0].strip() if ff else (r.client.host if r.client else None)


def _perm_out(p: DocumentPermission) -> PermissionOut:
    return PermissionOut(
        id=p.id, document_id=p.document_id, user_id=p.user_id,
        username=p.user.username if p.user else "",
        email=p.user.email if p.user else "",
        permission=p.permission.value,
        granted_by_id=p.granted_by_id,
        created_at=p.created_at, updated_at=p.updated_at,
    )


@router.get("", response_model=list[PermissionOut])
async def list_permissions(
    document_id: uuid.UUID, request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Only document owner can see the full permission list
    await require_document_owner(document_id, current_user, db)
    result = await db.execute(
        select(DocumentPermission)
        .options(selectinload(DocumentPermission.user))
        .where(DocumentPermission.document_id == document_id)
    )
    return [_perm_out(p) for p in result.scalars().all()]


@router.post("", response_model=PermissionOut, status_code=201)
async def grant_permission(
    document_id: uuid.UUID, body: PermissionCreate, request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_document_owner(document_id, current_user, db)

    target_res = await db.execute(select(User).where(User.username == body.username))
    target = target_res.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot share with yourself.")

    # Upsert: update if exists, create if not
    existing_res = await db.execute(
        select(DocumentPermission).where(
            DocumentPermission.document_id == document_id,
            DocumentPermission.user_id == target.id,
        )
    )
    perm = existing_res.scalar_one_or_none()
    if perm:
        perm.permission = PermissionLevel(body.permission)
        perm.granted_by_id = current_user.id
    else:
        perm = DocumentPermission(
            document_id=document_id,
            user_id=target.id,
            permission=PermissionLevel(body.permission),
            granted_by_id=current_user.id,
        )
        db.add(perm)
    await db.flush()
    await record_event(
        db, action="permission.grant", outcome="success",
        actor_id=str(current_user.id), actor_email=current_user.email,
        resource_type="document", resource_id=str(document_id),
        ip_address=_ip(request),
        metadata={"target_user": body.username, "permission": body.permission},
    )
    await db.commit()
    result = await db.execute(
        select(DocumentPermission).options(selectinload(DocumentPermission.user))
        .where(DocumentPermission.id == perm.id)
    )
    perm = result.scalar_one()
    return _perm_out(perm)


@router.patch("/{permission_id}", response_model=PermissionOut)
async def update_permission(
    document_id: uuid.UUID, permission_id: uuid.UUID,
    body: PermissionUpdate, request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_document_owner(document_id, current_user, db)
    perm_res = await db.execute(
        select(DocumentPermission).options(selectinload(DocumentPermission.user))
        .where(DocumentPermission.id == permission_id, DocumentPermission.document_id == document_id)
    )
    perm = perm_res.scalar_one_or_none()
    if not perm:
        raise HTTPException(status_code=404, detail="Permission not found.")

    old_perm = perm.permission.value
    perm.permission = PermissionLevel(body.permission)
    await db.flush()
    await record_event(
        db, action="permission.update", outcome="success",
        actor_id=str(current_user.id), actor_email=current_user.email,
        resource_type="document", resource_id=str(document_id),
        ip_address=_ip(request),
        metadata={"target_user": perm.user.username, "old": old_perm, "new": body.permission},
    )
    await db.commit()
    return _perm_out(perm)


@router.delete("/{permission_id}", status_code=204)
async def revoke_permission(
    document_id: uuid.UUID, permission_id: uuid.UUID, request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_document_owner(document_id, current_user, db)
    perm_res = await db.execute(
        select(DocumentPermission).options(selectinload(DocumentPermission.user))
        .where(DocumentPermission.id == permission_id, DocumentPermission.document_id == document_id)
    )
    perm = perm_res.scalar_one_or_none()
    if not perm:
        raise HTTPException(status_code=404, detail="Permission not found.")

    target_username = perm.user.username if perm.user else str(perm.user_id)
    await db.delete(perm)
    await record_event(
        db, action="permission.revoke", outcome="success",
        actor_id=str(current_user.id), actor_email=current_user.email,
        resource_type="document", resource_id=str(document_id),
        ip_address=_ip(request),
        metadata={
            "target_user": target_username,
            "note": "Revocation blocks future server requests. Copies already downloaded remain accessible to the recipient."
        },
    )
    await db.commit()
