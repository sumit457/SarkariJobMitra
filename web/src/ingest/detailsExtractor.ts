import type { ExtractedJobDetails } from "./extractionTypes";

export type { ExtractedJobDetails } from "./extractionTypes";

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

function buildFeeSearchArea(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const selected = new Set<number>();

  lines.forEach((line, index) => {
    if (!/\bfee\b/i.test(line)) return;

    for (let offset = 0; offset <= 2; offset += 1) {
      const candidateIndex = index + offset;
      const candidate = lines[candidateIndex];
      if (!candidate) break;
      selected.add(candidateIndex);
    }
  });

  return [...selected]
    .sort((a, b) => a - b)
    .map((index) => lines[index])
    .join("\n");
}

function amountForCategory(text: string, categoryRegex: RegExp) {
  const feeArea = buildFeeSearchArea(text);
  if (!feeArea) return undefined;

  const pattern = new RegExp(`${categoryRegex.source}[^\\n]{0,120}`, "ig");
  const snippets = feeArea.match(pattern) ?? [];
  for (const snippet of snippets) {
    const amount = parseMoneyFromSnippet(snippet);
    if (typeof amount === "number") return amount;
  }
  return undefined;
}

function parseIntToken(raw?: string | null) {
  if (!raw) return undefined;
  if (/--|nil|na|n\/a/i.test(raw)) return 0;
  const cleaned = raw.replace(/[^\d]/g, "");
  if (!cleaned) return undefined;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : undefined;
}

function cleanInlineText(raw?: string | null) {
  if (!raw) return undefined;
  const value = raw
    .replace(/\s+/g, " ")
    .replace(/^[:\-.\s]+/, "")
    .trim();
  return value.length > 0 ? value : undefined;
}

function extractLineValue(text: string, regexes: RegExp[]) {
  for (const regex of regexes) {
    const match = text.match(regex);
    const value = cleanInlineText(match?.[1]);
    if (value) return value;
  }
  return undefined;
}

function sanitizeStructuredValue(
  value: string | undefined,
  options?: {
    maxLength?: number;
    reject?: RegExp[];
    require?: RegExp;
  },
) {
  if (!value) return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return undefined;
  if (typeof options?.maxLength === "number" && cleaned.length > options.maxLength) return undefined;

  const rejectPatterns = options?.reject ?? [
    /\b(?:https?:\/\/|www\.)/i,
    /\b(?:click here|home page|download notification|see detailed advertisement|candidates? are requested|candidate are requested)\b/i,
    /\b(?:advertisement no|page \d+ of \d+)\b/i,
  ];

  if (rejectPatterns.some((pattern) => pattern.test(cleaned))) return undefined;
  if (options?.require && !options.require.test(cleaned)) return undefined;
  return cleaned;
}

function sanitizePayScale(value: string | undefined) {
  const cleaned = sanitizeStructuredValue(value, {
    maxLength: 220,
    require: /(?:\d|rs\.?|₹|\binr\b|\bctc\b|\bpay\b|\blevel\b|\bremuneration\b|\bsalary\b)/i,
  });
  if (!cleaned) return undefined;
  if (
    /\b(?:upper range|lower range|bifurcation|contract period)\b/i.test(cleaned) &&
    !/(?:\d|rs\.?|₹|\binr\b)/i.test(cleaned)
  ) {
    return undefined;
  }
  return cleaned;
}

function extractCategoryVacancy(text: string) {
  // Common SBI/UPSC table text after PDF extraction:
  // "Total 1 1 3 1 3 9 1" in SC ST OBC EWS UR Total order.
  const totalLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^total\b/i.test(line));
  if (totalLines.length > 0) {
    let best:
      | {
          general?: number;
          obc?: number;
          sc?: number;
          st?: number;
          ews?: number;
          total?: number;
        }
      | undefined;

    for (const line of totalLines) {
      const tokens = line.match(/(?:\d+|--)/g) ?? [];
      if (tokens.length < 5) continue;

      // Typical order: SC ST OBC EWS UR Total [PwBD]
      // Some extracts omit EWS and become: SC ST OBC UR Total.
      const [scTok, stTok, obcTok, fourthTok, fifthTok, sixthTok] = tokens;
      const sc = parseIntToken(scTok);
      const st = parseIntToken(stTok);
      const obc = parseIntToken(obcTok);
      const hasEws = tokens.length >= 6;
      const ews = parseIntToken(hasEws ? fourthTok : undefined);
      const general = parseIntToken(hasEws ? fifthTok : fourthTok);
      const total = parseIntToken(hasEws ? sixthTok : fifthTok);
      const sum = [sc, st, obc, ews, general].filter((value): value is number => typeof value === "number").reduce((a, b) => a + b, 0);
      const candidate = { general, obc, sc, st, ews, total };

      if (!best) {
        best = candidate;
        continue;
      }

      const bestTotal = best.total ?? 0;
      const candidateTotal = total ?? 0;
      const candidateLooksValid = candidateTotal > 0 && sum > 0 && Math.abs(sum - candidateTotal) <= 2;
      const bestLooksValid =
        (best.total ?? 0) > 0 &&
        [best.sc, best.st, best.obc, best.ews, best.general]
          .filter((value): value is number => typeof value === "number")
          .reduce((a, b) => a + b, 0) > 0;

      if ((candidateLooksValid && !bestLooksValid) || candidateTotal > bestTotal) {
        best = candidate;
      }
    }

    if (best) return best;
  }

  const categoryBlock = text.match(
    /\b(?:category\s*wise\s*vacanc(?:y|ies)|vacanc(?:y|ies))\b[\s\S]{0,420}\b(?:sc|st|obc|ews|ur|general)\b[\s\S]{0,420}/i,
  )?.[0];
  if (!categoryBlock) return undefined;

  const sc = parseIntToken(categoryBlock.match(/\bSC\b[^\d]{0,20}(\d+|--)/i)?.[1]);
  const st = parseIntToken(categoryBlock.match(/\bST\b[^\d]{0,20}(\d+|--)/i)?.[1]);
  const obc = parseIntToken(categoryBlock.match(/\bOBC\b[^\d]{0,20}(\d+|--)/i)?.[1]);
  const ews = parseIntToken(categoryBlock.match(/\bEWS\b[^\d]{0,20}(\d+|--)/i)?.[1]);
  const general =
    parseIntToken(categoryBlock.match(/\b(?:UR|General)\b[^\d]{0,20}(\d+|--)/i)?.[1]) ??
    parseIntToken(categoryBlock.match(/\bGEN\b[^\d]{0,20}(\d+|--)/i)?.[1]);
  const total = parseIntToken(categoryBlock.match(/\bTotal\b[^\d]{0,20}(\d+|--)/i)?.[1]);

  if ([sc, st, obc, ews, general, total].some((value) => typeof value === "number")) {
    return { general, obc, sc, st, ews, total };
  }
  return undefined;
}

