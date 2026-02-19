import asyncio
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from app.tasks.celery_app import celery
from app.db.session import SessionLocal
from app.models.source import Source
from app.crawler.http import fetch_text
from app.crawler import PARSERS
from app.crawler.pipeline import upsert_raw_item, ensure_job_for_item

@celery.task(name="app.tasks.crawl_tasks.crawl_due_sources")
def crawl_due_sources():
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        sources = list(db.scalars(select(Source).where(Source.is_active == True)))
        due = []
        for s in sources:
            if s.last_crawled_at is None:
                due.append(s)
                continue
            next_time = s.last_crawled_at + timedelta(minutes=s.crawl_frequency_minutes)
            if now >= next_time:
                due.append(s)

        for s in due:
            crawl_one_source.delay(str(s.id))
    finally:
        db.close()

@celery.task(name="app.tasks.crawl_tasks.crawl_one_source")
def crawl_one_source(source_id: str):
    db = SessionLocal()
    try:
        src = db.get(Source, source_id)
        if not src or not src.is_active:
            return

        parser = PARSERS.get(src.parser_key)
        if not parser:
            return

        html = asyncio.run(fetch_text(src.list_url))
        items = parser.parse_list(html=html, base_url=src.base_url)

        for it in items:
            raw, created = upsert_raw_item(db, src.id, it.title, it.url, it.published_date_raw)
            if created:
                # Phase-1: treat list item URL as notice_url, create job draft
                ensure_job_for_item(db, src.id, it.title, it.url, it.published_date_raw, src.org, None, src.state)


        src.last_crawled_at = datetime.now(timezone.utc)
        db.add(src)
        db.commit()
    finally:
        db.close()
