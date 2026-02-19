from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.job import Job
from app.services.job_lifecycle import compute_job_status
from app.services.notice_parser import extract_official_links_from_notice
from app.services.pdf_parser import extract_text_from_pdf, parse_structured_data

logger = logging.getLogger(__name__)


def _set_if_empty(job: Job, field_name: str, value) -> None:
    if value is None:
        return

    current = getattr(job, field_name)
    if current is None or current == "":
        setattr(job, field_name, value)


def enrich_job(job: Job, db: Session) -> None:
    """Enrich a job from its notification PDF without committing."""
    pdf_url = job.official_notification_pdf_url or job.notification_pdf_url
    try:
        # Phase-1: get direct official links from notice page when missing.
        if job.notice_url and (not job.official_apply_url or not job.official_notification_pdf_url):
            links = extract_official_links_from_notice(job.notice_url)
            _set_if_empty(job, "official_apply_url", links.get("official_apply_url"))
            _set_if_empty(job, "official_notification_pdf_url", links.get("official_notification_pdf_url"))
            _set_if_empty(job, "apply_url", job.official_apply_url)
            _set_if_empty(job, "notification_pdf_url", job.official_notification_pdf_url)

        pdf_url = job.official_notification_pdf_url or job.notification_pdf_url
        if not pdf_url:
            db.add(job)
            return

        # Phase-2: parse structured fields from notification PDF.
        text = extract_text_from_pdf(pdf_url)
        if not text:
            db.add(job)
            return

        parsed = parse_structured_data(text)

        _set_if_empty(job, "opening_date", parsed.get("opening_date"))
        _set_if_empty(job, "closing_date", parsed.get("closing_date"))
        _set_if_empty(job, "vacancy_count", parsed.get("vacancy_count"))
        _set_if_empty(job, "salary", parsed.get("salary"))
        _set_if_empty(job, "pay_level", parsed.get("pay_level"))
        _set_if_empty(job, "application_fee", parsed.get("application_fee"))
        _set_if_empty(job, "official_apply_url", parsed.get("official_apply_url"))
        _set_if_empty(job, "official_notification_pdf_url", pdf_url)

        # Carry legacy fields forward only when missing.
        _set_if_empty(job, "apply_url", job.official_apply_url)
        _set_if_empty(job, "notification_pdf_url", job.official_notification_pdf_url)

        if not job.detailed_description:
            job.detailed_description = text[:10000]
        if not job.short_description and text:
            summary = " ".join(text.split())
            job.short_description = summary[:600]

        parsed_confidence = float(parsed.get("confidence_score") or 0.0)
        job.confidence_score = max(float(job.confidence_score or 0.0), parsed_confidence)
        if job.confidence_score > 0.7:
            job.is_verified = True

        compute_job_status(job)
        db.add(job)

    except Exception:
        logger.exception("job enrichment failed", extra={"job_id": str(job.id), "pdf_url": pdf_url})


def enrich_unstructured_jobs(db: Session, *, batch_size: int = 100) -> int:
    """Enrich jobs missing structured opening date fields and commit once."""
    stmt = (
        select(Job)
        .where(Job.opening_date.is_(None))
        .where((Job.official_notification_pdf_url.is_not(None)) | (Job.notification_pdf_url.is_not(None)))
        .order_by(Job.created_at.desc())
        .limit(batch_size)
    )
    jobs = list(db.scalars(stmt))

    for job in jobs:
        enrich_job(job, db)

    if jobs:
        db.commit()

    logger.info("enrichment batch completed", extra={"processed": len(jobs), "batch_size": batch_size})
    return len(jobs)


def enrich_missing_official_links(db: Session, *, batch_size: int = 100) -> int:
    """Backfill direct official links from notice pages for older records."""
    stmt = (
        select(Job)
        .where(
            (Job.official_apply_url.is_(None))
            | (Job.official_notification_pdf_url.is_(None))
            | (Job.official_apply_url == "")
            | (Job.official_notification_pdf_url == "")
        )
        .where(Job.notice_url.is_not(None))
        .order_by(Job.created_at.desc())
        .limit(batch_size)
    )
    jobs = list(db.scalars(stmt))

    for job in jobs:
        try:
            links = extract_official_links_from_notice(job.notice_url)
            _set_if_empty(job, "official_apply_url", links.get("official_apply_url"))
            _set_if_empty(job, "official_notification_pdf_url", links.get("official_notification_pdf_url"))
            _set_if_empty(job, "apply_url", job.official_apply_url)
            _set_if_empty(job, "notification_pdf_url", job.official_notification_pdf_url)
            db.add(job)
        except Exception:
            logger.exception("official link backfill failed", extra={"job_id": str(job.id)})

    if jobs:
        db.commit()

    logger.info("official link backfill completed", extra={"processed": len(jobs), "batch_size": batch_size})
    return len(jobs)
