from dataclasses import dataclass
from typing import Protocol

@dataclass
class ParsedListItem:
    title: str
    url: str
    published_date_raw: str | None = None

class SourceParser(Protocol):
    def parse_list(self, html: str, base_url: str) -> list[ParsedListItem]:
        ...
