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

export function parseIndiaPostGds(html: string, baseUrl: string) {
  const $ = cheerio.load(html);

  let applyUrl: string | undefined;
  $("a[href]").each((_, a) => {
    const text = $(a).text().trim().replace(/\s+/g, " ");
    const href = $(a).attr("href");
    const url = abs(baseUrl, href);
    if (!url) return;

    if (/register|apply|login/i.test(text) && /gds|cept|indiapost/i.test(url)) {
      applyUrl = url;
    }
  });

  const titleFromHeading =
    $("h1")
      .first()
      .text()
      .trim()
      .replace(/\s+/g, " ") || "India Post GDS Notification";

  const wholeText = $("body").text().replace(/\s+/g, " ");
  const numberMatch = wholeText.match(/Notification Number\s*:\s*([A-Za-z0-9./-]+(?:\s*\([^)]*\))?)/i);
  const notificationNumber = numberMatch?.[1]?.trim();

  const title = notificationNumber ? `${titleFromHeading} (${notificationNumber})` : titleFromHeading;

  // The page may expose downloadable PDFs via JS handlers, not direct anchors.
  // We still emit a current cycle notification item with apply URL and title.
  const items: ParsedNotificationItem[] = [{
    title,
    applyUrl,
  }];

  return items;
}
