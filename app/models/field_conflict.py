import uuid
from sqlalchemy import String, DateTime, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class FieldConflict(Base):
    __tablename__ = "field_conflicts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    field_name: Mapped[str] = mapped_column(String(120), nullable=False)
    value_a: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_a: Mapped[str | None] = mapped_column(String(200), nullable=True)
    value_b: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_b: Mapped[str | None] = mapped_column(String(200), nullable=True)
    resolution_status: Mapped[str] = mapped_column(String(50), default="unresolved")
    resolved_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_by: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
