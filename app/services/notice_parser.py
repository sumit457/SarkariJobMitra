from __future__ import annotations

import logging
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

_APPLY_KEYWORDS = (
    "apply",
    "registration",
    "online form",
    "recruitment",
    "apply now",
    "candidate login",
)
_NOTICE_KEYWORDS = (
    "notification",
    "advertisement",
    "detailed",
    "official notice",
    "information bulletin",
)


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=6),
    retry=retry_if_exception_type(httpx.HTTPError),
    reraise=True,
)
def _download_html(url: str) -> str:
    timeout = httpx.Timeout(connect=8.0, read=20.0, write=8.0, pool=8.0)
    with httpx.Client(timeout=timeout, follow_redirects=True) as client:
        res = client.get(url)
        res.raise_for_status()
        return res.text


def _is_web_url(value: str) -> bool:
    lower = value.lower()
    return lower.startswith("http://") or lower.startswith("https://")


def _clean_href(href: str, base_url: str) -> str:
    href = (href or "").strip()
    if not href or href.startswith("#") or href.lower().startswith("javascript:"):
        return ""
    absolute = urljoin(base_url, href)
    return absolute if _is_web_url(absolute) else ""


def _score_apply(text: str, url: str) -> int:
    hay = f"{text} {url}".lower()
    score = 0
    if any(k in hay for k in _APPLY_KEYWORDS):
        score += 5
    if ".gov" in hay or ".nic.in" in hay:
        score += 2
    if "apply" in url.lower():
        score += 2
    return score


def _score_notification(text: str, url: str) -> int:
    hay = f"{text} {url}".lower()
    score = 0
    if url.lower().endswith(".pdf"):
        score += 6
    if any(k in hay for k in _NOTICE_KEYWORDS):
        score += 4
    if ".gov" in hay or ".nic.in" in hay:
        score += 2
    return score


def extract_official_links_from_notice(notice_url: str) -> dict[str, str | None]:
    """Extract likely official apply + notification links from a notice page."""
    if not _is_web_url(notice_url):
        return {"official_apply_url": None, "official_notification_pdf_url": None}

    try:
        html = _download_html(notice_url)
    except Exception:
        logger.exception("failed to fetch notice page for link extraction", extra={"notice_url": notice_url})
        return {"official_apply_url": None, "official_notification_pdf_url": None}

    soup = BeautifulSoup(html, "lxml")

    best_apply: tuple[int, str] = (0, "")
    best_notice: tuple[int, str] = (0, "")

    for anchor in soup.find_all("a", href=True):
        href = _clean_href(anchor.get("href", ""), notice_url)
        if not href:
            continue

        text = anchor.get_text(" ", strip=True)

        apply_score = _score_apply(text, href)
        if apply_score > best_apply[0]:
            best_apply = (apply_score, href)

        notice_score = _score_notification(text, href)
        if notice_score > best_notice[0]:
            best_notice = (notice_score, href)

    return {
        "official_apply_url": best_apply[1] or None,
        "official_notification_pdf_url": best_notice[1] or None,
    }

