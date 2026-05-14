from __future__ import annotations

import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from app.crawler.parsers.base import ParsedListItem


RECRUITMENT_RE = re.compile(
    r"\b(recruitment|vacancy|vacancies|career|careers|job|jobs|advt|advertisement|notification|notice|apply|application|result|admit\s+card|answer\s+key|interview|document\s+verification|syllabus|exam\s+date)\b",
    re.I,
)
NOISE_RE = re.compile(r"\b(tender|auction|privacy|copyright|feedback|contact|login|sign\s+in|archive|sitemap|screen\s+reader)\b", re.I)


class GenericOfficialParser:
    def parse_list(self, html: str, base_url: str) -> list[ParsedListItem]:
        soup = BeautifulSoup(html, "lxml")
        items: list[ParsedListItem] = []
        seen: set[str] = set()

        for anchor in soup.select("a[href]"):
            title = " ".join((anchor.get_text() or "").split()).strip()
            href = anchor.get("href")
            if not title or len(title) < 4 or not href:
                continue

            url = urljoin(base_url, href)
            haystack = f"{title} {url}"
            if not RECRUITMENT_RE.search(haystack):
                continue
            if NOISE_RE.search(haystack):
                continue

            key = f"{title.lower()}::{url}"
            if key in seen:
                continue
            seen.add(key)
            items.append(ParsedListItem(title=title, url=url))

        return items[:200]
