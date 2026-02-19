from __future__ import annotations

from datetime import date, datetime
from typing import Any
from pydantic import BaseModel, ConfigDict


class JobListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    slug: str
    organization: str | None = None
    state: str | None = None
    status: str
    is_active: bool
    notice_url: str
    apply_url: str | None = None
    notification_pdf_url: str | None = None
    official_apply_url: str | None = None
    official_notification_pdf_url: str | None = None
    opening_date: date | None = None
    closing_date: date | None = None
    vacancy_count: int | None = None
    salary: str | None = None
    created_at: datetime
    published_at: datetime | None = None


class JobsListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[JobListItem]


class JobDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    source_id: str
    external_id: str | None = None
    title: str
    slug: str

    organization: str | None = None
    category: str | None = None
    state: str | None = None
    location_text: str | None = None

    notice_url: str
    apply_url: str | None = None
    notification_pdf_url: str | None = None
    official_apply_url: str | None = None
    official_notification_pdf_url: str | None = None

    short_summary: str | None = None
    eligibility_text: str | None = None
    short_description: str | None = None
    detailed_description: str | None = None

    opening_date: date | None = None
    closing_date: date | None = None
    vacancy_count: int | None = None
    salary: str | None = None
    pay_level: str | None = None
    age_limit: str | None = None
    qualification: str | None = None
    exam_centers: str | None = None
    application_fee: str | None = None

    important_dates_json: dict[str, Any] | None = None
    fee_json: dict[str, Any] | None = None

    status: str
    is_active: bool
    is_verified: bool
    confidence_score: float

    published_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
