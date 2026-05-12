import asyncio
from datetime import datetime, timezone, timedelta
import logging
from sqlalchemy import select
from app.tasks.celery_app import celery
from app.db.session import SessionLocal
from app.models.source import Source
from app.crawler.http import fetch_text
from app.crawler import PARSERS
from app.crawler.pipeline import upsert_raw_item, ensure_job_for_item
from app.core.config import settings
from app.services.notice_classifier import classify_notice
from app.services.source_health import record_source_crawl_result
from app.services.source_registry import seed_default_sources

logger = logging.getLogger(__name__)


def effective_crawl_frequency_minutes(source: Source) -> int:
    configured = int(source.crawl_frequency_minutes or 1440)
    priority = int(source.priority or 50)
    if priority >= 90:
        recommended = 30
    elif priority >= 70:
        recommended = 120
    elif priority >= 50:
        recommended = 360
    else:
        recommended = 1440

    frequency = min(configured, recommended)
    if int(source.consecutive_failures or 0) >= 5:
        return max(frequency, 1440)
    return frequency


@celery.task(name="app.tasks.crawl_tasks.crawl_due_sources")
def crawl_due_sources():
    db = SessionLocal()
    try:
        seed_summary = seed_default_sources(db)
        if seed_summary["created"] or seed_summary["updated"]:
            logger.info("default sources synced", extra=seed_summary)

        now = datetime.now(timezone.utc)
        sources = list(db.scalars(select(Source).where(Source.is_active == True)))
        due = []
        for s in sources:
            if s.last_crawled_at is None:
                due.append(s)
                continue
            next_time = s.last_crawled_at + timedelta(minutes=effective_crawl_frequency_minutes(s))
            if now >= next_time:
                due.append(s)

        for s in due:
            crawl_one_source.delay(str(s.id))
    finally:
        db.close()

@celery.task(name="app.tasks.crawl_tasks.crawl_one_source")
def crawl_one_source(source_id: str):
    db = SessionLocal()
    now = datetime.now(timezone.utc)
    try:
        src = db.get(Source, source_id)
        if not src or not src.is_active:
            return

        parser = PARSERS.get(src.parser_key)
        if not parser:
            logger.warning("source parser not found", extra={"source_id": str(source_id), "parser_key": src.parser_key})
            if settings.ENABLE_SOURCE_HEALTH:
                record_source_crawl_result(src, status="failed", error_message="parser not found")
            else:
                src.last_crawled_at = now
            db.add(src)
            db.commit()
            return

        try:
            html = asyncio.run(fetch_text(src.list_url))
            items = parser.parse_list(html=html, base_url=src.base_url)
        except Exception as exc:
            # Keep crawl resilient on transient network failures.
            logger.warning(
                "source crawl fetch/parse failed",
                extra={"source_id": str(source_id), "url": src.list_url, "error": str(exc)},
            )
            if settings.ENABLE_SOURCE_HEALTH:
                record_source_crawl_result(src, status="failed", error_message=str(exc))
            else:
                src.last_crawled_at = now
            db.add(src)
            db.commit()
            return

        new_jobs_found = 0
        for it in items:
            try:
                raw, created = upsert_raw_item(db, src.id, it.title, it.url, it.published_date_raw)
                if created:
                    classification = classify_notice(
                        it.title,
                        source_metadata={"source_type": src.source_type},
                        url=it.url,
                    )
                    raw.notice_type = classification.notice_type
                    raw.raw_status = "classified"
                    raw.is_probable_job = classification.notice_type in {"new_job", "apply_online"}
                    db.add(raw)
                    db.commit()
                    logger.info(
                        "notice classification",
                        extra={
                            "raw_item_id": str(raw.id),
                            "notice_type": classification.notice_type,
                            "confidence": classification.confidence,
                            "reason": classification.reason,
                        },
                    )
                    if not settings.ENABLE_NOTICE_CLASSIFIER or classification.notice_type in {"new_job", "apply_online"}:
                        # Phase-1: treat list item URL as notice_url, create job draft
                        ensure_job_for_item(db, src.id, it.title, it.url, it.published_date_raw, src.org, None, src.state)
                        new_jobs_found += 1
                    else:
                        raw.raw_status = "ignored"
                        raw.status = "ignored"
                        db.add(raw)
                        db.commit()
            except Exception:
                db.rollback()
                logger.exception(
                    "source crawl item upsert failed",
                    extra={"source_id": str(source_id), "item_url": it.url, "title": it.title[:200]},
                )
                continue

        if settings.ENABLE_SOURCE_HEALTH:
            record_source_crawl_result(src, status="success", new_jobs_found=new_jobs_found)
        else:
            src.last_crawled_at = now
        db.add(src)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("crawl_one_source failed unexpectedly", extra={"source_id": str(source_id)})
        # Best-effort heartbeat update to avoid immediate repeated retries.
        try:
            src = db.get(Source, source_id)
            if src:
                if settings.ENABLE_SOURCE_HEALTH:
                    record_source_crawl_result(src, status="failed", error_message="unexpected crawl failure")
                else:
                    src.last_crawled_at = now
                db.add(src)
                db.commit()
        except Exception:
            db.rollback()
    finally:
        db.close()