function extractVacancyTotal(text: string, categoryVacancy?: ExtractedJobDetails["categoryVacancy"]) {
  if (typeof categoryVacancy?.total === "number" && categoryVacancy.total > 0) return categoryVacancy.total;

  const categorySum = [categoryVacancy?.general, categoryVacancy?.obc, categoryVacancy?.sc, categoryVacancy?.st, categoryVacancy?.ews]
    .filter((value): value is number => typeof value === "number")
    .reduce((sum, value) => sum + value, 0);
  if (categorySum > 0) return categorySum;

  const patterns = [
    /(?:total\s+vacanc(?:y|ies)|total\s+post(?:s)?|vacancy\s+details\s+total)[^\d]{0,20}([\d,]{1,9})/i,
    /\bno\.\s*of\s*vacanc(?:y|ies)\b[^\n\r]{0,140}\btotal\b[^\d]{0,20}([\d,]{1,9})/i,
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

  const examDate = firstDateByRegex(text, [
    new RegExp(
      `(?:date\\s+of\\s+commencement\\s+of\\s+examination|date\\s+of\\s+examination|exam(?:ination)?\\s+date|tentative\\s+exam(?:ination)?\\s+date|written\\s+exam(?:ination)?\\s+(?:date|scheduled)|examination\\s+will\\s+be\\s+held\\s+on)[^\\n]{0,60}?${DATE_CAPTURE}`,
      "i",
    ),
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
  const categoryVacancy = extractCategoryVacancy(text);

  const positionName = extractLineValue(text, [
    /(?:^|\n)\s*(?:\d+\.\s*)?(?:name\s+of\s+(?:the\s+)?position)\s*[:\-]?\s*([^\n\r]{3,200})/i,
    /(?:^|\n)\s*(?:\d+\.\s*)?(?:name\s+of\s+(?:the\s+)?post(?:\(s\))?)\s*[:\-]?\s*([^\n\r]{3,200})/i,
  ]);
  const department = extractLineValue(text, [/(?:^|\n)\s*(?:\d+\.\s*)?\bdepartment\b\s*[:\-]?\s*([^\n\r]{3,200})/i]);
  const placeOfPosting = extractLineValue(text, [
    /(?:^|\n)\s*(?:\d+\.\s*)?(?:place\s+of\s+posting|suggested\s+place\s+of\s+posting)\s*[:\-]?\s*([^\n\r]{3,220})/i,
  ]);
  const qualification = extractLineValue(text, [
    /\beducation\s*[:\-]\s*([^\n\r]{8,260})/i,
    /(?:educational\s+qualification(?:\s*\/\s*experience\s+required)?)[^\n\r]{0,20}[:\-]\s*([^\n\r]{8,260})/i,
    /(?:essential\s+qualification|qualification\s+required)\s*[:\-]?\s*([^\n\r]{8,260})/i,
  ]);
  const payScale = extractLineValue(text, [
    /(?:monthly\s+remuneration(?:\s+payable)?|annual\s+ctc(?:\s+range)?|pay\s+scale|pay\s+level)\s*[:\-]?\s*([^\n\r]{5,220})/i,
  ]);
  const examCentres = extractLineValue(text, [/(?:exam(?:ination)?\s+cent(?:re|er)s?)\s*[:\-]?\s*([^\n\r]{5,260})/i]);

  return {
    applyBegin: rangeBegin ?? applyBegin,
    applyLastDate: rangeEnd ?? applyLastDate,
    examDate,
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
    vacancyTotal: extractVacancyTotal(text, categoryVacancy),
    positionName: sanitizeStructuredValue(positionName, { maxLength: 200 }),
    department: sanitizeStructuredValue(department, { maxLength: 200 }),
    placeOfPosting: sanitizeStructuredValue(placeOfPosting, { maxLength: 220 }),
    qualification: sanitizeStructuredValue(qualification, { maxLength: 260 }),
    payScale: sanitizePayScale(payScale),
    examCentres: sanitizeStructuredValue(examCentres, { maxLength: 260 }),
    categoryVacancy,
    shortSummary: buildShortSummary(text),
  };
}
