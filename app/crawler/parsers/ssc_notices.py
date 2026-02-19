from __future__ import annotations

import re
from datetime import datetime, timezone, timedelta
from urllib.parse import urljoin
from zoneinfo import ZoneInfo

from bs4 import BeautifulSoup

from app.crawler.parsers.base import ParsedListItem


class SSCNoticesParser:
    """
    Parses SSC 'Notices' page (https://ssc.nic.in/portal/notices)

    Extracts:
    - title
    - url (usually PDF)
    - published_date_raw (uploaded date on the page, dd-mm-yyyy)

    Filters:
    - keeps only items uploaded in the last ~4 months (default 120 days), based on IST date
    """

    def __init__(self, days_back: int = 120, tz: str = "Asia/Kolkata"):
        self.days_back = days_back
        self.tz = ZoneInfo(tz)

    def _today_local(self):
        return datetime.now(timezone.utc).astimezone(self.tz).date()

    def parse_list(self, html: str, base_url: str) -> list[ParsedListItem]:
        soup = BeautifulSoup(html, "lxml")

        click_links = soup.find_all("a", string=re.compile(r"click here", re.I))
        items: list[ParsedListItem] = []

        today = self._today_local()
        cutoff = today - timedelta(days=self.days_back)

        for a in click_links:
            href = a.get("href")
            if not href:
                continue
            url = urljoin(base_url, href)

            # Walk up to nearest container to capture the whole row text
            container = a
            for _ in range(8):
                if container is None:
                    break
                if getattr(container, "name", None) in ("tr", "li", "div", "p"):
                    break
                container = container.parent

            if container is not None:
                text = " ".join(container.get_text(" ", strip=True).split())
            else:
                text = " ".join(a.get_text(" ", strip=True).split())

            # Find uploaded date in dd-mm-yyyy
            m = re.search(r"\b(\d{2}-\d{2}-\d{4})\b", text)
            date_raw = m.group(1) if m else None

            # Filter by last ~4 months (if date exists)
            if date_raw:
                try:
                    uploaded_date = datetime.strptime(date_raw, "%d-%m-%Y").date()
                except ValueError:
                    uploaded_date = None

                if uploaded_date and uploaded_date < cutoff:
                    continue

            # Build a clean title
            title = text
            if date_raw:
                title = title.replace(date_raw, " ").strip()

            # Remove "click here" and file size fragments
            title = re.sub(r"\bclick here\b", " ", title, flags=re.I)
            title = re.sub(r"\s+\(\d+(\.\d+)?\s*KB\)\s*", " ", title, flags=re.I)
            title = re.sub(r"\s+", " ", title).strip()

            if not title:
                title = "SSC Notice"

            items.append(ParsedListItem(title=title, url=url, published_date_raw=date_raw))

        # Deduplicate by URL (keep latest occurrence)
        uniq: dict[str, ParsedListItem] = {}
        for it in items:
            uniq[it.url] = it

        return list(uniq.values())
