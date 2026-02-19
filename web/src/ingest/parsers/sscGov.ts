import * as cheerio from "cheerio";

import type { ParsedNotificationItem } from "../types";

function abs(base: string, href?: string | null) {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function parseDate(value?: string | null) {
  if (!value) return undefined;
  const fromIso = new Date(value);
  if (!Number.isNaN(fromIso.getTime())) return fromIso;

  const m = value.match(/(\d{2})[-\/.](\d{2})[-\/.](\d{4})/);
  if (!m) return undefined;
  const [, dd, mm, yyyy] = m;
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
}

function toSscGovAttachmentUrl(pathValue?: string | null) {
  if (!pathValue) return undefined;

  const parts = pathValue
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part));

  if (parts.length === 0) return undefined;
  return `https://ssc.gov.in/api/attachment/${parts.join("/")}`;
}

export const SSC_GOV_NOTICE_API_URL =
  "https://ssc.gov.in/api/general-website/portal/records?page=1&limit=50&contentType=notice-boards&key=createdAt&order=DESC&pageType=filter&isAttachment=true&attributes=id,headline,examId,contentType,redirectUrl,startDate,endDate,language,createdAt&queryKey=startDate,endDate&queryValue=undefined,undefined&customKey=createdAt&exams=false&date=false&language=english";

export function parseSscGovNoticeBoard(html: string, baseUrl: string) {
  const $ = cheerio.load(html);
  const items: ParsedNotificationItem[] = [];

  $("tr").each((_, tr) => {
    const cells = $(tr).find("td");
    if (cells.length < 2) return;

    const dateText = $(cells[0]).text().trim().replace(/\s+/g, " ");
    const titleCell = $(cells[1]).text().trim().replace(/\s+/g, " ");
    const link = $(tr).find("a[href]").first();
    const href = link.attr("href");
    const url = abs(baseUrl, href);

    if (!titleCell || !url) return;

    const title = titleCell.toLowerCase() === "view" ? "SSC Notice" : titleCell;
    const isPdf = /\.pdf(\?|$)/i.test(url) || /\/api\/attachment\//i.test(url);

    if (isPdf) {
      items.push({ title, pdfUrl: url, publishedOn: parseDate(dateText) });
    } else {
      items.push({ title, detailUrl: url, publishedOn: parseDate(dateText) });
    }
  });

  const seen = new Set<string>();
  return items.filter((it) => {
    const key = `${it.title}::${it.detailUrl ?? ""}::${it.pdfUrl ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseSscGovNoticeBoardApiPayload(payloadText: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadText);
  } catch {
    return [] as ParsedNotificationItem[];
  }

  const data = (parsed as { data?: Array<Record<string, unknown>> } | null)?.data;
  if (!Array.isArray(data)) return [] as ParsedNotificationItem[];

  const items: ParsedNotificationItem[] = [];

  for (const row of data) {
    const title = String(row.headline ?? "").trim().replace(/\s+/g, " ");
    if (!title) continue;

    const attachments = Array.isArray(row.attachments) ? row.attachments : [];
    const firstPdf = attachments.find((att) => {
      const type = String((att as { type?: string }).type ?? "").toLowerCase();
      const fileName = String((att as { fileName?: string }).fileName ?? "").toLowerCase();
      return type.includes("pdf") || fileName.endsWith(".pdf");
    }) as { path?: string } | undefined;

    const pdfUrl = toSscGovAttachmentUrl(firstPdf?.path);
    const redirectUrl = String(row.redirectUrl ?? "").trim();
    const detailUrl = redirectUrl ? abs("https://ssc.gov.in", redirectUrl) ?? undefined : undefined;

    items.push({
      title,
      pdfUrl,
      detailUrl,
      publishedOn: parseDate(String(row.createdAt ?? "")) ?? parseDate(String(row.startDate ?? "")),
    });
  }

  const seen = new Set<string>();
  return items.filter((it) => {
    const key = `${it.title}::${it.detailUrl ?? ""}::${it.pdfUrl ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
