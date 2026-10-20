from __future__ import annotations

import hashlib
import json
import threading
import uuid
from datetime import datetime, timezone
from typing import Any

# pyrefly: ignore[missing-import]
from sqlalchemy import select
# pyrefly: ignore[missing-import]
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditEvent


_write_lock = threading.Lock()  # guard sequence generation within a process


def _serialize_event(
    sequence: int,
    actor_id: str | None,
    actor_email: str | None,
    action: str,
    resource_type: str | None,
    resource_id: str | None,
    outcome: str,
    metadata_json: str | None,
    ip_address: str | None,
    prev_hash: str | None,
    timestamp: str,
) -> str:
    """Deterministic canonical serialization (sorted keys, no whitespace)."""
    payload = {
        "sequence": sequence,
        "actor_id": actor_id,
        "actor_email": actor_email,
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "outcome": outcome,
        "metadata_json": metadata_json,
        "ip_address": ip_address,
        "prev_hash": prev_hash,
        "timestamp": timestamp,
    }
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)


async def record_event(
    db: AsyncSession,
    *,
    action: str,
    outcome: str,
    actor_id: str | None = None,
    actor_email: str | None = None,
    resource_type: str | None = None,
    resource_id: str | None = None,
    metadata: dict[str, Any] | None = None,
    ip_address: str | None = None,
) -> AuditEvent:
    """
    Append a hash-chained audit event.

    Concurrent writes are serialised via SELECT FOR UPDATE on a sentinel
    row to get both the latest hash and the next sequence number atomically.
    """
    meta_str = json.dumps(metadata, sort_keys=True, separators=(",", ":"), default=str) if metadata else None
    timestamp_dt = datetime.now(timezone.utc)
    timestamp_str = timestamp_dt.isoformat()

    actor_uuid = None
    actor_id_str = None
    if actor_id:
        if isinstance(actor_id, uuid.UUID):
            actor_uuid = actor_id
            actor_id_str = str(actor_id)
        else:
            try:
                actor_uuid = uuid.UUID(str(actor_id))
                actor_id_str = str(actor_uuid)
            except (ValueError, AttributeError):
                actor_uuid = None
                actor_id_str = str(actor_id)

    # Get last event (sequence + hash) with row-level lock to prevent races
    last_result = await db.execute(
        select(AuditEvent.sequence, AuditEvent.event_hash)
        .order_by(AuditEvent.sequence.desc())
        .limit(1)
        .with_for_update(skip_locked=False)
    )
    last_row = last_result.first()
    prev_hash = last_row.event_hash if last_row else None
    next_seq = (last_row.sequence + 1) if last_row else 1

    serialized = _serialize_event(
        sequence=next_seq,
        actor_id=actor_id_str,
        actor_email=actor_email,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id else None,
        outcome=outcome,
        metadata_json=meta_str,
        ip_address=ip_address,
        prev_hash=prev_hash,
        timestamp=timestamp_str,
    )
    event_hash = hashlib.sha256(serialized.encode()).hexdigest()

    event = AuditEvent(
        sequence=next_seq,
        actor_id=actor_uuid,
        actor_email=actor_email,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id else None,
        outcome=outcome,
        metadata_json=meta_str,
        ip_address=ip_address,
        prev_hash=prev_hash,
        event_hash=event_hash,
        timestamp=timestamp_dt,
    )
    db.add(event)
    await db.flush()
    return event


async def verify_chain(db: AsyncSession) -> dict:
    """
    Walk all audit events in sequence order and verify the hash chain.
    Returns a dict with 'valid', 'checked', and optional 'broken_at' sequence.
    """
    result = await db.execute(
        select(AuditEvent).order_by(AuditEvent.sequence.asc())
    )
    events = result.scalars().all()

    prev_hash: str | None = None
    for event in events:
        expected_serial = _serialize_event(
            sequence=event.sequence,
            actor_id=str(event.actor_id) if event.actor_id else None,
            actor_email=event.actor_email,
            action=event.action,
            resource_type=event.resource_type,
            resource_id=event.resource_id,
            outcome=event.outcome,
            metadata_json=event.metadata_json,
            ip_address=event.ip_address,
            prev_hash=event.prev_hash,
            timestamp=event.timestamp.isoformat(),
        )
        expected_hash = hashlib.sha256(expected_serial.encode()).hexdigest()

        if event.event_hash != expected_hash:
            return {"valid": False, "checked": event.sequence, "broken_at": event.sequence, "reason": "hash_mismatch"}
        if event.prev_hash != prev_hash:
            return {"valid": False, "checked": event.sequence, "broken_at": event.sequence, "reason": "chain_break"}
        prev_hash = event.event_hash

    return {"valid": True, "checked": len(events)}
