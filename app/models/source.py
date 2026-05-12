import uuid
from sqlalchemy import String, Boolean, Integer, DateTime, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class Source(Base):
    __tablename__ = "sources"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # html_list/rss/js_rendered
    base_url: Mapped[str] = mapped_column(String(500), nullable=False)
    list_url: Mapped[str] = mapped_column(String(500), nullable=False)

    org: Mapped[str] = mapped_column(String(80), nullable=True)
    state: Mapped[str] = mapped_column(String(80), nullable=True)

    parser_key: Mapped[str] = mapped_column(String(100), nullable=False)
    source_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    official_homepage_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notification_page_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    apply_page_pattern: Mapped[str | None] = mapped_column(String(500), nullable=True)
    pdf_url_pattern: Mapped[str | None] = mapped_column(String(500), nullable=True)
    crawl_frequency_minutes: Mapped[int] = mapped_column(Integer, default=1440)
    priority: Mapped[int] = mapped_column(Integer, default=50)
    trust_level: Mapped[int] = mapped_column(Integer, default=80)
    parser_type: Mapped[str] = mapped_column(String(50), default="generic")
    coverage_group: Mapped[str | None] = mapped_column(String(120), nullable=True)
    last_checked_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_success_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_new_job_found_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    consecutive_failures: Mapped[int] = mapped_column(Integer, default=0)
    last_failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    health_score: Mapped[int] = mapped_column(Integer, default=100)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    last_crawled_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
