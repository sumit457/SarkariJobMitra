from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.source import Source


@dataclass(frozen=True)
class SourceSeed:
    name: str
    type: str
    base_url: str
    list_url: str
    org: str
    state: str | None
    parser_key: str
    crawl_frequency_minutes: int
    is_active: bool = True


DEFAULT_SOURCE_SEEDS: tuple[SourceSeed, ...] = (
    SourceSeed(
        name="SSC - Notices (ssc.nic.in)",
        type="html_list",
        base_url="https://ssc.nic.in",
        list_url="https://ssc.nic.in/portal/notices",
        org="SSC",
        state=None,
        parser_key="ssc_notices",
        crawl_frequency_minutes=180,
        is_active=True,
    ),
    SourceSeed(
        name="UPSC - Active Exams",
        type="html_list",
        base_url="https://upsc.gov.in",
        list_url="https://upsc.gov.in/examinations/active-exams",
        org="UPSC",
        state=None,
        parser_key="upsc_active_exams",
        crawl_frequency_minutes=180,
        is_active=True,
    ),
    SourceSeed(
        name="UPSC - Forthcoming Exams",
        type="html_list",
        base_url="https://upsc.gov.in",
        list_url="https://upsc.gov.in/examinations/forthcoming-exams",
        org="UPSC",
        state=None,
        parser_key="upsc_forthcoming_exams",
        crawl_frequency_minutes=360,
        is_active=True,
    ),
    SourceSeed(
        name="UPSC - Exam Calendar (2026)",
        type="html_list",
        base_url="https://upsc.gov.in",
        list_url="https://upsc.gov.in/examinations/exam-calendar",
        org="UPSC",
        state=None,
        parser_key="upsc_exam_calendar_2026",
        crawl_frequency_minutes=720,
        is_active=True,
    ),
)


def seed_default_sources(db: Session) -> dict[str, int]:
    """
    Ensure default crawler sources exist.
    Uses parser_key + list_url as stable identity to avoid duplicates.
    """
    created = 0
    updated = 0

    for seed in DEFAULT_SOURCE_SEEDS:
        stmt = select(Source).where(
            Source.parser_key == seed.parser_key,
            Source.list_url == seed.list_url,
        )
        existing = db.scalar(stmt)

        if existing is None:
            db.add(
                Source(
                    name=seed.name,
                    type=seed.type,
                    base_url=seed.base_url,
                    list_url=seed.list_url,
                    org=seed.org,
                    state=seed.state,
                    parser_key=seed.parser_key,
                    crawl_frequency_minutes=seed.crawl_frequency_minutes,
                    is_active=seed.is_active,
                )
            )
            created += 1
            continue

        changed = False
        for field, value in (
            ("name", seed.name),
            ("type", seed.type),
            ("base_url", seed.base_url),
            ("org", seed.org),
            ("state", seed.state),
            ("crawl_frequency_minutes", seed.crawl_frequency_minutes),
            ("is_active", seed.is_active),
        ):
            if getattr(existing, field) != value:
                setattr(existing, field, value)
                changed = True

        if changed:
            db.add(existing)
            updated += 1

    if created or updated:
        db.commit()

    return {"created": created, "updated": updated}
