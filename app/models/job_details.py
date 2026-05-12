import uuid
from sqlalchemy import String, DateTime, Text, Integer, Boolean, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class JobDetails(Base):
    __tablename__ = "job_details"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False, unique=True)
    full_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    important_dates_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    application_fee_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    age_limit_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    vacancy_details_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    qualification_details_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    selection_process: Mapped[str | None] = mapped_column(Text, nullable=True)
    salary: Mapped[str | None] = mapped_column(Text, nullable=True)
    how_to_apply: Mapped[str | None] = mapped_column(Text, nullable=True)
    important_links_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    raw_pdf_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    pdf_text_quality_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ocr_used: Mapped[bool] = mapped_column(Boolean, default=False)
    number_of_pages: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tables_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    language_detected: Mapped[str | None] = mapped_column(String(80), nullable=True)
    extraction_method: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
