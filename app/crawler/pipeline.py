import hashlib
from datetime import datetime, timezone
from slugify import slugify
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.raw_item import RawItem
from app.models.job import Job
from app.models.dedupe_key import JobDedupeKey
from app.models.audit_log import AuditLog
from app.services.job_lifecycle import compute_job_status

def sha256(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

def norm_title(t: str) -> str:
    return " ".join(t.split()).strip().lower()

def make_slug(title: str, suffix: str) -> str:
    return f"{slugify(title)[:80]}-{suffix[:10]}"

def upsert_raw_item(db: Session, source_id, title: str, url: str, published_date_raw: str | None):
    h = sha256(norm_title(title) + "|" + url)
    url_hash = sha256(url)
    raw = RawItem(source_id=source_id, title_raw=title, url_raw=url,
                  raw_title=title, raw_url=url, published_date_raw=published_date_raw,
                  content_hash=h, url_hash=url_hash,
                  first_seen_at=datetime.now(timezone.utc), last_seen_at=datetime.now(timezone.utc))
    db.add(raw)
    try:
        db.commit()
        db.refresh(raw)
        return raw, True
    except Exception:
        db.rollback()
        # already exists
        existing = db.scalar(select(RawItem).where(RawItem.source_id == source_id, RawItem.content_hash == h))
        if existing:
            existing.last_seen_at = datetime.now(timezone.utc)
            db.add(existing)
            db.commit()
        return existing, False

def find_job_by_key(db: Session, key_type: str, key_value: str) -> Job | None:
    k = db.scalar(select(JobDedupeKey).where(JobDedupeKey.key_type == key_type, JobDedupeKey.key_value == key_value))
    if not k:
        return None
    return db.get(Job, k.job_id)

def create_job_draft(
    db: Session,
    source_id,
    title: str,
    notice_url: str,
    published_date_raw: str | None = None,
    organization: str | None = None,
    category: str | None = None,
    state: str | None = None,
) -> Job:
    suffix = sha256(notice_url)[:12]
    pdf_url = notice_url if notice_url.lower().endswith(".pdf") else None

    job = Job(
        source_id=source_id,
        title=title,
        slug=make_slug(title, suffix),
        notice_url=notice_url,
        notification_pdf_url=pdf_url,  # ✅ store pdf if it is pdf
        official_notification_pdf_url=pdf_url,
        official_pdf_url=pdf_url,
        official_notification_url=notice_url,
        organization=organization,
        category=category,
        state=state,
        status="draft",
        notice_type="new_job",
        verification_status="unverified",
        is_active=True,
        important_dates_json={"uploaded_date": published_date_raw} if published_date_raw else {}
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Make crawled jobs visible in active feeds immediately based on available dates.
    old_status = job.status
    old_active = job.is_active
    compute_job_status(job)
    if job.status != old_status or job.is_active != old_active:
        db.add(job)
        db.commit()
        db.refresh(job)

    # dedupe keys
    db.add(JobDedupeKey(job_id=job.id, key_type="notice_url", key_value=notice_url))
    if pdf_url:
        db.add(JobDedupeKey(job_id=job.id, key_type="pdf_url", key_value=pdf_url))
    db.commit()

    db.add(
        AuditLog(
            actor="system",
            action="CREATE_DRAFT",
            entity_type="job",
            entity_id=str(job.id),
            meta_json={"notice_url": notice_url, "pdf_url": pdf_url},
        )
    )
    db.commit()

    return job

def ensure_job_for_item(
    db: Session,
    source_id,
    title: str,
    notice_url: str,
    published_date_raw: str | None,
    organization: str | None,
    category: str | None,
    state: str | None,
) -> Job:
    # Dedupe by notice_url first
    existing = find_job_by_key(db, "notice_url", notice_url)
    if existing:
        return existing
    return create_job_draft(db, source_id, title, notice_url, published_date_raw, organization, category, state)

def publish_job(db: Session, job: Job, actor: str):
    job.status = "published"
    job.published_at = datetime.now(timezone.utc)
    db.add(job)
    db.add(AuditLog(actor=actor, action="PUBLISH_JOB", entity_type="job", entity_id=str(job.id), meta_json={}))
    db.commit()
    db.refresh(job)
    return job
