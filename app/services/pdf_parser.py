from __future__ import annotations

from datetime import date
import io
import logging
import re
from typing import Iterable

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

try:
    import pdfplumber
except Exception:  # pragma: no cover - optional import guard
    pdfplumber = None

try:
    from PyPDF2 import PdfReader
except Exception:  # pragma: no cover - optional import guard
    PdfReader = None

logger = logging.getLogger(__name__)

_DATE_TOKEN_RE = re.compile(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{4})\b")
_URL_RE = re.compile(r"https?://[^\s)\]>'\"]+", re.IGNORECASE)


class PDFDownloadError(Exception):
    pass


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=6),
    retry=retry_if_exception_type((httpx.HTTPError, PDFDownloadError)),
    reraise=True,
)
def _download_pdf_bytes(url: str) -> bytes:
    timeout = httpx.Timeout(connect=8.0, read=20.0, write=8.0, pool=8.0)
    with httpx.Client(timeout=timeout, follow_redirects=True) as client:
        response = client.get(url)
        response.raise_for_status()

    content = response.content or b""
    if not content:
        raise PDFDownloadError("Empty PDF content")
    return content


def _extract_text_pdfplumber(pdf_bytes: bytes) -> str:
    if pdfplumber is None:
        return ""

    chunks: list[str] = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            if page_text:
                chunks.append(page_text)
    return "\n".join(chunks).strip()


def _extract_text_pypdf2(pdf_bytes: bytes) -> str:
    if PdfReader is None:
        return ""

    reader = PdfReader(io.BytesIO(pdf_bytes))
    chunks: list[str] = []
    for page in reader.pages:
        page_text = page.extract_text() or ""
        if page_text:
            chunks.append(page_text)
    return "\n".join(chunks).strip()


def extract_text_from_pdf(url: str) -> str:
    """Download and extract text from a PDF URL.

    Uses pdfplumber first and falls back to PyPDF2 when needed.
    """
    try:
        pdf_bytes = _download_pdf_bytes(url)
    except Exception:
        logger.exception("failed to download PDF", extra={"url": url})
        return ""

    text = _extract_text_pdfplumber(pdf_bytes)
    if text:
        return text

    text = _extract_text_pypdf2(pdf_bytes)
    if text:
        return text

    logger.warning("no text extracted from PDF", extra={"url": url})
    return ""


def _parse_date_token(value: str) -> date | None:
    parts = re.split(r"[/-]", value.strip())
    if len(parts) != 3:
        return None

    try:
        d, m, y = int(parts[0]), int(parts[1]), int(parts[2])
        return date(y, m, d)
    except Exception:
        return None


def _find_dates(text: str) -> list[date]:
    dates: list[date] = []
    seen: set[date] = set()
    for token in _DATE_TOKEN_RE.findall(text):
        dt = _parse_date_token(token)
        if dt and dt not in seen:
            dates.append(dt)
            seen.add(dt)
    return dates


def _find_date_by_context(text: str, patterns: Iterable[str]) -> date | None:
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if not match:
            continue
        token_match = _DATE_TOKEN_RE.search(match.group(0))
        if token_match:
            dt = _parse_date_token(token_match.group(1))
            if dt:
                return dt
    return None


def _extract_vacancy_count(text: str) -> int | None:
    patterns = [
        r"(\d{1,3}(?:,\d{3})+|\d+)\s*(?:posts?|vacancies|vacancy)",
        r"(?:total\s+)?vacanc(?:y|ies)\s*[:\-]?\s*(\d{1,3}(?:,\d{3})+|\d+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            try:
                return int(match.group(1).replace(",", ""))
            except Exception:
                continue
    return None


def _extract_salary(text: str) -> str | None:
    patterns = [
        r"(Rs\.?\s*\d[\d,]*\s*(?:-|to)\s*Rs\.?\s*\d[\d,]*)",
        r"(Rs\.?\s*\d[\d,]*\s*(?:-|to)\s*\d[\d,]*)",
        r"(\d[\d,]*\s*(?:-|to)\s*\d[\d,]*\s*(?:per\s+month|pm|p\.m\.))",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return re.sub(r"\s+", " ", match.group(1)).strip()
    return None


def _extract_pay_level(text: str) -> str | None:
    match = re.search(r"(level\s*[-:]?\s*\d{1,2}[a-zA-Z]?)", text, flags=re.IGNORECASE)
    if match:
        return re.sub(r"\s+", " ", match.group(1)).strip()
    return None


def _extract_fee(text: str) -> str | None:
    patterns = [
        r"(?:application\s+fee|fee)\s*[:\-]?\s*(Rs\.?\s*\d[\d,]*)",
        r"(?:application\s+fee|fee)\s*[:\-]?\s*(?:INR\s*)?(\d[\d,]*)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return re.sub(r"\s+", " ", match.group(1)).strip()
    return None


def _extract_apply_url(text: str) -> str | None:
    urls = _URL_RE.findall(text)
    if not urls:
        return None

    for url in urls:
        if any(k in url.lower() for k in ["apply", "registration", "recruitment", "career"]):
            return url
    return urls[0]


def parse_structured_data(text: str) -> dict:
    """Parse deterministic structured fields from PDF text using regex rules."""
    if not text:
        return {
            "opening_date": None,
            "closing_date": None,
            "vacancy_count": None,
            "salary": None,
            "pay_level": None,
            "application_fee": None,
            "official_apply_url": None,
            "confidence_score": 0.0,
        }

    opening_date = _find_date_by_context(
        text,
        [
            r"(?:start|opening|from|online\s+application\s+starts?)\s*(?:date)?\s*[:\-]?\s*\d{1,2}[/-]\d{1,2}[/-]\d{4}",
            r"apply\s+from\s*[:\-]?\s*\d{1,2}[/-]\d{1,2}[/-]\d{4}",
        ],
    )
    closing_date = _find_date_by_context(
        text,
        [
            r"(?:last|closing|end|to)\s*(?:date)?\s*(?:for\s+apply|to\s+apply)?\s*[:\-]?\s*\d{1,2}[/-]\d{1,2}[/-]\d{4}",
            r"apply\s+till\s*[:\-]?\s*\d{1,2}[/-]\d{1,2}[/-]\d{4}",
        ],
    )

    dates = _find_dates(text)
    if opening_date is None and dates:
        opening_date = dates[0]
    if closing_date is None and len(dates) > 1:
        closing_date = dates[1]

    vacancy_count = _extract_vacancy_count(text)
    salary = _extract_salary(text)
    pay_level = _extract_pay_level(text)
    application_fee = _extract_fee(text)
    official_apply_url = _extract_apply_url(text)

    found_count = sum(
        bool(v)
        for v in [opening_date, closing_date, vacancy_count, salary, pay_level, application_fee, official_apply_url]
    )
    confidence_score = round(min(1.0, found_count / 7.0), 2)

    return {
        "opening_date": opening_date,
        "closing_date": closing_date,
        "vacancy_count": vacancy_count,
        "salary": salary,
        "pay_level": pay_level,
        "application_fee": application_fee,
        "official_apply_url": official_apply_url,
        "confidence_score": confidence_score,
    }
