from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.crud.jobs import get_job_by_slug_or_id, list_jobs
from app.schemas.job import JobDetailResponse, JobListItem

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _to_list_item(job) -> JobListItem:
    return JobListItem(
        id=str(job.id),
        title=job.title,
        slug=job.slug,
        organization=job.organization,
        state=job.state,
        status=job.status,
        is_active=job.is_active,
        notice_url=job.notice_url,
        apply_url=job.apply_url,
        notification_pdf_url=job.notification_pdf_url,
        official_apply_url=job.official_apply_url,
        official_notification_pdf_url=job.official_notification_pdf_url,
        opening_date=job.opening_date,
        closing_date=job.closing_date,
        vacancy_count=job.vacancy_count,
        salary=job.salary,
        created_at=job.created_at,
        published_at=job.published_at,
    )


@router.get("", response_model=list[JobListItem])
def get_jobs(
    state: str | None = None,
    organization: str | None = None,
    status: str | None = None,
    search: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    active_only: bool = True,
    db: Session = Depends(get_db),
):
    jobs = list_jobs(
        db,
        state=state,
        organization=organization,
        status=status,
        search=search,
        limit=limit,
        offset=offset,
        active_only=active_only,
    )
    return [_to_list_item(job) for job in jobs]


@router.get("/{slug}", response_model=JobDetailResponse)
def get_job(slug: str, db: Session = Depends(get_db)):
    job = get_job_by_slug_or_id(db, slug)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobDetailResponse(
        id=str(job.id),
        source_id=str(job.source_id),
        external_id=job.external_id,
        title=job.title,
        slug=job.slug,
        organization=job.organization,
        category=job.category,
        state=job.state,
        location_text=job.location_text,
        notice_url=job.notice_url,
        apply_url=job.apply_url,
        notification_pdf_url=job.notification_pdf_url,
        official_apply_url=job.official_apply_url,
        official_notification_pdf_url=job.official_notification_pdf_url,
        short_summary=job.short_summary,
        eligibility_text=job.eligibility_text,
        short_description=job.short_description,
        detailed_description=job.detailed_description,
        opening_date=job.opening_date,
        closing_date=job.closing_date,
        vacancy_count=job.vacancy_count,
        salary=job.salary,
        pay_level=job.pay_level,
        age_limit=job.age_limit,
        qualification=job.qualification,
        exam_centers=job.exam_centers,
        application_fee=job.application_fee,
        important_dates_json=job.important_dates_json,
        fee_json=job.fee_json,
        status=job.status,
        is_active=job.is_active,
        is_verified=job.is_verified,
        confidence_score=job.confidence_score,
        published_at=job.published_at,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )
