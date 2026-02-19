from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
import re

from sqlalchemy import Date, String, and_, case, cast, desc, func, or_, select
from sqlalchemy.orm import Session

from app.models.job import Job


def list_published(db: Session, limit: int = 50) -> list[Job]:
    stmt = (
        select(Job)
        .where(Job.status == "published")
        .order_by(desc(Job.published_at), desc(Job.created_at))
        .limit(limit)
    )
    return list(db.scalars(stmt))


def _active_windows():
    today = date.today()
    grace_cutoff = today - timedelta(days=5)
    fresh_undated_cutoff = datetime.now(timezone.utc) - timedelta(days=120)

    active_date_window = and_(Job.closing_date.is_not(None), Job.closing_date >= grace_cutoff)
    recent_undated_window = and_(Job.closing_date.is_(None), Job.created_at >= fresh_undated_cutoff)
    return active_date_window, recent_undated_window


def _apply_common_filters(
    stmt,
    *,
    state: str | None = None,
    organization: str | None = None,
    status: str | None = None,
    search: str | None = None,
    active_only: bool = True,
):
    active_date_window, recent_undated_window = _active_windows()

    if active_only:
        stmt = stmt.where(or_(active_date_window, recent_undated_window))
    if state:
        stmt = stmt.where(Job.state == state)
    if organization:
        stmt = stmt.where(Job.organization == organization)
    if status:
        stmt = stmt.where(Job.status == status)
    if search:
        raw = search.strip().lower()
        if not raw:
            return stmt
        tokens = [t for t in re.split(r"[^a-z0-9]+", raw) if len(t) >= 2]
        if not tokens:
            tokens = [raw]

        token_clauses = []
        for token in tokens:
            pattern = f"%{token}%"
            token_clauses.append(
                or_(
                    Job.title.ilike(pattern),
                    Job.organization.ilike(pattern),
                    Job.state.ilike(pattern),
                    Job.slug.ilike(pattern),
                )
            )
        stmt = stmt.where(and_(*token_clauses))

    return stmt


def _order_by_business_priority(stmt):
    active_date_window, recent_undated_window = _active_windows()

    # Prefer active/latest jobs first; keep recently closed jobs near top,
    # then push older closed/archive records down.
    priority = case(
        (active_date_window, 0),
        (recent_undated_window, 1),
        (Job.status == "expired", 2),
        (Job.status == "archived", 3),
        else_=2,
    )

    event_date = func.coalesce(
        Job.opening_date,
        Job.closing_date,
        cast(Job.published_at, Date),
        cast(Job.created_at, Date),
    )

    return stmt.order_by(priority.asc(), desc(event_date), desc(Job.created_at))


def list_jobs(
    db: Session,
    *,
    state: str | None = None,
    organization: str | None = None,
    status: str | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
    active_only: bool = True,
) -> list[Job]:
    stmt = select(Job)
    stmt = _apply_common_filters(
        stmt,
        state=state,
        organization=organization,
        status=status,
        search=search,
        active_only=active_only,
    )
    stmt = _order_by_business_priority(stmt).limit(limit).offset(offset)
    return list(db.scalars(stmt))


def count_jobs(
    db: Session,
    *,
    state: str | None = None,
    organization: str | None = None,
    status: str | None = None,
    search: str | None = None,
    active_only: bool = True,
) -> int:
    stmt = select(func.count(Job.id))
    stmt = _apply_common_filters(
        stmt,
        state=state,
        organization=organization,
        status=status,
        search=search,
        active_only=active_only,
    )
    return int(db.scalar(stmt) or 0)


def get_job_by_slug_or_id(db: Session, slug: str) -> Job | None:
    stmt = select(Job).where(or_(Job.slug == slug, cast(Job.id, String) == slug))
    return db.scalar(stmt)
