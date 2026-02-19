import uuid
from sqlalchemy import String, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class JobDedupeKey(Base):
    __tablename__ = "job_dedupe_keys"
    __table_args__ = (
        UniqueConstraint("key_type", "key_value", name="uq_key_type_value"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)

    key_type: Mapped[str] = mapped_column(String(50), nullable=False)  # notice_url/pdf_url/hash_title_date
    key_value: Mapped[str] = mapped_column(String(900), nullable=False, index=True)
