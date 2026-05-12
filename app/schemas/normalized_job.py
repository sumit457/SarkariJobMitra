from __future__ import annotations

from typing import Any
from pydantic import BaseModel, ConfigDict


class NormalizedJobPayload(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: str | None = None
    organization: str | None = None
    advertisement_number: str | None = None
    post_name: str | None = None
    total_vacancies: int | None = None
    state: str | None = None
    category: str | None = None
    qualification_summary: str | None = None
    application_start_date: str | None = None
    application_end_date: str | None = None
    official_notification_url: str | None = None
    official_pdf_url: str | None = None
    apply_url: str | None = None

    important_dates: dict[str, Any] | None = None
    application_fee: dict[str, Any] | None = None
    age_limit: dict[str, Any] | None = None
    vacancy_details: dict[str, Any] | None = None
    qualification_details: dict[str, Any] | None = None
    selection_process: str | None = None
    salary: str | None = None
    how_to_apply: str | None = None
    important_links: dict[str, Any] | None = None

    field_confidences: dict[str, int] | None = None
    extraction_sources: dict[str, Any] | None = None
