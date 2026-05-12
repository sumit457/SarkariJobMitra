from __future__ import annotations

from datetime import datetime, timezone


def calculate_source_health(source, *, crawl_status: str, parser_error: bool = False, blocked: bool = False, new_jobs_found: int = 0) -> int:
    score = 0
    now = datetime.now(timezone.utc)
    last_success = getattr(source, "last_success_at", None)
    if last_success and (now - last_success).total_seconds() <= 24 * 60 * 60:
        score += 30
    if int(getattr(source, "consecutive_failures", 0) or 0) == 0:
        score += 30
    if not parser_error:
        score += 20
    if new_jobs_found >= 0:
        score += 10
    if crawl_status in {"success", "partial_success"}:
        score += 10

    score -= 10 * int(getattr(source, "consecutive_failures", 0) or 0)
    if parser_error:
        score -= 30
    if blocked:
        score -= 50
    return max(0, min(100, score))


def record_source_crawl_result(source, *, status: str, error_message: str | None = None, new_jobs_found: int = 0) -> None:
    now = datetime.now(timezone.utc)
    source.last_checked_at = now
    source.last_crawled_at = now
    if status in {"success", "partial_success"}:
        source.last_success_at = now
        source.consecutive_failures = 0
        source.last_failure_reason = None
        if new_jobs_found > 0:
            source.last_new_job_found_at = now
    else:
        source.consecutive_failures = int(source.consecutive_failures or 0) + 1
        source.last_failure_reason = error_message

    source.health_score = calculate_source_health(
        source,
        crawl_status=status,
        parser_error=bool(error_message and "parser" in error_message.lower()),
        blocked=bool(error_message and ("captcha" in error_message.lower() or "blocked" in error_message.lower())),
        new_jobs_found=new_jobs_found,
    )
