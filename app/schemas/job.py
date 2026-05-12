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
    post_name: str | None = None
    status: str
    is_active: bool
    notice_type: str | None = None
    verification_status: str | None = None
    notice_url: str
    apply_url: str | None = None
    official_notification_url: str | None = None
    official_pdf_url: str | None = None
    notification_pdf_url: str | None = None
    official_apply_url: str | None = None
    official_notification_pdf_url: str | None = None
    opening_date: date | None = None
    closing_date: date | None = None
    application_start_date: date | None = None
    application_end_date: date | None = None
    vacancy_count: int | None = None
    total_vacancies: int | None = None
    qualification_summary: str | None = None
    salary: str | None = None
    confidence_label: str | None = None
    verification_label: str | None = None
    latest_update_type: str | None = None
    latest_update_at: datetime | None = None
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
    source_id: str | None = None
    external_id: str | None = None
    title: str
    slug: str

    organization: str | None = None
    category: str | None = None
    state: str | None = None
    advertisement_number: str | None = None
    post_name: str | None = None
    total_vacancies: int | None = None
    qualification_summary: str | None = None
    location_text: str | None = None

    notice_url: str
    apply_url: str | None = None
    official_notification_url: str | None = None
    official_pdf_url: str | None = None
    notification_pdf_url: str | None = None
    official_apply_url: str | None = None
    official_notification_pdf_url: str | None = None

    short_summary: str | None = None
    eligibility_text: str | None = None
    short_description: str | None = None
    detailed_description: str | None = None

    opening_date: date | None = None
    closing_date: date | None = None
    application_start_date: date | None = None
    application_end_date: date | None = None
    vacancy_count: int | None = None
    salary: str | None = None
    pay_level: str | None = None
    age_limit: str | None = None
    qualification: str | None = None
    exam_centers: str | None = None
    application_fee: str | None = None

    important_dates_json: dict[str, Any] | None = None
    fee_json: dict[str, Any] | None = None
    application_fee_json: dict[str, Any] | None = None
    age_limit_json: dict[str, Any] | None = None
    vacancy_details_json: dict[str, Any] | None = None
    qualification_details_json: dict[str, Any] | None = None
    selection_process: str | None = None
    how_to_apply: str | None = None
    important_links_json: dict[str, Any] | None = None

    status: str
    notice_type: str | None = None
    verification_status: str | None = None
    is_active: bool
    is_verified: bool
    confidence_score: float

    published_at: datetime | None = None
    latest_update_type: str | None = None
    latest_update_at: datetime | None = None
    confidence_label: str | None = None
    verification_label: str | None = None
    created_at: datetime
    updated_at: datetime
