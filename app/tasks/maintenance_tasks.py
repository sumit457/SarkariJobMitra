from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.job import Job
from app.models.audit_log import AuditLog
from app.tasks.celery_app import celery


def _parse_ddmmyyyy(s: str):
    try:
        return datetime.strptime(s, "%d-%m-%Y").date()
    except Exception:
        return None


@celery.task(name="app.tasks.maintenance_tasks.archive_old_jobs")
def archive_old_jobs(days_after_upload: int = 90):
    """
    Archives jobs whose uploaded_date is older than `days_after_upload`.
    Uses IST date for comparison.
    """
    db: Session = SessionLocal()
    try:
        today_ist = datetime.now(timezone.utc).astimezone(ZoneInfo("Asia/Kolkata")).date()
        cutoff = today_ist - timedelta(days=days_after_upload)

        # Only archive things that are still visible-ish
        stmt = select(Job).where(Job.status.in_(["draft", "needs_review", "published"]))
        jobs = list(db.scalars(stmt))

        archived = 0
        for job in jobs:
            dates = job.important_dates_json or {}
            uploaded_raw = dates.get("uploaded_date")
            if not uploaded_raw:
                continue

            uploaded_dt = _parse_ddmmyyyy(uploaded_raw)
            if not uploaded_dt:
                continue

            if uploaded_dt < cutoff:
                job.status = "archived"
                db.add(job)
                db.add(
                    AuditLog(
                        actor="system",
                        action="ARCHIVE_JOB_OLD",
                        entity_type="job",
                        entity_id=str(job.id),
                        meta_json={"uploaded_date": uploaded_raw, "days_after_upload": days_after_upload},
                    )
                )
                archived += 1

        db.commit()
        return {"archived": archived}
    finally:
        db.close()
