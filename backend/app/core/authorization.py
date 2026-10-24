from __future__ import annotations

import uuid
from typing import Annotated

# pyrefly: ignore[missing-import]
from fastapi import Depends, HTTPException, Request, status
# pyrefly: ignore[missing-import]
from sqlalchemy import select
# pyrefly: ignore[missing-import]
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.document import Document, DocumentPermission, PermissionLevel
from app.models.user import User, UserRole


from app.core.security import verify_session_token


# ── Session helpers ────────────────────────────────────────────────────────────

def _get_session_user_id(request: Request) -> str | None:
    # 1. Cookie session
    user_id = request.session.get("user_id")
    if user_id:
        return user_id

    # 2. Authorization header: Bearer <token>
    auth = request.headers.get("Authorization")
    if auth and auth.startswith("Bearer "):
        token = auth[7:].strip()
        uid = verify_session_token(token)
        if uid:
            return uid

    # 3. Custom token header: X-Session-Token
    token_hdr = request.headers.get("X-Session-Token")
    if token_hdr:
        uid = verify_session_token(token_hdr)
        if uid:
            return uid

    # 4. Query parameter token: ?token=... (for direct file downloads)
    query_token = request.query_params.get("token")
    if query_token:
        uid = verify_session_token(query_token)
        if uid:
            return uid

    return None


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    user_id = _get_session_user_id(request)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")
    try:
        user_uuid = uuid.UUID(str(user_id)) if not isinstance(user_id, uuid.UUID) else user_id
    except (ValueError, AttributeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session.")
    result = await db.execute(select(User).where(User.id == user_uuid, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive.")
    return user


async def get_current_active_user(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    return user


async def require_admin(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    if user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator access required.")
    return user


# ── Document-level authorization ───────────────────────────────────────────────

async def get_document_or_404(
    document_id: uuid.UUID | str,
    db: AsyncSession,
) -> Document:
    if isinstance(document_id, str):
        try:
            document_id = uuid.UUID(document_id)
        except (ValueError, AttributeError):
            raise HTTPException(status_code=404, detail="Document not found.")
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc


async def require_document_access(
    document_id: uuid.UUID | str,
    user: User,
    db: AsyncSession,
    required: PermissionLevel = PermissionLevel.read,
) -> Document:
    """
    CENTRALIZED authorization check. Called on every document route.
    Never relies on client-submitted owner/role data.
    """
    doc = await get_document_or_404(document_id, db)

    # Owner always has full access
    if doc.owner_id == user.id:
        return doc

    # Admins do NOT automatically get document access (per spec)
    # They must be explicitly granted permissions like anyone else.

    # Check explicit permission
    perm_result = await db.execute(
        select(DocumentPermission).where(
            DocumentPermission.document_id == doc.id,
            DocumentPermission.user_id == user.id,
        )
    )
    perm = perm_result.scalar_one_or_none()

    if not perm:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if required == PermissionLevel.edit and perm.permission != PermissionLevel.edit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Edit permission required.",
        )
    return doc


async def require_document_owner(
    document_id: uuid.UUID | str,
    user: User,
    db: AsyncSession,
) -> Document:
    """Only the document owner can manage sharing/deletion."""
    doc = await get_document_or_404(document_id, db)
    if doc.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner access required.")
    return doc
