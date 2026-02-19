function cleanWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function detectYear(text: string) {
  const years = (text.match(/\b20\d{2}\b/g) ?? []).map((x) => Number(x));
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
      .replace(/[|:_-]+\s*$/, ""),
  );
}

function firstHeadingFromPdf(pdfText: string) {
  const lines = pdfText
    .split("\n")
    .map((line) => cleanWhitespace(line))
    .filter((line) => line.length >= 12 && line.length <= 180)
    .filter((line) => !/^page\s*\d+/i.test(line));

  return lines[0];
}

function deriveSscName(sourceText: string, fallback: string) {
  const year = detectYear(sourceText) ?? detectYear(fallback);

  const map: Array<{ pattern: RegExp; name: string }> = [
    { pattern: /combined\s+graduate\s+level|\bcgl\b/i, name: "SSC CGL" },
    { pattern: /combined\s+higher\s+secondary|\bchsl\b/i, name: "SSC CHSL" },
    { pattern: /multi[-\s]*tasking|\bmts\b/i, name: "SSC MTS" },
    { pattern: /sub[-\s]*inspector|\bcpo\b/i, name: "SSC CPO" },
    { pattern: /junior\s+engineer|\bje\b/i, name: "SSC JE" },
    { pattern: /constable\s*\(gd\)|\bgd\b/i, name: "SSC GD" },
    { pattern: /stenographer/i, name: "SSC Stenographer" },
    { pattern: /selection\s+post/i, name: "SSC Selection Post" },
  ];

  const matched = map.find((entry) => entry.pattern.test(sourceText) || entry.pattern.test(fallback));
  if (matched) return year ? `${matched.name} ${year}` : matched.name;

  const cleaned = sanitizeRawTitle(fallback);
  return cleaned || "SSC Recruitment";
}

function deriveIndiaPostName(sourceText: string, fallback: string) {
  const year = detectYear(sourceText) ?? detectYear(fallback);

  if (/gramin\s+dak\s+sevak|\bgds\b|online\s+engagement/i.test(sourceText) || /\bgds\b/i.test(fallback)) {
    return year ? `India Post GDS Recruitment ${year}` : "India Post GDS Recruitment";
  }

  const cleaned = sanitizeRawTitle(fallback);
  return cleaned || "India Post Recruitment";
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
}) {
  const titleRaw = cleanWhitespace(params.titleRaw);
  const pdfText = params.pdfText ? cleanWhitespace(params.pdfText) : "";
  const heading = pdfText ? firstHeadingFromPdf(pdfText) : undefined;

  const sourceText = heading || pdfText || titleRaw;

  let examName: string;
  if (/india\s*post/i.test(params.organization)) {
    examName = deriveIndiaPostName(sourceText, titleRaw);
  } else if (/ssc/i.test(params.organization)) {
    examName = deriveSscName(sourceText, titleRaw);
  } else {
    examName = sanitizeRawTitle(heading || titleRaw) || titleRaw;
  }

  const cleanExamName = cleanWhitespace(examName);
  return {
    examName: cleanExamName,
    slugBase: slugify(cleanExamName) || "job",
  };
}
