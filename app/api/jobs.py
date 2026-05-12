from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.crud.jobs import get_job_by_slug_or_id, list_jobs
from app.models.job_details import JobDetails
from app.schemas.job import JobDetailResponse, JobListItem

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _confidence_label(job) -> str:
    if job.verification_status == "official_verified":
        return "Official source verified"
    if job.verification_status == "reviewed":
        return "Reviewed"
    if (job.confidence_score or 0) >= 85:
        return "High confidence"
    return "Needs verification"


def _verification_label(job) -> str:
    if job.verification_status == "official_verified":
        return "Official source verified"
    if job.verification_status == "reviewed" or getattr(job, "is_verified", False):
        return "Reviewed"
    return "Needs verification"


def _to_list_item(job) -> JobListItem:
    notification_pdf_url = job.notification_pdf_url or job.official_pdf_url or job.official_notification_url
    closing_date = job.application_end_date or job.closing_date
    vacancy_count = job.total_vacancies or job.vacancy_count
    return JobListItem(
        id=str(job.id),
        title=job.title,
        slug=job.slug,
        organization=job.organization,
        state=job.state,
        post_name=job.post_name,
        status=job.status,
        is_active=job.is_active,
        notice_type=job.notice_type,
        verification_status=job.verification_status,
        notice_url=job.notice_url,
        apply_url=job.apply_url,
        official_notification_url=job.official_notification_url,
        official_pdf_url=job.official_pdf_url,
        notification_pdf_url=notification_pdf_url,
        official_apply_url=job.official_apply_url,
        official_notification_pdf_url=job.official_notification_pdf_url,
        opening_date=job.opening_date,
        closing_date=closing_date,
        application_start_date=job.application_start_date,
        application_end_date=job.application_end_date,
        vacancy_count=vacancy_count,
        total_vacancies=job.total_vacancies,
        qualification_summary=job.qualification_summary,
        salary=job.salary,
        confidence_label=_confidence_label(job),
        verification_label=_verification_label(job),
        latest_update_type=job.latest_update_type,
        latest_update_at=job.latest_update_at,
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
    details = db.scalar(select(JobDetails).where(JobDetails.job_id == job.id))

    return JobDetailResponse(
        id=str(job.id),
        source_id=str(job.source_id) if job.source_id else None,
        external_id=job.external_id,
        title=job.title,
        slug=job.slug,
        organization=job.organization,
        category=job.category,
        state=job.state,
        advertisement_number=job.advertisement_number,
        post_name=job.post_name,
        total_vacancies=job.total_vacancies or job.vacancy_count,
        qualification_summary=job.qualification_summary,
        location_text=job.location_text,
        notice_url=job.notice_url,
        apply_url=job.apply_url,
        official_notification_url=job.official_notification_url,
        official_pdf_url=job.official_pdf_url,
        notification_pdf_url=job.notification_pdf_url or job.official_pdf_url or job.official_notification_url,
        official_apply_url=job.official_apply_url,
        official_notification_pdf_url=job.official_notification_pdf_url,
        short_summary=job.short_summary,
        eligibility_text=job.eligibility_text,
        short_description=job.short_description,
        detailed_description=job.detailed_description,
        opening_date=job.opening_date,
        closing_date=job.application_end_date or job.closing_date,
        application_start_date=job.application_start_date,
        application_end_date=job.application_end_date,
        vacancy_count=job.total_vacancies or job.vacancy_count,
        salary=job.salary,
        pay_level=job.pay_level,
        age_limit=job.age_limit,
        qualification=job.qualification,
        exam_centers=job.exam_centers,
        application_fee=job.application_fee,
        important_dates_json=(details.important_dates_json if details else None) or job.important_dates_json,
        fee_json=job.fee_json,
        application_fee_json=details.application_fee_json if details else None,
        age_limit_json=details.age_limit_json if details else None,
        vacancy_details_json=details.vacancy_details_json if details else None,
        qualification_details_json=details.qualification_details_json if details else None,
        selection_process=details.selection_process if details else None,
        how_to_apply=details.how_to_apply if details else None,
        important_links_json=details.important_links_json if details else None,
        status=job.status,
        notice_type=job.notice_type,
        verification_status=job.verification_status,
        is_active=job.is_active,
        is_verified=job.is_verified,
        confidence_score=job.confidence_score,
        published_at=job.published_at,
        latest_update_type=job.latest_update_type,
        latest_update_at=job.latest_update_at,
        confidence_label=_confidence_label(job),
        verification_label=_verification_label(job),
        created_at=job.created_at,
        updated_at=job.updated_at,
    )
