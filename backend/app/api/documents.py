from __future__ import annotations

import uuid
from typing import Annotated, Optional

from fastapi import (
    APIRouter, Depends, Form, HTTPException, Query,
    Request, UploadFile, File, status,
)
from fastapi.responses import FileResponse
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.authorization import (
    get_current_user, require_document_access, require_document_owner,
)
from app.core.storage import validate_and_store, get_file_path, delete_stored_file
from app.database import get_db
from app.models.document import Document, DocumentPermission, PermissionLevel
from app.models.user import User
from app.schemas.document import DocumentOut, DocumentListOut, DocumentUpdate
from app.services.audit_service import record_event

router = APIRouter(prefix="/documents", tags=["documents"])


def _ip(request: Request) -> str | None:
    ff = request.headers.get("X-Forwarded-For")
    return ff.split(",")[0].strip() if ff else (request.client.host if request.client else None)


def _doc_out(doc: Document, user: User, perm: DocumentPermission | None = None) -> DocumentOut:
    my_perm = "owner" if doc.owner_id == user.id else (perm.permission.value if perm else None)
    return DocumentOut(
        id=doc.id, owner_id=doc.owner_id, title=doc.title,
        description=doc.description, category=doc.category,
        original_filename=doc.original_filename, file_size=doc.file_size,
        mime_type=doc.mime_type, file_extension=doc.file_extension,
        created_at=doc.created_at, updated_at=doc.updated_at,
        owner_username=doc.owner.username if doc.owner else None,
        my_permission=my_perm,
    )


@router.post("/upload", response_model=DocumentOut, status_code=201)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(..., min_length=1, max_length=255),
    description: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stored_name, mime, size, ext = await validate_and_store(file)
    doc = Document(
        owner_id=current_user.id,
        title=title.strip(),
        description=description,
        category=category,
        original_filename=file.filename or "upload",
        stored_filename=stored_name,
        file_size=size,
        mime_type=mime,
        file_extension=ext,
    )
    db.add(doc)
    await db.flush()
    await record_event(
        db, action="document.upload", outcome="success",
        actor_id=str(current_user.id), actor_email=current_user.email,
        resource_type="document", resource_id=str(doc.id),
        ip_address=_ip(request),
        metadata={"title": title, "size": size, "ext": ext},
    )
    await db.commit()
    await db.refresh(doc)
    # Load owner relationship
    result = await db.execute(
        select(Document).options(selectinload(Document.owner)).where(Document.id == doc.id)
    )
    doc = result.scalar_one()
    return _doc_out(doc, current_user)


