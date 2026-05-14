import * as cheerio from "cheerio";

import type { ParsedNotificationItem } from "../types";

const RECRUITMENT_KEYWORDS =
  /\b(recruitment|vacancy|vacancies|career|careers|job|jobs|advt|advertisement|notification|notice|apply|application|result|admit\s+card|answer\s+key|interview|document\s+verification|syllabus|exam\s+date)\b/i;
const NOISE_KEYWORDS = /\b(tender|auction|privacy|copyright|feedback|contact|login|sign\s+in|archive|sitemap|screen\s+reader)\b/i;

function absoluteUrl(baseUrl: string, href?: string | null) {
  if (!href) return null;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function cleanTitle(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function parseGenericOfficialNotices(html: string, baseUrl: string): ParsedNotificationItem[] {
  const $ = cheerio.load(html);
  const items: ParsedNotificationItem[] = [];
  const seen = new Set<string>();

  $("a[href]").each((_, node) => {
    const title = cleanTitle($(node).text());
    const href = $(node).attr("href");
    const url = absoluteUrl(baseUrl, href);
    if (!url || title.length < 4) return;

    const haystack = `${title} ${url}`;
    if (!RECRUITMENT_KEYWORDS.test(haystack)) return;
    if (NOISE_KEYWORDS.test(haystack)) return;

    const key = `${title.toLowerCase()}::${url}`;
    if (seen.has(key)) return;
    seen.add(key);

    const isPdf = /\.pdf(?:[/?#]|$)/i.test(url);
    items.push({
      title,
      detailUrl: isPdf ? undefined : url,
      pdfUrl: isPdf ? url : undefined,
    });
  });

  return items.slice(0, 200);
}
