from __future__ import annotations

from dataclasses import dataclass
from difflib import SequenceMatcher

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.job import Job


@dataclass(frozen=True)
class DedupeResult:
    status: str
    matched_job_id: object | None
    reason: str
    score: float = 0.0


def _norm(value: str | None) -> str:
    return " ".join((value or "").lower().split())


def _similarity(left: str | None, right: str | None) -> float:
    l_norm = _norm(left)
    r_norm = _norm(right)
    if not l_norm or not r_norm:
        return 0.0
    return SequenceMatcher(None, l_norm, r_norm).ratio()


def detect_duplicate_job(db: Session, job: Job) -> DedupeResult:
    if job.advertisement_number and job.organization:
        existing = db.scalar(
            select(Job).where(
                Job.id != job.id,
                func.lower(Job.advertisement_number) == job.advertisement_number.lower(),
                func.lower(Job.organization) == job.organization.lower(),
            )
        )
        if existing:
            return DedupeResult("duplicate", existing.id, "Advertisement number and organization match.", 1.0)

    if job.official_pdf_url:
        existing = db.scalar(select(Job).where(Job.id != job.id, Job.official_pdf_url == job.official_pdf_url))
        if existing:
            return DedupeResult("duplicate", existing.id, "Official PDF URL matches.", 1.0)

    apply_url = job.apply_url or job.official_apply_url
    if apply_url:
        existing = db.scalar(select(Job).where(Job.id != job.id, or_(Job.apply_url == apply_url, Job.official_apply_url == apply_url)))
        if existing:
            return DedupeResult("duplicate", existing.id, "Apply URL matches.", 1.0)

    if job.organization and (job.application_end_date or job.closing_date):
        deadline = job.application_end_date or job.closing_date
        candidates = list(
            db.scalars(
                select(Job)
                .where(Job.id != job.id, func.lower(Job.organization) == job.organization.lower())
                .where(or_(Job.application_end_date == deadline, Job.closing_date == deadline))
                .limit(50)
            )
        )
        for candidate in candidates:
            score = _similarity(job.title, candidate.title)
            if score >= 0.88:
                return DedupeResult("possible_duplicate", candidate.id, "Similar title with same organization/date.", score)

    return DedupeResult("unique", None, "No duplicate rule matched.", 0.0)


def apply_dedupe_result(job: Job, result: DedupeResult) -> None:
    if result.status == "duplicate":
        job.is_duplicate = True
        job.duplicate_of_job_id = result.matched_job_id
        job.status = "duplicate"
    elif result.status == "possible_duplicate" and job.status not in {"published", "duplicate"}:
        job.status = "needs_review"
