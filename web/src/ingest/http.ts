import axios from "axios";
import crypto from "crypto";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function timeoutMs(override?: number) {
  if (override && Number.isFinite(override)) return Number(override);
  return Number(process.env.REQUEST_TIMEOUT_MS ?? 25000);
}

function userAgent() {
  return process.env.USER_AGENT ?? "GovJobsBot/1.0 (+contact@example.com)";
}

export async function fetchText(url: string, opts?: { etag?: string; timeoutMs?: number }) {
  const rateLimitMs = Number(process.env.RATE_LIMIT_MS ?? 800);
  await sleep(rateLimitMs);

  const res = await axios.get(url, {
    timeout: timeoutMs(opts?.timeoutMs),
    headers: {
      "User-Agent": userAgent(),
      ...(opts?.etag ? { "If-None-Match": opts.etag } : {}),
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    validateStatus: (status) => (status >= 200 && status < 300) || status === 304,
  });

  const text =
    res.status === 304
      ? ""
      : typeof res.data === "string"
        ? res.data
        : JSON.stringify(res.data);
  const etag = res.headers.etag ? String(res.headers.etag) : undefined;
  const hash = text ? crypto.createHash("sha256").update(text).digest("hex") : undefined;

  return { status: res.status, text, etag, hash };
}

export async function fetchTextWithPlaywright(url: string, opts?: { timeoutMs?: number }) {
  const rateLimitMs = Number(process.env.RATE_LIMIT_MS ?? 800);
  await sleep(rateLimitMs);

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      userAgent: userAgent(),
    });

    await page.goto(url, {
      timeout: timeoutMs(opts?.timeoutMs),
      waitUntil: "networkidle",
    });

    const text = await page.content();
    const hash = text ? crypto.createHash("sha256").update(text).digest("hex") : undefined;

    return { status: 200, text, etag: undefined as string | undefined, hash };
  } finally {
    await browser.close();
  }
}

export async function fetchTextWithOptionalFallback(url: string, opts?: { etag?: string; timeoutMs?: number }) {
  const res = await fetchText(url, opts);
  const fallbackEnabled = process.env.PLAYWRIGHT_FALLBACK === "true";

  if (res.status === 304 || !fallbackEnabled) {
    return res;
  }

  // Some government pages are empty in plain HTTP responses due to runtime rendering.
  if (res.text.trim().length > 0) {
    return res;
  }

  return fetchTextWithPlaywright(url, { timeoutMs: opts?.timeoutMs });
}

export async function downloadBinary(url: string) {
  const rateLimitMs = Number(process.env.RATE_LIMIT_MS ?? 800);
  await sleep(rateLimitMs);

  const res = await axios.get<ArrayBuffer>(url, {
    responseType: "arraybuffer",
    timeout: timeoutMs(),
    headers: {
      "User-Agent": userAgent(),
      Accept: "application/pdf,*/*",
    },
    maxRedirects: 5,
  });

  const buf = Buffer.from(res.data);
  const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
  const finalUrl = (res.request as { res?: { responseUrl?: string } } | undefined)?.res?.responseUrl ?? url;

  return { buf, sha256, bytes: buf.length, finalUrl };
}
