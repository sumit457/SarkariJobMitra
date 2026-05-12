import uuid
from sqlalchemy import String, DateTime, ForeignKey, func, UniqueConstraint, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
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
    raw_title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    raw_url: Mapped[str | None] = mapped_column(String(800), nullable=True)
    published_date_raw: Mapped[str] = mapped_column(String(80), nullable=True)
    raw_html: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    detected_pdf_urls: Mapped[dict] = mapped_column(JSONB, default=dict)
    detected_apply_urls: Mapped[dict] = mapped_column(JSONB, default=dict)
    detected_dates: Mapped[dict] = mapped_column(JSONB, default=dict)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    url_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    first_seen_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_seen_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    crawl_batch_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="new")  # new/seen/ignored
    raw_status: Mapped[str] = mapped_column(String(30), default="new")  # new/classified/extraction_pending/extracted/normalized/processed/failed/ignored
    notice_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_probable_job: Mapped[bool] = mapped_column(Boolean, default=False)
    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False)
    duplicate_of_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("raw_items.id"), nullable=True)
    extraction_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
