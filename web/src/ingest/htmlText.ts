import * as cheerio from "cheerio";

export function extractTextSnippetFromHtml(html: string, maxChars = 4000) {
  const $ = cheerio.load(html);
  const text = $("body").text().replace(/\s+/g, " ").trim();
  return text.slice(0, maxChars) || undefined;
}
