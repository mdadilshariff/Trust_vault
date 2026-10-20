from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AuditEventOut(BaseModel):
    id: uuid.UUID
    sequence: int
    actor_id: Optional[uuid.UUID]
    actor_email: Optional[str]
    action: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    outcome: str
    metadata_json: Optional[str]
    ip_address: Optional[str]
    prev_hash: Optional[str]
    event_hash: str
    timestamp: datetime

    model_config = {"from_attributes": True}


class AuditListOut(BaseModel):
    items: list[AuditEventOut]
    total: int
    page: int
    page_size: int


class IntegrityResult(BaseModel):
    valid: bool
    checked: int
    broken_at: Optional[int] = None
    reason: Optional[str] = None
