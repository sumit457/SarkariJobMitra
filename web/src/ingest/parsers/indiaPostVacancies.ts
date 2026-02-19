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
  const m = text.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (!m) return undefined;
  const [, dd, mm, yyyy] = m;
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
}

export function parseIndiaPostVacancies(html: string, baseUrl: string) {
  const $ = cheerio.load(html);
  const items: ParsedNotificationItem[] = [];

  // India Post vacancies currently exposes PDF endpoints via /api/documents/file/* links.
  $("a[href]").each((_, a) => {
    const href = $(a).attr("href");
    const url = abs(baseUrl, href);
    if (!url) return;

    if (!/\/api\/documents\/file\//i.test(url) && !/\.pdf(\?|$)/i.test(url)) {
      return;
    }

    const text = $(a).text().trim().replace(/\s+/g, " ");
    const containerText = $(a).closest("tr,li,div,section").text().trim().replace(/\s+/g, " ");

    let title = text;
    if (!title || /^(view|download|click here)$/i.test(title)) {
      const siblingTitle = $(a)
        .closest("tr,li,div,section")
        .find("a")
        .not(a)
        .map((_, el) => $(el).text().trim().replace(/\s+/g, " "))
        .get()
        .find((candidate) => candidate && !/^(view|download|click here)$/i.test(candidate));

      title = siblingTitle ?? "";
    }

    if (!title) return;

    items.push({
      title,
      pdfUrl: url,
      publishedOn: parseDate(containerText),
    });
  });

  const seen = new Set<string>();
  return items.filter((it) => {
    const key = `${it.title}::${it.pdfUrl ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
