from __future__ import annotations

from datetime import date, timedelta
import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.job import Job

logger = logging.getLogger(__name__)


def compute_job_status(job: Job) -> None:
    """Compute lifecycle status for a job without committing the transaction."""
    today = date.today()

    if job.opening_date and today < job.opening_date:
        job.status = "upcoming"
        job.is_active = True
        return

    if job.opening_date and job.closing_date and job.opening_date <= today <= job.closing_date:
        job.status = "active"
        job.is_active = True
        return

    if job.closing_date and today > job.closing_date:
        days_since_close = (today - job.closing_date).days
        if days_since_close <= 5:
            # Keep recently closed jobs visible briefly in active feeds.
            job.status = "active"
            job.is_active = True
        elif days_since_close > 30:
            job.status = "archived"
            job.is_active = False
        else:
            job.status = "expired"
            job.is_active = False
        return

    # Fallback for records where date fields are not available yet.
    reference_dt = job.published_at or job.created_at
    if reference_dt:
        age_days = (today - reference_dt.date()).days
        if age_days > 120:
            job.status = "expired"
            job.is_active = False
        else:
            if job.status in {"draft", "needs_review", "published"}:
                job.status = "active"
            job.is_active = True


def refresh_job_statuses(db: Session, *, active_only: bool = True) -> int:
    """Recompute lifecycle status for jobs and commit once."""
    stmt = select(Job)
    if active_only:
        stmt = stmt.where(Job.is_active.is_(True))

    jobs = list(db.scalars(stmt))
    updated = 0

    for job in jobs:
        old_status = job.status
        old_active = job.is_active
        compute_job_status(job)
        if job.status != old_status or job.is_active != old_active:
            db.add(job)
            updated += 1

    if updated:
        db.commit()

    logger.info("job lifecycle refresh completed", extra={"updated": updated, "active_only": active_only})
    return updated


def archive_old_expired_jobs(db: Session, *, older_than_days: int = 30) -> int:
    """Archive expired jobs that closed more than N days ago."""
    cutoff = date.today() - timedelta(days=older_than_days)

    stmt = select(Job).where(
        Job.status == "expired",
        Job.closing_date.is_not(None),
        Job.closing_date < cutoff,
    )
    jobs = list(db.scalars(stmt))

    archived = 0
    for job in jobs:
        job.status = "archived"
        job.is_active = False
        db.add(job)
        archived += 1

    if archived:
        db.commit()

    logger.info("old expired jobs archived", extra={"archived": archived, "older_than_days": older_than_days})
    return archived
