import * as cheerio from "cheerio";

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

function parseDateFromText(text?: string | null): Date | undefined {
  if (!text) return undefined;
  const match = String(text).match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
  if (!match) return undefined;

  const dd = Number(match[1]);
  const mm = Number(match[2]);
  let yyyy = Number(match[3]);
  if (yyyy < 100) yyyy += 2000;

  const parsed = new Date(Date.UTC(yyyy, mm - 1, dd));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export type ParsedUpscDetailPage = {
  notificationDate?: Date;
  examStartDate?: Date;
  applicationLastDate?: Date;
  examDuration?: string;
  notificationPdfUrl?: string;
  applyUrl?: string;
  summary?: string;
};

export function parseUpscDetailPage(html: string, detailUrl: string): ParsedUpscDetailPage {
  const $ = cheerio.load(html);

  const result: ParsedUpscDetailPage = {};
  const summaryParts: string[] = [];

  const table = $("table").first();
  if (table.length > 0) {
    table.find("tr").each((_, row) => {
      const cols = $(row).children("th, td");
      if (cols.length < 2) return;

      const label = cleanWhitespace($(cols[0]).text()).toLowerCase();
      const valueCell = $(cols[1]);
      const valueText = cleanWhitespace(valueCell.text());

      if (!label) return;

      if (label.includes("date of notification")) {
        result.notificationDate = parseDateFromText(valueText);
        if (valueText) summaryParts.push(`Notification: ${valueText}`);
        return;
      }

      if (label.includes("date of commencement")) {
        result.examStartDate = parseDateFromText(valueText);
        if (valueText) summaryParts.push(`Exam starts: ${valueText}`);
        return;
      }

      if (label.includes("last date for receipt of applications")) {
        result.applicationLastDate = parseDateFromText(valueText);
        if (valueText) summaryParts.push(`Apply last date: ${valueText}`);
        return;
      }

      if (label.includes("duration of examination")) {
        result.examDuration = valueText || undefined;
        if (valueText) summaryParts.push(`Duration: ${valueText}`);
        return;
      }

      if (label.includes("download notification")) {
        const link = valueCell.find("a[href]").first();
        const href = link.attr("href");
        result.notificationPdfUrl = abs(detailUrl, href) ?? undefined;
      }
    });
  }

  // Prefer UPSC online application URLs when present.
  const candidateApplyUrls: string[] = [];
  $("a[href]").each((_, a) => {
    const href = $(a).attr("href");
    const text = cleanWhitespace($(a).text()).toLowerCase();
    const url = abs(detailUrl, href);
    if (!url) return;

    if (/upsconline\.nic\.in/i.test(url)) {
      candidateApplyUrls.push(url);
      return;
    }

    if (/apply|registration|online application|online recruitment|otrp|ora/i.test(text) && /upsc\.gov\.in|upsconline\.nic\.in/i.test(url)) {
      candidateApplyUrls.push(url);
    }
  });

  result.applyUrl = candidateApplyUrls[0];
  result.summary = summaryParts.length > 0 ? summaryParts.join(" | ").slice(0, 340) : undefined;

  return result;
}
