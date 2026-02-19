from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_admin
from app.models.job import Job
from app.crawler.pipeline import publish_job

router = APIRouter(prefix="/admin-actions", tags=["admin-actions"])

@router.post("/jobs/{job_id}/publish")
def publish(job_id: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job = publish_job(db, job, actor=admin.email)
    return {"status": "ok", "job_id": str(job.id)}
