import * as cheerio from "cheerio";

import type { ParsedNotificationItem } from "../types";

const UPSC_CALENDAR_TARGET_YEAR = (process.env.UPSC_CALENDAR_YEAR ?? "2026").trim() || "2026";
const UPSC_STATIC_EXAM_PAGES = new Set([
  "exam-calendar",
  "active-exams",
  "forthcoming-exams",
  "previous-question-papers",
  "cutoff-marks--",
  "answer-key",
  "marks-recommended-candidates",
  "marks-recommended-candidates-reserve-list",
  "revised-syllabus-scheme",
  "demo-files-computer-based-combined-medical-service-examination",
]);

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

function parseDateFromText(text: string) {
  const match = text.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/);
  if (!match) return undefined;

  const dd = Number(match[1]);
  const mm = Number(match[2]);
  const yyyy = Number(match[3]);
  const parsed = new Date(Date.UTC(yyyy, mm - 1, dd));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function titleFromUrl(url: string) {
  try {
    const pathname = new URL(url).pathname;
    const segment = pathname.split("/").filter(Boolean).pop();
    if (!segment) return "";

    return cleanWhitespace(
      safeDecode(segment)
        .replace(/\.[a-z0-9]+$/i, "")
        .replace(/[+_]/g, " "),
    );
  } catch {
    return "";
  }
}

function isSkipExamsPath(url: string) {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const examIndex = segments.findIndex((segment) => segment.toLowerCase() === "examinations");
    const slug = examIndex >= 0 ? segments[examIndex + 1] : segments[segments.length - 1];
    if (!slug) return true;
    return UPSC_STATIC_EXAM_PAGES.has(slug.toLowerCase());
  } catch {
    return true;
  }
}

function isLikelyExamText(text: string) {
  if (!text) return false;
  if (text.length < 10) return false;
  if (text.length > 220) return false;
  if (/^(home|about us|contact|downloads?)$/i.test(text)) return false;
  if (
    /^(calendar|examination calendar|active examinations|forthcoming examinations|previous question papers|cut[- ]?off marks|answer keys?|marks of recommended candidates(?: \(reserve list\))?|revised syllabus and scheme|demo files)$/i.test(
      text,
    )
  ) {
    return false;
  }
  if (/question papers|cut[- ]?off|answer keys?|marks of recommended|representation on question papers|specimen question|common mistakes/i.test(text)) {
    return false;
  }
  if (/copyright|skip to main content|screen reader/i.test(text)) return false;

  if (/(exam|examination|recruitment|service|test|combined|engineering|medical|defence|nda|cds|civil)/i.test(text)) {
    return true;
  }

  return /\b20\d{2}\b/.test(text);
}

