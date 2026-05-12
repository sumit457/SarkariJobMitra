function cleanWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function detectYear(text: string) {
  const years = (text.match(/\b20\d{2}\b/g) ?? []).map((x) => Number(x));
  const ranges = Array.from(text.matchAll(/\b(20\d{2})\s*[-/]\s*(\d{2})\b/g));
  for (const range of ranges) {
    const base = Number(range[1]);
    const suffix = Number(range[2]);
    if (!Number.isFinite(base) || !Number.isFinite(suffix)) continue;
    const century = Math.floor(base / 100) * 100;
    const candidate = century + suffix;
    if (candidate >= base && candidate <= base + 5) years.push(candidate);
  }
  if (years.length === 0) return undefined;
  return Math.max(...years);
}

function sanitizeRawTitle(titleRaw: string) {
  return cleanWhitespace(
    titleRaw
      .replace(/click\s*here/gi, "")
      .replace(/download/gi, "")
      .replace(/\bnotice\b/gi, "")
      .replace(/\badvertisement\b/gi, "")
      .replace(/\badvt\.?\b/gi, "")
      .replace(/[|:_-]+\s*$/, ""),
  );
}

function looksLikeHeaderNoise(line: string) {
  return (
    /^page\s*\d+/i.test(line) ||
    /\b(phone|email|corporate\s+centre|central\s+recruitment|state\s+bank\s+of\s+india)\b/i.test(line) ||
    /^(s\.?\s*no\.?|sr\.?\s*no\.?)\b/i.test(line)
  );
}

function scoreHeading(line: string) {
  let score = 0;
  if (line.length >= 12 && line.length <= 180) score += 1;
  if (/\b(recruitment|engagement|examination|exam|vacancy|post|officer|assistant|constable|cadre)\b/i.test(line)) score += 4;
  if (/\b(apply|registration|extended|corrigendum|notification|advt|advertisement\s+no)\b/i.test(line)) score -= 2;
  if (looksLikeHeaderNoise(line)) score -= 4;
  return score;
}

function firstHeadingFromPdf(pdfText: string) {
  const lines = pdfText
    .split("\n")
    .map((line) => cleanWhitespace(line))
    .filter((line) => line.length > 0)
    .slice(0, 80);

  let best = "";
  let bestScore = -999;
  for (const line of lines) {
    const score = scoreHeading(line);
    if (score > bestScore) {
      best = line;
      bestScore = score;
    }
  }

  return bestScore >= 1 ? best : lines[0];
}

function stripBracketMeta(title: string) {
  return title
    .replace(/\((?=[^)]*(?:apply|online|registration|extended|corrigendum|advt|advertisement|crpd\/|from\s+\d{1,2}[./-]|to\s+\d{1,2}[./-]))[^)]*\)/gi, "")
    .replace(/\((?:new|updated)\)/gi, "");
}

function stripTrailingMeta(title: string) {
  return title
    .replace(/\b(?:advertisement|advt)\s*no\.?\s*[:\-]?\s*[a-z0-9\/.-]+/gi, "")
    .replace(/\b(?:online\s+registration|apply\s+online|online\s+application)[^.,;)]*/gi, "")
    .replace(/\b(?:has\s+been\s+extended|extended\s+till)[^.,;)]*/gi, "")
    .replace(/[|:_-]+\s*$/, "")
    .replace(/[.,;:]\s*$/, "");
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function normalizeAcronyms(value: string) {
  return value
    .replace(/\bSbi\b/g, "SBI")
    .replace(/\bSsc\b/g, "SSC")
    .replace(/\bUpsc\b/g, "UPSC")
    .replace(/\bGds\b/g, "GDS")
    .replace(/\bCgl\b/g, "CGL")
    .replace(/\bChsl\b/g, "CHSL")
    .replace(/\bMts\b/g, "MTS")
    .replace(/\bCpo\b/g, "CPO")
    .replace(/\bJe\b/g, "JE");
}

function isLikelyJobName(value?: string | null) {
  const text = cleanWhitespace(value ?? "");
  if (text.length < 6 || text.length > 180) return false;
  if (/^(to|for|which|that|whose)\b/i.test(text)) return false;
  if (/\b(?:subject\s+to|with\s+effect|as\s+per|to\s+which|hereby|thereof)\b/i.test(text)) return false;
  if (!/[A-Za-z]/.test(text)) return false;
  if (/^\d+[\d\s/-]*$/.test(text)) return false;
  return true;
}

function buildGenericName(params: {
  organization: string;
  titleRaw: string;
  sourceText: string;
  preferredTitle?: string;
}) {
  const preferredTitle = isLikelyJobName(params.preferredTitle) ? cleanWhitespace(params.preferredTitle ?? "") : undefined;
  const year = detectYear(preferredTitle ?? "") ?? detectYear(params.sourceText) ?? detectYear(params.titleRaw);
  const baseRaw = preferredTitle || params.titleRaw || params.sourceText;

  const cleaned = cleanWhitespace(
    stripTrailingMeta(
      stripBracketMeta(
        sanitizeRawTitle(baseRaw)
          .replace(/^\s*(?:engagement|recruitment)\s+of\s+/i, "")
          .replace(/^\s*for\s+the\s+post\s+of\s+/i, "")
          .replace(/\s{2,}/g, " "),
      ),
    ),
  );

  const compact = cleaned || sanitizeRawTitle(params.sourceText) || `${params.organization} Recruitment`;
  const cased = /[A-Z]{6,}/.test(compact) ? toTitleCase(compact) : compact;
  const hasYear = /\b20\d{2}\b/.test(cased);
  const withYear = !hasYear && year ? `${cased} ${year}` : cased;
  const finalName = normalizeAcronyms(withYear);

  return finalName || `${params.organization}${year ? ` Recruitment ${year}` : " Recruitment"}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 140);
}

export function deriveExamName(params: {
  organization: string;
  titleRaw: string;
  pdfText?: string | null;
  preferredTitle?: string | null;
}) {
  const titleRaw = cleanWhitespace(params.titleRaw);
  const pdfText = params.pdfText ? cleanWhitespace(params.pdfText) : "";
  const heading = pdfText ? firstHeadingFromPdf(pdfText) : undefined;

  const sourceText = heading || pdfText || titleRaw;
  const examName = buildGenericName({
    organization: params.organization,
    titleRaw,
    sourceText,
    preferredTitle: params.preferredTitle ?? undefined,
  });

  const cleanExamName = cleanWhitespace(examName);
  return {
    examName: cleanExamName,
    slugBase: slugify(cleanExamName) || "job",
  };
}
