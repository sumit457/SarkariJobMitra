from __future__ import annotations

from dataclasses import dataclass

from app.services.official_domain_validation import validate_official_url


@dataclass(frozen=True)
class ConfidenceResult:
    confidence_score: int
    verification_status: str
    missing_required_fields: list[str]
    reasons: list[str]
    publish_status: str


def _has(value) -> bool:
    return value is not None and str(value).strip() != ""


def calculate_job_confidence(job, job_details=None, field_candidates=None, source=None, db=None) -> ConfidenceResult:
    score = 0
    reasons: list[str] = []
    missing: list[str] = []
    field_candidates = field_candidates or []

    official_url = getattr(job, "official_pdf_url", None) or getattr(job, "official_notification_url", None) or getattr(job, "notice_url", None)
    apply_url = getattr(job, "apply_url", None) or getattr(job, "official_apply_url", None)
    source_type = (getattr(source, "source_type", None) or "").lower()
    trust_level = int(getattr(source, "trust_level", 0) or 0)
    official_validation = validate_official_url(official_url, source, db)
    apply_validation = validate_official_url(apply_url, source, db) if apply_url else None

    if official_validation.status in {"official_verified", "official_but_unknown_domain"}:
        score += 25
        reasons.append("Official source detected.")
    if trust_level >= 90:
        score += 10
        reasons.append("High trust source.")
    if _has(getattr(job, "official_pdf_url", None)):
        score += 20
        reasons.append("Official PDF found.")
    if _has(getattr(job, "official_notification_url", None)) or _has(getattr(job, "notice_url", None)):
        score += 15
        reasons.append("Official page found.")
    if official_validation.status == "official_verified":
        score += 15
        reasons.append("Approved domain verified.")
    if _has(getattr(job, "advertisement_number", None)):
        score += 10
        reasons.append("Advertisement number found.")
    if _has(getattr(job, "application_end_date", None)) or _has(getattr(job, "closing_date", None)):
        score += 10
        reasons.append("Application end date found.")
    if apply_validation and apply_validation.status != "suspicious":
        score += 10
        reasons.append("Apply link found.")
    if _has(getattr(job, "total_vacancies", None)) or _has(getattr(job, "vacancy_count", None)):
        score += 5
        reasons.append("Vacancy count found.")
    if _has(getattr(job, "qualification_summary", None)) or _has(getattr(job, "qualification", None)):
        score += 5
        reasons.append("Qualification found.")

    unresolved_conflicts = [
        c for c in field_candidates
        if getattr(c, "resolution_status", None) == "unresolved"
    ]
    if not unresolved_conflicts:
        score += 10
        reasons.append("No unresolved conflicts.")

    if not _has(getattr(job, "title", None)):
        score -= 50
        missing.append("title")
    if not _has(getattr(job, "organization", None)):
        score -= 40
        missing.append("organization")
    if official_validation.status in {"third_party", "suspicious"}:
        score -= 40
        missing.append("official_notification_url_or_pdf")
        reasons.append("Missing verified official source URL/PDF.")
    if not (_has(getattr(job, "application_end_date", None)) or _has(getattr(job, "closing_date", None))):
        score -= 15
        missing.append("application_end_date")
    if unresolved_conflicts:
        score -= 30
        reasons.append("Unresolved field conflict exists.")
    if apply_validation and apply_validation.status == "suspicious":
        score -= 40
        reasons.append("Suspicious apply URL.")
    if source_type == "aggregator" and official_validation.status != "official_verified":
        score -= 40
        reasons.append("Aggregator-only source.")

    critical_llm_only = {
        getattr(c, "field_name", "")
        for c in field_candidates
        if getattr(c, "source_type", "") == "llm" and int(getattr(c, "confidence", 0) or 0) >= 60
    } & {"title", "organization", "application_end_date", "apply_url", "official_pdf_url"}
    if critical_llm_only:
        score -= 15
        reasons.append("Critical field is LLM-only.")

    score = max(0, min(100, int(score)))
    suspicious = official_validation.status == "suspicious" or bool(unresolved_conflicts)

    if suspicious:
        verification_status = "suspicious"
        publish_status = "suspicious"
    elif source_type == "aggregator" and official_validation.status != "official_verified":
        verification_status = "aggregator_only"
        publish_status = "needs_review"
    elif official_validation.status == "official_verified" and score >= 85:
        verification_status = "official_verified"
        publish_status = "published" if score >= 90 and "title" not in missing and "organization" not in missing else "needs_review"
    elif getattr(job, "is_verified", False):
        verification_status = "reviewed"
        publish_status = "published" if score >= 70 else "needs_review"
    else:
        verification_status = "unverified"
        publish_status = "needs_review" if score >= 70 else "draft"

    return ConfidenceResult(score, verification_status, missing, reasons, publish_status)