@router.get("", response_model=DocumentListOut)
async def list_my_documents(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None, max_length=200),
    category: Optional[str] = Query(None, max_length=64),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base = select(Document).options(selectinload(Document.owner)).where(Document.owner_id == current_user.id)
    if q:
        base = base.where(Document.title.ilike(f"%{q}%"))
    if category:
        base = base.where(Document.category == category)

    count_q = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_q)).scalar_one()

    result = await db.execute(
        base.order_by(Document.created_at.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    docs = result.scalars().all()
    return DocumentListOut(
        items=[_doc_out(d, current_user) for d in docs],
        total=total, page=page, page_size=page_size,
    )


@router.get("/shared-with-me", response_model=DocumentListOut)
async def list_shared_with_me(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None, max_length=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base = (
        select(Document, DocumentPermission)
        .options(selectinload(Document.owner))
        .join(DocumentPermission, DocumentPermission.document_id == Document.id)
        .where(DocumentPermission.user_id == current_user.id)
    )
    if q:
        base = base.where(Document.title.ilike(f"%{q}%"))

    count_q = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_q)).scalar_one()

    result = await db.execute(
        base.order_by(Document.created_at.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    rows = result.all()
    items = [_doc_out(doc, current_user, perm) for doc, perm in rows]
    return DocumentListOut(items=items, total=total, page=page, page_size=page_size)


@router.get("/{document_id}", response_model=DocumentOut)
async def get_document(
    document_id: uuid.UUID, request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        doc = await require_document_access(document_id, current_user, db)
    except HTTPException as exc:
        await record_event(db, action="document.view", outcome="denied",
                           actor_id=str(current_user.id), actor_email=current_user.email,
                           resource_type="document", resource_id=str(document_id),
                           ip_address=_ip(request))
        await db.commit()
        raise

    result = await db.execute(
        select(Document).options(selectinload(Document.owner)).where(Document.id == doc.id)
    )
    doc = result.scalar_one()
    perm_res = await db.execute(
        select(DocumentPermission).where(
            DocumentPermission.document_id == doc.id,
            DocumentPermission.user_id == current_user.id,
        )
    )
    perm = perm_res.scalar_one_or_none()
    return _doc_out(doc, current_user, perm)


@router.get("/{document_id}/download")
async def download_document(
    document_id: uuid.UUID, request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        doc = await require_document_access(document_id, current_user, db)
    except HTTPException as exc:
        await record_event(db, action="document.download", outcome="denied",
                           actor_id=str(current_user.id), actor_email=current_user.email,
                           resource_type="document", resource_id=str(document_id),
                           ip_address=_ip(request))
        await db.commit()
        raise

    file_path = get_file_path(doc.stored_filename)
    await record_event(
        db, action="document.download", outcome="success",
        actor_id=str(current_user.id), actor_email=current_user.email,
        resource_type="document", resource_id=str(doc.id),
        ip_address=_ip(request),
        metadata={"filename": doc.original_filename},
    )
    await db.commit()
    return FileResponse(
        path=str(file_path),
        filename=doc.original_filename,
        media_type=doc.mime_type,
    )


@router.patch("/{document_id}", response_model=DocumentOut)
async def update_document(
    document_id: uuid.UUID, body: DocumentUpdate, request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        doc = await require_document_access(document_id, current_user, db, required=PermissionLevel.edit)
    except HTTPException as exc:
        await record_event(db, action="document.edit", outcome="denied",
                           actor_id=str(current_user.id), actor_email=current_user.email,
                           resource_type="document", resource_id=str(document_id),
                           ip_address=_ip(request))
        await db.commit()
        raise

    changed = {}
    if body.title is not None:
        changed["title"] = body.title
        doc.title = body.title.strip()
    if body.description is not None:
        changed["description"] = True
        doc.description = body.description
    if body.category is not None:
        changed["category"] = body.category
        doc.category = body.category

    await db.flush()
    await record_event(
        db, action="document.edit", outcome="success",
        actor_id=str(current_user.id), actor_email=current_user.email,
        resource_type="document", resource_id=str(doc.id),
        ip_address=_ip(request), metadata={"changed_fields": list(changed.keys())},
    )
    await db.commit()
    result = await db.execute(
        select(Document).options(selectinload(Document.owner)).where(Document.id == doc.id)
    )
    doc = result.scalar_one()
    perm_res = await db.execute(
        select(DocumentPermission).where(
            DocumentPermission.document_id == doc.id,
            DocumentPermission.user_id == current_user.id,
        )
    )
    perm = perm_res.scalar_one_or_none()
    return _doc_out(doc, current_user, perm)


@router.delete("/{document_id}", status_code=204)
async def delete_document(
    document_id: uuid.UUID, request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        doc = await require_document_owner(document_id, current_user, db)
    except HTTPException as exc:
        await record_event(db, action="document.delete", outcome="denied",
                           actor_id=str(current_user.id), actor_email=current_user.email,
                           resource_type="document", resource_id=str(document_id),
                           ip_address=_ip(request))
        await db.commit()
        raise

    stored = doc.stored_filename
    await db.delete(doc)
    await record_event(
        db, action="document.delete", outcome="success",
        actor_id=str(current_user.id), actor_email=current_user.email,
        resource_type="document", resource_id=str(document_id),
        ip_address=_ip(request), metadata={"title": doc.title},
    )
    await db.commit()
    delete_stored_file(stored)
