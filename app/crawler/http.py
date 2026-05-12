import os

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(min=1, max=10),
    retry=retry_if_exception_type(httpx.HTTPError),
    reraise=True,
)
async def fetch_text(url: str) -> str:
    connect_timeout = float(os.getenv("CRAWLER_CONNECT_TIMEOUT_SECONDS", "15"))
    read_timeout = float(os.getenv("CRAWLER_READ_TIMEOUT_SECONDS", "30"))
    write_timeout = float(os.getenv("CRAWLER_WRITE_TIMEOUT_SECONDS", "15"))
    pool_timeout = float(os.getenv("CRAWLER_POOL_TIMEOUT_SECONDS", "15"))
    timeout = httpx.Timeout(
        connect=connect_timeout,
        read=read_timeout,
        write=write_timeout,
        pool=pool_timeout,
    )
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (X11; Linux x86_64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/122.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        r = await client.get(url, headers=headers)
        r.raise_for_status()
        return r.text
