from __future__ import annotations

import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from app.crawler.parsers.base import ParsedListItem


def _clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def _is_skip_exams_path(url: str) -> bool:
    return bool(
        re.search(
            r"/examinations/(active-exams|forthcoming-exams|exam-calendar|previous-question-papers|cutoff-marks--|answer-key|marks-recommended-candidates|marks-recommended-candidates-reserve-list|revised-syllabus-scheme)",
            url,
            re.I,
        )
    )


def _dedupe(items: list[ParsedListItem]) -> list[ParsedListItem]:
    seen: set[str] = set()
    out: list[ParsedListItem] = []
    for item in items:
        key = f"{item.title.lower()}::{item.url.lower()}"
        if key in seen:
            continue
        seen.add(key)
        out.append(item)
    return out


class UPSCActiveExamsParser:
    """Parses UPSC active exams page and returns detail page URLs."""

    def parse_list(self, html: str, base_url: str) -> list[ParsedListItem]:
        soup = BeautifulSoup(html, "lxml")
        items: list[ParsedListItem] = []

        # UPSC renders items as: <a href="..."><ul class="arrows"><li>Exam title</li></ul></a>
        for li in soup.select("a[href] > ul.arrows > li"):
            title = _clean_text(li.get_text(" ", strip=True))
            if not title:
                continue

            parent_link = li.find_parent("a")
            href = parent_link.get("href") if parent_link else None
            if not href:
                continue

            url = urljoin(base_url, href)
            if "/examinations/" not in url.lower():
                continue
            if _is_skip_exams_path(url):
                continue

            items.append(ParsedListItem(title=title, url=url))

        if items:
            return _dedupe(items)

        # Fallback for layout variations.
        for link in soup.select("a[href]"):
            href = (link.get("href") or "").strip()
            if not href:
                continue
            url = urljoin(base_url, href)
            if "/examinations/" not in url.lower():
                continue
            if _is_skip_exams_path(url):
                continue

            title = _clean_text(link.get_text(" ", strip=True))
            if len(title) < 8:
                continue
            items.append(ParsedListItem(title=title, url=url))

        return _dedupe(items)


class UPSCForthcomingExamsParser:
    """Parses UPSC forthcoming exams page (usually title list without links)."""

    def parse_list(self, html: str, base_url: str) -> list[ParsedListItem]:
        soup = BeautifulSoup(html, "lxml")
        items: list[ParsedListItem] = []

        for li in soup.select(".field-content ul.arrows li"):
            title = _clean_text(li.get_text(" ", strip=True))
            if len(title) < 5:
                continue
            items.append(ParsedListItem(title=title, url=base_url))

        if not items:
            for li in soup.select("li"):
                title = _clean_text(li.get_text(" ", strip=True))
                if not re.search(r"(exam|examination|service|recruitment|ldce|20\d{2})", title, re.I):
                    continue
                items.append(ParsedListItem(title=title, url=base_url))

        return _dedupe(items)


class UPSCExamCalendarParser:
    """Parses UPSC exam calendar page and keeps only target-year documents."""

    def __init__(self, target_year: str = "2026"):
        self.target_year = target_year

    def parse_list(self, html: str, base_url: str) -> list[ParsedListItem]:
        soup = BeautifulSoup(html, "lxml")
        items: list[ParsedListItem] = []

        for row in soup.select("table tr"):
            cells = row.select("td")
            if len(cells) < 2:
                continue

            title = _clean_text(cells[0].get_text(" ", strip=True))
            if self.target_year not in title:
                continue

            link = cells[0].select_one("a[href]") or row.select_one("a[href]")
            href = link.get("href") if link else None
            if not href:
                continue

            url = urljoin(base_url, href)
            date_raw = _clean_text(cells[-1].get_text(" ", strip=True))
            items.append(ParsedListItem(title=title, url=url, published_date_raw=date_raw or None))

        if items:
            return _dedupe(items)

        for link in soup.select("a[href]"):
            title = _clean_text(link.get_text(" ", strip=True))
            if self.target_year not in title:
                continue

            href = (link.get("href") or "").strip()
            if not href:
                continue
            url = urljoin(base_url, href)
            items.append(ParsedListItem(title=title, url=url))

        return _dedupe(items)
