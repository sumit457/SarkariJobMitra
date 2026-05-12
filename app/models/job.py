import uuid
from datetime import date, datetime
from sqlalchemy import String, DateTime, Date, Integer, Boolean, Float, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("sources.id"), nullable=True)

    external_id: Mapped[str] = mapped_column(String(120), nullable=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    slug: Mapped[str] = mapped_column(String(600), nullable=False, index=True)

    organization: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    advertisement_number: Mapped[str | None] = mapped_column(String(200), nullable=True, index=True)
    post_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    total_vacancies: Mapped[int | None] = mapped_column(Integer, nullable=True)
    state: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    category: Mapped[str | None] = mapped_column(String(80), nullable=True)
    qualification_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    location_text: Mapped[str | None] = mapped_column(String(200), nullable=True)

    notice_url: Mapped[str] = mapped_column(String(800), nullable=False)
    apply_url: Mapped[str | None] = mapped_column(String(800), nullable=True)
    official_notification_url: Mapped[str | None] = mapped_column(String(800), nullable=True)
    official_pdf_url: Mapped[str | None] = mapped_column(String(800), nullable=True)
    notification_pdf_url: Mapped[str | None] = mapped_column(String(800), nullable=True)

    short_summary: Mapped[str | None] = mapped_column(String(1200), nullable=True)
    eligibility_text: Mapped[str | None] = mapped_column(String(4000), nullable=True)

    important_dates_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    fee_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    age_limit_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    vacancy_details_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    qualification_details_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    important_links_json: Mapped[dict] = mapped_column(JSONB, default=dict)

    opening_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    closing_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    application_start_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    application_end_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    vacancy_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pay_level: Mapped[str | None] = mapped_column(String(100), nullable=True)
    age_limit: Mapped[str | None] = mapped_column(String(255), nullable=True)
    qualification: Mapped[str | None] = mapped_column(Text, nullable=True)
    exam_centers: Mapped[str | None] = mapped_column(Text, nullable=True)
    application_fee: Mapped[str | None] = mapped_column(String(255), nullable=True)
    official_apply_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    official_notification_pdf_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    short_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    detailed_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)

    status: Mapped[str] = mapped_column(String(30), default="draft", index=True)  # draft/needs_review/published/updated/expired/archived/rejected/duplicate/suspicious
    notice_type: Mapped[str] = mapped_column(String(50), default="new_job")
    verification_status: Mapped[str] = mapped_column(String(50), default="unverified")
    raw_item_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("raw_items.id"), nullable=True)
    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False)
    duplicate_of_job_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=True)
    published_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    priority: Mapped[int] = mapped_column(Integer, default=50)
    latest_update_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    latest_update_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    admin_locked: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
