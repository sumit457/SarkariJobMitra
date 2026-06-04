from fastapi import HTTPException

from app.core.config import settings


def max_upload_bytes() -> int:
    return settings.MAX_UPLOAD_MB * 1024 * 1024


def ensure_upload_size(raw: bytes, *, label: str = "File") -> None:
    if len(raw) > max_upload_bytes():
        raise HTTPException(
            status_code=413,
            detail=f"{label} too large. Max {settings.MAX_UPLOAD_MB}MB.",
        )


def ensure_total_upload_size(total_bytes: int) -> None:
    if total_bytes > max_upload_bytes():
        raise HTTPException(
            status_code=413,
            detail=f"Total upload too large. Max {settings.MAX_UPLOAD_MB}MB.",
        )
