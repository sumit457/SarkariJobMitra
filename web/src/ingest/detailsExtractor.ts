export type ExtractedJobDetails = {
  applyBegin?: Date;
  applyLastDate?: Date;
  feeLastDate?: Date;
  correctionFrom?: Date;
  correctionTo?: Date;
  feeGeneral?: number;
  feeObc?: number;
  feeScSt?: number;
  feePh?: number;
  feeFemale?: number;
  feeNote?: string;
  ageMin?: number;
  ageMax?: number;
  ageAsOn?: Date;
  vacancyTotal?: number;
  shortSummary?: string;
};

const DATE_TOKEN =
  "\\d{1,2}[\\/.\\-]\\d{1,2}[\\/.\\-]\\d{2,4}|\\d{1,2}\\s+[A-Za-z]{3,9}\\s+\\d{4}|[A-Za-z]{3,9}\\s+\\d{1,2},?\\s+\\d{4}";
const DATE_CAPTURE = `(${DATE_TOKEN})`;

function normalizeText(text: string) {
  return text.replace(/\u0000/g, "").replace(/\r/g, "\n").replace(/\t/g, " ").replace(/\n{3,}/g, "\n\n");
}

function parseDateToken(raw?: string | null): Date | undefined {
  if (!raw) return undefined;
  const token = raw.trim().replace(/,$/, "");

  const plain = token.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (plain) {
    const dd = Number(plain[1]);
    const mm = Number(plain[2]);
    let yyyy = Number(plain[3]);
    if (yyyy < 100) yyyy += 2000;
    const dt = new Date(Date.UTC(yyyy, mm - 1, dd));
    if (!Number.isNaN(dt.getTime())) return dt;
  }

  const parsed = new Date(token);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
  }

  return undefined;
}

function firstDateByRegex(text: string, regexes: RegExp[]) {
  for (const regex of regexes) {
    const match = text.match(regex);
    const date = parseDateToken(match?.[1]);
    if (date) return date;
  }
  return undefined;
}

function parseMoneyFromSnippet(snippet: string) {
  const match = snippet.match(/(\d{1,3}(?:,\d{3})*|\d+)/);
  if (match) {
    return Number(match[1].replace(/,/g, ""));
  }
  if (/nil|no fee|free|not required/i.test(snippet)) return 0;
  return undefined;
}

function amountForCategory(text: string, categoryRegex: RegExp) {
  const pattern = new RegExp(`${categoryRegex.source}[^\\n]{0,120}`, "ig");
  const snippets = text.match(pattern) ?? [];
  for (const snippet of snippets) {
    const amount = parseMoneyFromSnippet(snippet);
    if (typeof amount === "number") return amount;
  }
  return undefined;
}

function extractVacancyTotal(text: string) {
  const patterns = [
    /(?:total\s+vacanc(?:y|ies)|total\s+post(?:s)?|vacancy\s+details\s+total)[^\d]{0,20}([\d,]{1,9})/i,
    /([\d,]{4,9})\s+posts?/i,
  ];

  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (!m) continue;
    const value = Number(m[1].replace(/,/g, ""));
    if (Number.isFinite(value) && value > 0) return value;
  }
  return undefined;
}

function extractAge(text: string) {
  const ageRange = text.match(/age\s*limit[^\n]{0,80}?(\d{1,2})\s*(?:-|to)\s*(\d{1,2})/i);
  const min = ageRange ? Number(ageRange[1]) : Number(text.match(/(?:minimum|min)\s*age[^\d]{0,10}(\d{1,2})/i)?.[1]);
  const max = ageRange ? Number(ageRange[2]) : Number(text.match(/(?:maximum|max)\s*age[^\d]{0,10}(\d{1,2})/i)?.[1]);

  return {
    ageMin: Number.isFinite(min) ? min : undefined,
    ageMax: Number.isFinite(max) ? max : undefined,
    ageAsOn: firstDateByRegex(text, [new RegExp(`age\\s+as\\s+on[^\\n]{0,20}${DATE_CAPTURE}`, "i")]),
  };
}

function buildShortSummary(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter((line) => line.length > 20 && !/^page\s+\d+/i.test(line));

  return lines.slice(0, 3).join(" ").slice(0, 360) || undefined;
}

export function extractJobDetailsFromPdfText(_org: string, pdfText: string): ExtractedJobDetails {
  const text = normalizeText(pdfText);

  const applicationRange = text.match(
    new RegExp(
      `(?:application(?:s)?[^\\n]{0,80})?(?:from|between)\\s*(${DATE_TOKEN})\\s*(?:to|and|-|till|upto|up to)\\s*(${DATE_TOKEN})`,
      "i",
    ),
  );
  const rangeBegin = parseDateToken(applicationRange?.[1]);
  const rangeEnd = parseDateToken(applicationRange?.[2]);

  const applyBegin = firstDateByRegex(text, [
    new RegExp(
      `(?:apply\\s+begin|starting\\s+date|registration\\s+start|application\\s+start)[^\\n]{0,40}${DATE_CAPTURE}`,
      "i",
    ),
    new RegExp(`from[^\\n]{0,20}?${DATE_CAPTURE}`, "i"),
  ]);

  const applyLastDate = firstDateByRegex(text, [
    new RegExp(
      `(?:last\\s+date\\s*(?:to\\s*apply)?|closing\\s+date|end\\s+date)[^\\n]{0,40}${DATE_CAPTURE}`,
      "i",
    ),
    new RegExp(`to[^\\n]{0,20}?${DATE_CAPTURE}`, "i"),
  ]);

  const feeLastDate = firstDateByRegex(text, [
    new RegExp(`(?:last\\s+date\\s+for\\s+fee|fee\\s+last\\s+date|fee\\s+payment\\s+last\\s+date)[^\\n]{0,40}${DATE_CAPTURE}`, "i"),
  ]);

  const correctionRange = text.match(
    new RegExp(
      `(?:correction|edit)[^\\n]{0,120}(?<from>${DATE_TOKEN})[^\\n]{0,30}(?:to|till|upto|up to|-)\\s*(?<to>${DATE_TOKEN})`,
      "i",
    ),
  );

  const correctionFrom = parseDateToken(correctionRange?.groups?.from);
  const correctionTo = parseDateToken(correctionRange?.groups?.to);

  const feeGeneral = amountForCategory(text, /\b(?:general|gen|obc|ews)\b/i);
  const feeObc = amountForCategory(text, /\bobc\b/i) ?? feeGeneral;
  const feeScSt = amountForCategory(text, /\b(?:sc|st)\b/i);
  const feePh = amountForCategory(text, /\b(?:ph|pwd|pwbd|disab(?:led|ility)?)\b/i);
  const feeFemale = amountForCategory(text, /\b(?:female|women)\b/i);

  const feeNoteLine =
    text
      .split("\n")
      .map((line) => line.trim().replace(/\s+/g, " "))
      .find((line) => /fee/i.test(line) && line.length > 20)
      ?.slice(0, 220) ?? undefined;

  const { ageMin, ageMax, ageAsOn } = extractAge(text);

  return {
    applyBegin: rangeBegin ?? applyBegin,
    applyLastDate: rangeEnd ?? applyLastDate,
    feeLastDate,
    correctionFrom,
    correctionTo,
    feeGeneral,
    feeObc,
    feeScSt,
    feePh,
    feeFemale,
    feeNote: feeNoteLine,
    ageMin,
    ageMax,
    ageAsOn,
    vacancyTotal: extractVacancyTotal(text),
    shortSummary: buildShortSummary(text),
  };
}
