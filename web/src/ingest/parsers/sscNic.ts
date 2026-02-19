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

function parseDate(text: string) {
  const m = text.match(/(\d{2})[-\/.](\d{2})[-\/.](\d{4})/);
  if (!m) return undefined;
  const [, dd, mm, yyyy] = m;
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
}

export function parseSscNicNotices(html: string, baseUrl: string) {
  const $ = cheerio.load(html);
  const items: ParsedNotificationItem[] = [];

  // Prefer structured rows from notice tables.
  $("tr").each((_, tr) => {
    const cells = $(tr).find("td");
    if (cells.length < 3) return;

    const dateText = $(cells[0]).text().trim().replace(/\s+/g, " ");
    const title = $(cells[1]).text().trim().replace(/\s+/g, " ");
    const link = $(tr).find("a[href]").first();
    const href = link.attr("href");
    const url = abs(baseUrl, href);
    const publishedOn = parseDate(dateText);

    if (!title || !url) return;
    if (title.toLowerCase() === "click here") return;

    const isPdf = /\.pdf(\?|$)/i.test(url) || /sscfileserver|uploadedfiles/i.test(url);
    if (isPdf) items.push({ title, pdfUrl: url, publishedOn });
    else items.push({ title, detailUrl: url, publishedOn });
  });

  // Fallback for unexpected layouts where the notice title sits next to a generic "click here" link.
  if (items.length === 0) {
    $("a[href]").each((_, a) => {
      const href = $(a).attr("href");
      const url = abs(baseUrl, href);
      if (!url) return;
      if (!(/sscfileserver|uploadedfiles/i.test(url) || /\.pdf(\?|$)/i.test(url))) return;

      const rawText = $(a).text().trim().replace(/\s+/g, " ");
      const row = $(a).closest("tr");
      const candidateTitle =
        rawText.toLowerCase() === "click here"
          ? row.find("td").eq(1).text().trim().replace(/\s+/g, " ")
          : rawText;
      const publishedOn = parseDate(row.find("td").first().text().trim().replace(/\s+/g, " "));

      if (!candidateTitle) return;
      items.push({ title: candidateTitle, pdfUrl: url, publishedOn });
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
