import uuid
from sqlalchemy import String, DateTime, ForeignKey, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class RawItem(Base):
    __tablename__ = "raw_items"
    __table_args__ = (
        UniqueConstraint("source_id", "content_hash", name="uq_rawitem_source_hash"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sources.id"), nullable=False)

    found_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    title_raw: Mapped[str] = mapped_column(String(500), nullable=False)
    url_raw: Mapped[str] = mapped_column(String(800), nullable=False)
    published_date_raw: Mapped[str] = mapped_column(String(80), nullable=True)

    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="new")  # new/seen/ignored

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
