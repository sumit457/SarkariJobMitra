from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlparse

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.approved_domain import ApprovedDomain


AGGREGATOR_HOST_PARTS = ("sarkariresult", "freejobalert", "rojgar", "fresherslive", "jobriya")


@dataclass(frozen=True)
class OfficialUrlValidation:
    domain: str | None
    status: str
    trust_level: int
    reason: str


def _domain(url: str | None) -> str | None:
    if not url:
        return None
    parsed = urlparse(url if "://" in url else f"https://{url}")
    host = (parsed.hostname or "").lower().removeprefix("www.")
    return host or None


def _matches(host: str, approved: str) -> bool:
    approved = approved.lower().removeprefix("www.")
    return host == approved or host.endswith(f".{approved}")


def validate_official_url(url: str | None, source=None, db: Session | None = None) -> OfficialUrlValidation:
    host = _domain(url)
    if not host:
        return OfficialUrlValidation(None, "suspicious", 0, "URL is empty or invalid.")

    if any(part in host for part in AGGREGATOR_HOST_PARTS):
        return OfficialUrlValidation(host, "third_party", 20, "Known aggregator domains cannot verify official data.")

    if db is not None:
        rows = list(db.scalars(select(ApprovedDomain)))
        for row in rows:
            if _matches(host, row.domain):
                status = "official_verified" if row.verified_by_admin or row.trust_level >= 80 else "official_but_unknown_domain"
                return OfficialUrlValidation(host, status, row.trust_level, "Domain matched ApprovedDomain.")

    source_hosts = [
        _domain(getattr(source, "official_homepage_url", None)),
        _domain(getattr(source, "notification_page_url", None)),
        _domain(getattr(source, "base_url", None)),
        _domain(getattr(source, "list_url", None)),
    ]
    if any(candidate and _matches(host, candidate) for candidate in source_hosts):
        trust = int(getattr(source, "trust_level", 80) or 80)
        return OfficialUrlValidation(host, "official_verified", trust, "Domain matched source metadata.")

    if host.endswith(".gov.in") or host.endswith(".nic.in"):
        return OfficialUrlValidation(host, "official_but_unknown_domain", 85, "Government/NIC domain found but not yet approved.")

    if any(host.endswith(suffix) for suffix in (".edu.in", ".ac.in", ".bank.in")):
        return OfficialUrlValidation(host, "official_but_unknown_domain", 70, "Institutional domain found but not yet approved.")

    return OfficialUrlValidation(host, "third_party", 40, "Domain is not on the approved or government allowlist.")
