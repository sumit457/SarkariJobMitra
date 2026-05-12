import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

import type { ParsedNotificationItem } from "../types";

const SBI_MIN_YEAR = Number(process.env.SBI_MIN_YEAR ?? "2025");

function cleanWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function abs(base: string, href?: string | null) {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function parseDateToken(raw?: string | null) {
  if (!raw) return undefined;
  const match = raw.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (!match) return undefined;

  const dd = Number(match[1]);
  const mm = Number(match[2]);
  const yyyy = Number(match[3]);
  const dt = new Date(Date.UTC(yyyy, mm - 1, dd));
  return Number.isNaN(dt.getTime()) ? undefined : dt;
}

function extractDates(raw?: string | null) {
  if (!raw) return [] as Date[];
  const matches = raw.match(/\d{1,2}[./-]\d{1,2}[./-]\d{4}/g) ?? [];
  const seen = new Set<number>();
  return matches
    .map((token) => parseDateToken(token))
    .filter((dt): dt is Date => Boolean(dt))
    .filter((dt) => {
      const ts = dt.getTime();
      if (seen.has(ts)) return false;
      seen.add(ts);
      return true;
    });
}

function normalizedTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function yearCandidates(values: Array<Date | undefined>, fallbackText: string) {
  const years = values
    .filter((value): value is Date => Boolean(value))
    .map((value) => value.getUTCFullYear());
  const fromText = (fallbackText.match(/\b20\d{2}\b/g) ?? []).map((token) => Number(token));
  return [...years, ...fromText].filter((year) => Number.isFinite(year));
}

function parseSourceSession(text: string) {
  const match = text.match(/\b(20\d{2})\s*-\s*(\d{2})\b/);
  if (!match) return undefined;
  return `${match[1]}-${match[2]}`;
}

function dedupe(items: ParsedNotificationItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.examId ?? ""}::${item.title.toLowerCase()}::${item.pdfUrl ?? ""}::${item.applyUrl ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pickNotificationPdfUrl(
  $: cheerio.CheerioAPI,
  content: cheerio.Cheerio<AnyNode>,
  baseUrl: string,
) {
  let best: { score: number; url: string } | undefined;

  content.find("li a[href], a[href]").each((_, anchor) => {
    const a = $(anchor);
    const href = a.attr("href");
    const url = abs(baseUrl, href);
    if (!url || !/\.pdf(?:[/?]|$)/i.test(url)) return;

    const linkText = cleanWhitespace(a.text()).toLowerCase();
    const itemText = cleanWhitespace(a.closest("li").text()).toLowerCase();

    let score = 0;
    if (/download/.test(itemText)) score += 2;
    if (/advertisement|advt|detailed/.test(itemText)) score += 4;
    if (/english/.test(linkText)) score += 2;

    if (!best || score > best.score) {
      best = { score, url };
    }
  });

  return best?.url;
}

function pickApplyUrl(
  $: cheerio.CheerioAPI,
  content: cheerio.Cheerio<AnyNode>,
  baseUrl: string,
) {
  let best: { score: number; url: string } | undefined;

  content.find("a[href]").each((_, anchor) => {
    const a = $(anchor);
    const href = a.attr("href");
    const url = abs(baseUrl, href);
    if (!url) return;

    const text = cleanWhitespace(a.text()).toLowerCase();
    const hay = `${text} ${url.toLowerCase()}`;

    let score = 0;
    if (/apply\s*online|apply\s*now/.test(hay)) score += 5;
    if (/recruitment\.sbi\.bank\.in|ibpsreg\.ibps\.in|ibpsonline\.ibps\.in/.test(hay)) score += 3;
    if (/\/apply\b/.test(url.toLowerCase())) score += 2;

    if (score <= 0) return;
    if (!best || score > best.score) {
      best = { score, url };
    }
  });

  return best?.url;
}

export function parseSbiCurrentOpenings(html: string, baseUrl: string) {
  const $ = cheerio.load(html);
  const items: ParsedNotificationItem[] = [];
  const today = normalizedTodayUtc();

  $("#jobLinks .accordion.lateral").each((_, cardElement) => {
    const card = $(cardElement);
    const target = card.attr("data-target") ?? card.attr("aria-controls");
    const targetId = target?.replace(/^#/, "") || "";
    if (!targetId) return;

    const content = $(`#${targetId}`);
    if (content.length === 0) return;

    const titleTextRaw = cleanWhitespace(card.find("p").first().text());
    const titleText = cleanWhitespace(titleTextRaw.replace(/\(\s*apply\s+online[^)]*\)/i, ""));
    if (!titleText || titleText.length < 8) return;

    const adNoText = cleanWhitespace(
      card
        .find("p")
        .filter((_, p) => /advertisement\s*no/i.test($(p).text()))
        .first()
        .text(),
    );
    const adNoMatch = adNoText.match(/advertisement\s*no\s*[:\-]?\s*([A-Z0-9/.-]+)/i);
    const examId = adNoMatch?.[1]?.trim() || cleanWhitespace(card.attr("data-articleid") || "") || undefined;

    const lastDateText = cleanWhitespace(
      card
        .find("button.blue-btn")
        .first()
        .text(),
    );
    const lastDate = parseDateToken(lastDateText);

    const rangeDates = extractDates(`${titleTextRaw} ${content.text()}`);
    const sourceOpenDate = rangeDates.length >= 2 ? rangeDates[0] : undefined;
    const sourceCloseDate = lastDate ?? rangeDates[rangeDates.length - 1];

    if (!sourceCloseDate) return;

    const years = yearCandidates([sourceOpenDate, sourceCloseDate], `${titleTextRaw} ${adNoText}`);
    const maxYear = years.length > 0 ? Math.max(...years) : undefined;
    if (maxYear && maxYear < SBI_MIN_YEAR) return;

    if (sourceCloseDate.getTime() < today.getTime()) return;

    const pdfUrl = pickNotificationPdfUrl($, content, baseUrl);
    const applyUrl = pickApplyUrl($, content, baseUrl);
    if (!applyUrl) return;

    const detailUrl = abs(baseUrl, `#${targetId}`) ?? baseUrl;
    const publishedOn = sourceOpenDate ?? sourceCloseDate;
    const sourceSession = parseSourceSession(`${adNoText} ${titleTextRaw}`);
    const title = examId ? `${titleText} (${examId})` : titleText;

    items.push({
      title,
      detailUrl,
      pdfUrl: pdfUrl ?? undefined,
      applyUrl: applyUrl ?? undefined,
      examId,
      publishedOn,
      sourceOpenDate,
      sourceCloseDate,
      sourceSession,
    });
  });

  return dedupe(items);
}