function dedupe(items: ParsedNotificationItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${cleanWhitespace(item.title).toLowerCase()}::${item.detailUrl ?? ""}::${item.pdfUrl ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseUpscActiveExams(html: string, baseUrl: string) {
  const $ = cheerio.load(html);
  const items: ParsedNotificationItem[] = [];

  // UPSC currently renders active exams as <a><ul class="arrows"><li>...</li></ul></a>.
  $("a[href] > ul.arrows > li").each((_, li) => {
    const title = cleanWhitespace($(li).text());
    if (!title || !isLikelyExamText(title)) return;

    const href = $(li).closest("a").attr("href");
    const url = abs(baseUrl, href);
    if (!url) return;
    if (isSkipExamsPath(url)) return;

    if (/\.pdf(\?|$)/i.test(url)) {
      items.push({ title, pdfUrl: url });
      return;
    }

    items.push({ title, detailUrl: url });
  });

  if (items.length > 0) {
    return dedupe(items);
  }

  $("a[href]").each((_, a) => {
    const href = $(a).attr("href");
    const url = abs(baseUrl, href);
    if (!url) return;

    if (!/\/examinations\//i.test(url)) return;
    if (isSkipExamsPath(url)) return;
    if (!/%[0-9a-f]{2}/i.test(url) && !/\b20\d{2}\b/.test(url)) return;

    const rawTitle = cleanWhitespace($(a).text());
    const title = rawTitle && !/^(click here|view|download)$/i.test(rawTitle) ? rawTitle : titleFromUrl(url);
    if (!title || title.length < 6) return;
    if (!isLikelyExamText(title)) return;

    if (/\.pdf(\?|$)/i.test(url)) {
      items.push({ title, pdfUrl: url });
      return;
    }

    items.push({ title, detailUrl: url });
  });

  return dedupe(items);
}

export function parseUpscForthcomingExams(html: string, baseUrl: string) {
  void baseUrl;
  const $ = cheerio.load(html);
  const items: ParsedNotificationItem[] = [];

  $(".field-content ul.arrows li").each((_, li) => {
    const title = cleanWhitespace($(li).text());
    if (title.length < 5) return;
    if (/^(calendar|active examinations|forthcoming examinations)$/i.test(title)) return;
    items.push({ title });
  });

  if (items.length > 0) {
    return dedupe(items);
  }

  $("table tr").each((_, tr) => {
    const cells = $(tr).find("td");
    if (cells.length === 0) return;

    const firstCell = cleanWhitespace($(cells[0]).text());
    const rowText = cleanWhitespace($(tr).text());
    const title = firstCell || rowText;

    if (!isLikelyExamText(title)) return;
    items.push({ title });
  });

  if (items.length === 0) {
    $("main li, article li, .field-item li, .field-content li, li").each((_, li) => {
      const text = cleanWhitespace($(li).text());
      if (!isLikelyExamText(text)) return;
      items.push({ title: text });
    });
  }

  return dedupe(items);
}

export function parseUpscExamCalendar(html: string, baseUrl: string) {
  const $ = cheerio.load(html);
  const items: ParsedNotificationItem[] = [];

  $("table").each((_, table) => {
    const rows = $(table).find("tr");
    if (rows.length < 2) return;

    const headerCells = rows.first().find("th, td");
    const headers = headerCells
      .map((_, cell) => cleanWhitespace($(cell).text()).toLowerCase())
      .get();

    const notificationIndex = headers.findIndex((header) => header.includes("notification"));

    rows.slice(1).each((_, tr) => {
      const cols = $(tr).find("td");
      if (cols.length === 0) return;

      const rowText = cleanWhitespace($(tr).text());
      if (!rowText.includes(UPSC_CALENDAR_TARGET_YEAR)) return;

      const link = $(tr).find("a[href]").first();
      const linkHref = link.attr("href");
      const linkUrl = abs(baseUrl, linkHref) ?? undefined;

      let title = cleanWhitespace(link.text());
      if (!title) {
        if (headers.length > 0) {
          const examNameIndex = headers.findIndex((header) => header.includes("exam") && header.includes("name"));
          if (examNameIndex >= 0 && examNameIndex < cols.length) {
            title = cleanWhitespace($(cols[examNameIndex]).text());
          }
        }
      }
      if (!title) {
        title = cleanWhitespace($(cols[0]).text());
      }

      if (!title || title.length < 6) return;
      if (!title.includes(UPSC_CALENDAR_TARGET_YEAR)) return;

      let publishedOn: Date | undefined;
      if (notificationIndex >= 0 && notificationIndex < cols.length) {
        publishedOn = parseDateFromText(cleanWhitespace($(cols[notificationIndex]).text()));
      }

      if (!publishedOn) {
        publishedOn = parseDateFromText(rowText);
      }

      if (linkUrl && /\.pdf(\?|$)/i.test(linkUrl)) {
        items.push({ title, pdfUrl: linkUrl, publishedOn });
        return;
      }

      items.push({ title, detailUrl: linkUrl, publishedOn });
    });
  });

  if (items.length === 0) {
    $("a[href], li, p, div").each((_, element) => {
      const href = $(element).is("a") ? $(element).attr("href") : undefined;
      const text = cleanWhitespace($(element).text());
      if (!text.includes(UPSC_CALENDAR_TARGET_YEAR)) return;
      if (!/calendar/i.test(text)) return;

      const url = abs(baseUrl, href) ?? undefined;
      if (url && /\.pdf(\?|$)/i.test(url)) {
        items.push({ title: text, pdfUrl: url });
        return;
      }
      if (url && !isSkipExamsPath(url)) {
        items.push({ title: text, detailUrl: url });
      }
    });
  }

  return dedupe(items);
}
