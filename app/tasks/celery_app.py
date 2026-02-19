from celery import Celery
from app.core.config import settings

celery = Celery(
    "govjobs",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.crawl_tasks",
        "app.tasks.maintenance_tasks",
        "app.tasks.job_tasks",
    ],
)
celery.conf.timezone = "Asia/Kolkata"

celery.conf.beat_schedule = {
    "archive-old-jobs-daily-legacy": {
        "task": "app.tasks.maintenance_tasks.archive_old_jobs",
        "schedule": 24 * 60 * 60,
        "args": (90,),
    },
    "enrich-unstructured-jobs-15-min": {
        "task": "app.tasks.job_tasks.enrich_unstructured_jobs_task",
        "schedule": 15 * 60,
        "args": (100,),
    },
    "enrich-missing-official-links-15-min": {
        "task": "app.tasks.job_tasks.enrich_missing_official_links_task",
        "schedule": 15 * 60,
        "args": (100,),
    },
    "update-job-status-daily": {
        "task": "app.tasks.job_tasks.update_job_status_task",
        "schedule": 24 * 60 * 60,
    },
    "archive-old-expired-jobs-daily": {
        "task": "app.tasks.job_tasks.archive_old_jobs_task",
        "schedule": 24 * 60 * 60,
        "args": (30,),
    },
}
