import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
async def fetch_text(url: str) -> str:
    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        r = await client.get(url, headers={"User-Agent": "GovJobsBot/1.0"})
        r.raise_for_status()
        return r.text
