from bs4 import BeautifulSoup
from urllib.parse import urljoin
from app.crawler.parsers.base import ParsedListItem

class ExampleStaticHtmlParser:
    """
    Replace CSS selectors according to your source.
    """
    def parse_list(self, html: str, base_url: str) -> list[ParsedListItem]:
        soup = BeautifulSoup(html, "lxml")
        items: list[ParsedListItem] = []

        for a in soup.select("a"):  # TODO: replace with real selector
            title = (a.get_text() or "").strip()
            href = a.get("href")
            if not title or not href:
                continue
            url = urljoin(base_url, href)
            items.append(ParsedListItem(title=title, url=url))
        return items
