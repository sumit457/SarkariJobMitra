from __future__ import annotations

from collections import defaultdict, deque
from time import monotonic
from typing import Deque

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.config import settings

TOOL_PREFIXES = ("/image-tools", "/convert", "/compress")

_buckets: dict[str, Deque[float]] = defaultdict(deque)


def _client_key(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def check_public_tool_rate_limit(request: Request) -> JSONResponse | None:
    if not settings.RATE_LIMIT_ENABLED or request.method == "OPTIONS":
        return None

    path = request.url.path
    if not path.startswith(TOOL_PREFIXES):
        return None

    limit = max(1, settings.RATE_LIMIT_REQUESTS)
    window = max(1, settings.RATE_LIMIT_WINDOW_SECONDS)
    now = monotonic()
    key = f"{_client_key(request)}:{path.split('/', 2)[1]}"
    bucket = _buckets[key]
    cutoff = now - window

    while bucket and bucket[0] <= cutoff:
        bucket.popleft()

    if len(bucket) >= limit:
        retry_after = max(1, int(window - (now - bucket[0])))
        return JSONResponse(
            status_code=429,
            content={
                "detail": "Too many tool requests. Please wait a little and try again.",
                "retry_after_seconds": retry_after,
            },
            headers={"Retry-After": str(retry_after)},
        )

    bucket.append(now)
    return None
