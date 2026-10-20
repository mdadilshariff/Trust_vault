from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.user import utcnow


class AuditEvent(Base):
    """
    Append-only SHA-256 hash-chained audit log.

    SECURITY NOTE: A hash chain prevents undetected single-row tampering, but
    an attacker with full database write access can rebuild the entire chain.
    Independently protected checkpoints (e.g. external timestamping or write-once
    storage) would be needed to defeat a full-chain rewrite; those are documented
    in THREATS.md as a residual risk.
    """
    __tablename__ = "audit_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sequence: Mapped[int] = mapped_column(nullable=False)          # monotonic, per-insert
    actor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    actor_email: Mapped[str | None] = mapped_column(String(255), nullable=True)  # snapshot
    action: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    resource_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    resource_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    outcome: Mapped[str] = mapped_column(String(16), nullable=False)   # success | denied | error
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # safe JSON, no secrets
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    prev_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)   # hex SHA-256 of previous row
    event_hash: Mapped[str] = mapped_column(String(64), nullable=False)        # hex SHA-256 of this row (excl. this col)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    actor: Mapped["User"] = relationship("User", back_populates="audit_events")

    __table_args__ = (
        Index("ix_audit_sequence", "sequence"),
        Index("ix_audit_timestamp", "timestamp"),
        Index("ix_audit_actor", "actor_id"),
    )
