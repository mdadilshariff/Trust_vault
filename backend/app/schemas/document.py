from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class DocumentUploadMeta(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    category: Optional[str] = Field(None, max_length=64)


class DocumentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    category: Optional[str] = Field(None, max_length=64)


class DocumentOut(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    title: str
    description: Optional[str]
    category: Optional[str]
    original_filename: str
    file_size: int
    mime_type: str
    file_extension: str
    created_at: datetime
    updated_at: datetime
    owner_username: Optional[str] = None
    my_permission: Optional[str] = None   # "owner" | "edit" | "read"

    model_config = {"from_attributes": True}


class DocumentListOut(BaseModel):
    items: list[DocumentOut]
    total: int
    page: int
    page_size: int


class PermissionOut(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    user_id: uuid.UUID
    username: str
    email: str
    permission: str
    granted_by_id: Optional[uuid.UUID]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PermissionCreate(BaseModel):
    username: str = Field(..., min_length=1, max_length=64)
    permission: str = Field(..., pattern=r"^(read|edit)$")


class PermissionUpdate(BaseModel):
    permission: str = Field(..., pattern=r"^(read|edit)$")
