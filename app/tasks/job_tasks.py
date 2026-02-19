from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.services.job_enrichment import enrich_missing_official_links, enrich_unstructured_jobs
from app.services.job_lifecycle import archive_old_expired_jobs, refresh_job_statuses
from app.tasks.celery_app import celery

logger = logging.getLogger(__name__)


@celery.task(name="app.tasks.job_tasks.enrich_unstructured_jobs_task")
def enrich_unstructured_jobs_task(batch_size: int = 100):
    db: Session = SessionLocal()
    try:
        processed = enrich_unstructured_jobs(db, batch_size=batch_size)
        return {"processed": processed}
    except Exception:
        db.rollback()
        logger.exception("enrich_unstructured_jobs_task failed")
        raise
    finally:
        db.close()


@celery.task(name="app.tasks.job_tasks.enrich_missing_official_links_task")
def enrich_missing_official_links_task(batch_size: int = 100):
    db: Session = SessionLocal()
    try:
        processed = enrich_missing_official_links(db, batch_size=batch_size)
        return {"processed": processed}
    except Exception:
        db.rollback()
        logger.exception("enrich_missing_official_links_task failed")
        raise
    finally:
        db.close()


@celery.task(name="app.tasks.job_tasks.update_job_status_task")
def update_job_status_task():
    db: Session = SessionLocal()
    try:
        updated = refresh_job_statuses(db, active_only=True)
        return {"updated": updated}
    except Exception:
        db.rollback()
        logger.exception("update_job_status_task failed")
        raise
    finally:
        db.close()


@celery.task(name="app.tasks.job_tasks.archive_old_jobs_task")
def archive_old_jobs_task(days_after_close: int = 30):
    db: Session = SessionLocal()
    try:
        archived = archive_old_expired_jobs(db, older_than_days=days_after_close)
        return {"archived": archived}
    except Exception:
        db.rollback()
        logger.exception("archive_old_jobs_task failed")
        raise
    finally:
        db.close()
