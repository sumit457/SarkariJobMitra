import uuid
from sqlalchemy import String, Boolean, Integer, DateTime, func
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
    crawl_frequency_minutes: Mapped[int] = mapped_column(Integer, default=720)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    last_crawled_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
