import { z } from "zod";

import type { ExtractedJobDetails, ExtractionSourceBasis, LlmExtractionAttempt } from "./extractionTypes";

const LLM_EXTRACTOR_ENABLED = process.env.LLM_EXTRACTOR_ENABLED === "true";
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434").replace(/\/+$/, "");
const LLM_EXTRACTOR_MODEL = process.env.LLM_EXTRACTOR_MODEL ?? "qwen2.5:7b";
const LLM_EXTRACTOR_TIMEOUT_MS = Number(process.env.LLM_EXTRACTOR_TIMEOUT_MS ?? "120000");
const LLM_EXTRACTOR_MAX_CHARS = Number(process.env.LLM_EXTRACTOR_MAX_CHARS ?? "24000");
const LLM_PROMPT_VERSION = "govjobs_notice_extract_v2";

export function isLlmExtractorEnabled() {
  return LLM_EXTRACTOR_ENABLED;
}

export function llmExtractorModel() {
  return LLM_EXTRACTOR_MODEL;
}

export function llmExtractorPromptVersion() {
  return LLM_PROMPT_VERSION;
}

const LlmJsonSchema = z
  .object({
    docType: z.string().nullable().optional(),
    isNewJob: z.boolean().nullable().optional(),
    canonicalTitle: z.string().nullable().optional(),
    shortTitle: z.string().nullable().optional(),
    positionName: z.string().nullable().optional(),
    department: z.string().nullable().optional(),
    placeOfPosting: z.string().nullable().optional(),
    qualification: z.string().nullable().optional(),
    payScale: z.string().nullable().optional(),
    examCentres: z.string().nullable().optional(),
    shortSummary: z.string().nullable().optional(),
    applyBegin: z.string().nullable().optional(),
    applyLastDate: z.string().nullable().optional(),
    examDate: z.string().nullable().optional(),
    feeLastDate: z.string().nullable().optional(),
    correctionFrom: z.string().nullable().optional(),
    correctionTo: z.string().nullable().optional(),
    ageAsOn: z.string().nullable().optional(),
    feeGeneral: z.union([z.number(), z.string()]).nullable().optional(),
    feeObc: z.union([z.number(), z.string()]).nullable().optional(),
    feeScSt: z.union([z.number(), z.string()]).nullable().optional(),
    feePh: z.union([z.number(), z.string()]).nullable().optional(),
    feeFemale: z.union([z.number(), z.string()]).nullable().optional(),
    ageMin: z.union([z.number(), z.string()]).nullable().optional(),
    ageMax: z.union([z.number(), z.string()]).nullable().optional(),
    vacancyTotal: z.union([z.number(), z.string()]).nullable().optional(),
    officialNotificationUrl: z.string().nullable().optional(),
    officialApplyUrl: z.string().nullable().optional(),
    relatedJobHint: z.string().nullable().optional(),
    confidence: z.union([z.number(), z.string()]).nullable().optional(),
    categoryVacancy: z
      .object({
        general: z.union([z.number(), z.string()]).nullable().optional(),
        obc: z.union([z.number(), z.string()]).nullable().optional(),
        sc: z.union([z.number(), z.string()]).nullable().optional(),
        st: z.union([z.number(), z.string()]).nullable().optional(),
        ews: z.union([z.number(), z.string()]).nullable().optional(),
        total: z.union([z.number(), z.string()]).nullable().optional(),
      })
      .nullable()
      .optional(),
  })
  .passthrough();

type ParsedLlmJson = z.infer<typeof LlmJsonSchema>;

function cleanText(value?: string | null) {
  if (!value) return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^(?:nil|na|n\/a|none|not\s+mentioned|not\s+available)$/i.test(trimmed)) return 0;
  const numeric = trimmed.replace(/[^\d.-]/g, "");
  if (!numeric) return undefined;
  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toDate(value: unknown): Date | undefined {
  if (typeof value !== "string") return undefined;
  const raw = value.trim();
  if (!raw) return undefined;

  const ddmmyyyy = raw.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (ddmmyyyy) {
    const dd = Number(ddmmyyyy[1]);
    const mm = Number(ddmmyyyy[2]);
    let yyyy = Number(ddmmyyyy[3]);
    if (yyyy < 100) yyyy += 2000;
    const dt = new Date(Date.UTC(yyyy, mm - 1, dd));
    if (!Number.isNaN(dt.getTime())) return dt;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
  }

  return undefined;
}

function normalizeBoundedNumber(value: number | undefined, min: number, max: number) {
  if (typeof value !== "number") return undefined;
  if (!Number.isFinite(value)) return undefined;
  if (value < min || value > max) return undefined;
  return value;
}

function pickJsonObject(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    // Try extracting first JSON object span if model wraps response text.
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return null;

  const candidate = trimmed.slice(start, end + 1);
  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    return null;
  }
}

function hasMeaningfulFields(details: ExtractedJobDetails) {
  const keys: Array<keyof ExtractedJobDetails> = [
    "docType",
    "canonicalTitle",
    "shortTitle",
    "positionName",
    "department",
    "placeOfPosting",
    "qualification",
    "payScale",
    "examCentres",
    "applyBegin",
    "applyLastDate",
    "examDate",
    "feeLastDate",
    "correctionFrom",
    "correctionTo",
    "ageMin",
    "ageMax",
    "ageAsOn",
    "feeGeneral",
    "feeObc",
    "feeScSt",
    "feePh",
    "feeFemale",
    "vacancyTotal",
    "officialNotificationUrl",
    "officialApplyUrl",
    "relatedJobHint",
    "confidence",
    "categoryVacancy",
    "shortSummary",
  ];

  return keys.some((key) => details[key] !== undefined);
}

export function parseLlmDetailsJson(raw: string): ExtractedJobDetails | null {
  const parsedObj = pickJsonObject(raw);
  if (!parsedObj || typeof parsedObj !== "object") return null;

  const parsed = LlmJsonSchema.safeParse(parsedObj);
  if (!parsed.success) return null;

  const payload: ParsedLlmJson = parsed.data;
  const ageMin = normalizeBoundedNumber(toNumber(payload.ageMin), 14, 80);
  const ageMax = normalizeBoundedNumber(toNumber(payload.ageMax), 14, 100);
  const vacancyTotal = normalizeBoundedNumber(toNumber(payload.vacancyTotal), 1, 1_000_000);
  const feeGeneral = normalizeBoundedNumber(toNumber(payload.feeGeneral), 0, 1_000_000);
  const feeObc = normalizeBoundedNumber(toNumber(payload.feeObc), 0, 1_000_000);
  const feeScSt = normalizeBoundedNumber(toNumber(payload.feeScSt), 0, 1_000_000);
  const feePh = normalizeBoundedNumber(toNumber(payload.feePh), 0, 1_000_000);
  const feeFemale = normalizeBoundedNumber(toNumber(payload.feeFemale), 0, 1_000_000);

  const categoryVacancyRaw = payload.categoryVacancy;
  const categoryVacancy = categoryVacancyRaw
    ? {
        general: normalizeBoundedNumber(toNumber(categoryVacancyRaw.general), 0, 1_000_000),
        obc: normalizeBoundedNumber(toNumber(categoryVacancyRaw.obc), 0, 1_000_000),
        sc: normalizeBoundedNumber(toNumber(categoryVacancyRaw.sc), 0, 1_000_000),
        st: normalizeBoundedNumber(toNumber(categoryVacancyRaw.st), 0, 1_000_000),
        ews: normalizeBoundedNumber(toNumber(categoryVacancyRaw.ews), 0, 1_000_000),
        total: normalizeBoundedNumber(toNumber(categoryVacancyRaw.total), 0, 1_000_000),
      }
    : undefined;
  const hasCategoryVacancy = categoryVacancy
    ? Object.values(categoryVacancy).some((value) => typeof value === "number")
    : false;

  const details: ExtractedJobDetails = {
    docType: cleanText(payload.docType)?.toLowerCase() as ExtractedJobDetails["docType"],
    isNewJob: typeof payload.isNewJob === "boolean" ? payload.isNewJob : undefined,
    canonicalTitle: cleanText(payload.canonicalTitle),
    shortTitle: cleanText(payload.shortTitle),
    positionName: cleanText(payload.positionName),
    department: cleanText(payload.department),
    placeOfPosting: cleanText(payload.placeOfPosting),
    qualification: cleanText(payload.qualification),
    payScale: cleanText(payload.payScale),
    examCentres: cleanText(payload.examCentres),
    shortSummary: cleanText(payload.shortSummary),
    applyBegin: toDate(payload.applyBegin),
    applyLastDate: toDate(payload.applyLastDate),
    examDate: toDate(payload.examDate),
    feeLastDate: toDate(payload.feeLastDate),
    correctionFrom: toDate(payload.correctionFrom),
    correctionTo: toDate(payload.correctionTo),
    ageAsOn: toDate(payload.ageAsOn),
    feeGeneral,
    feeObc,
    feeScSt,
    feePh,
    feeFemale,
    ageMin,
    ageMax,
    vacancyTotal,
    officialNotificationUrl: cleanText(payload.officialNotificationUrl),
    officialApplyUrl: cleanText(payload.officialApplyUrl),
    relatedJobHint: cleanText(payload.relatedJobHint),
    confidence: normalizeBoundedNumber(toNumber(payload.confidence), 0, 1),
    categoryVacancy: hasCategoryVacancy ? categoryVacancy : undefined,
  };

  return hasMeaningfulFields(details) ? details : null;
}

function buildPrompt(params: {
  organization: string;
  titleRaw: string;
  listingText?: string | null;
  detailPageText?: string | null;
  pdfText: string;
  regexDetails?: Record<string, unknown> | null;
  detailUrl?: string | null;
  notificationPdfUrl?: string | null;
  applyUrl?: string | null;
  officialPageUrl?: string | null;
}) {
  const context = {
    organization: params.organization,
    listingTitle: params.titleRaw,
    listingText: params.listingText?.slice(0, 2000) ?? null,
    detailPageText: params.detailPageText?.slice(0, 4000) ?? null,
    pdfText: params.pdfText.slice(0, Math.max(2000, LLM_EXTRACTOR_MAX_CHARS)),
    regexExtracted: params.regexDetails ?? null,
    urls: {
      detailUrl: params.detailUrl ?? null,
      notificationPdfUrl: params.notificationPdfUrl ?? null,
      applyUrl: params.applyUrl ?? null,
      officialPageUrl: params.officialPageUrl ?? null,
    },
  };

  return `You extract structured data from Indian government or public-sector job notices.

Your job is information extraction only. You are not allowed to generate, infer, repair, estimate, or assume unsupported facts.

Rules:
- Return ONLY one JSON object.
- If unknown, use null.
- Do not invent values.
- Dates in YYYY-MM-DD.
- confidence must be between 0 and 1.
- categoryVacancy keys must be: general, obc, sc, st, ews, total.
- Prefer dates stated inside the notice body over dates hinted by the listing title.
- If the notice contains an explicit application window like "ONLINE REGISTRATION ... FROM X TO Y", use that as applyBegin/applyLastDate.
- Do not treat words like "extended till" in the listing title as the application start date.
- Only return fee fields when the notice clearly mentions an application fee.
- Use examDate only for the actual date of examination / test, not the notification date.
- docType must be one of: recruitment, result, admit_card, answer_key, corrigendum, extension_notice, not_relevant.
- Set isNewJob=true only when this is clearly a fresh recruitment notice for a job/exam opening.
- For result/admit/answer_key/corrigendum/extension_notice/not_relevant, isNewJob should usually be false.
- officialNotificationUrl and officialApplyUrl must be actual official URLs from the provided context, not invented guesses.
- relatedJobHint should be a short factual title hint only if the notice clearly refers to an existing recruitment/exam; otherwise null.
- canonicalTitle should be concise and factual.
- shortTitle should be an even shorter factual title, not a slogan.
- If evidence is weak or contradictory, keep fields null and reduce confidence.

JSON schema:
{
  "docType": "recruitment"|"result"|"admit_card"|"answer_key"|"corrigendum"|"extension_notice"|"not_relevant"|null,
  "isNewJob": boolean|null,
  "canonicalTitle": string|null,
  "shortTitle": string|null,
  "positionName": string|null,
  "department": string|null,
  "placeOfPosting": string|null,
  "qualification": string|null,
  "payScale": string|null,
  "examCentres": string|null,
  "shortSummary": string|null,
  "applyBegin": "YYYY-MM-DD"|null,
  "applyLastDate": "YYYY-MM-DD"|null,
  "examDate": "YYYY-MM-DD"|null,
  "feeLastDate": "YYYY-MM-DD"|null,
  "correctionFrom": "YYYY-MM-DD"|null,
  "correctionTo": "YYYY-MM-DD"|null,
  "ageAsOn": "YYYY-MM-DD"|null,
  "feeGeneral": number|null,
  "feeObc": number|null,
  "feeScSt": number|null,
  "feePh": number|null,
  "feeFemale": number|null,
  "ageMin": number|null,
  "ageMax": number|null,
  "vacancyTotal": number|null,
  "officialNotificationUrl": string|null,
  "officialApplyUrl": string|null,
  "relatedJobHint": string|null,
  "confidence": number|null,
  "categoryVacancy": {
    "general": number|null,
    "obc": number|null,
    "sc": number|null,
    "st": number|null,
    "ews": number|null,
    "total": number|null
  }|null
}

Input evidence JSON:
${JSON.stringify(context, null, 2)}`;
}

export async function extractJobDetailsFromPdfTextWithLlm(params: {
  organization: string;
  titleRaw: string;
  listingText?: string | null;
  detailPageText?: string | null;
  pdfText?: string | null;
  regexDetails?: Record<string, unknown> | null;
  detailUrl?: string | null;
  notificationPdfUrl?: string | null;
  applyUrl?: string | null;
  officialPageUrl?: string | null;
  basis: ExtractionSourceBasis;
}): Promise<LlmExtractionAttempt | null> {
  if (!LLM_EXTRACTOR_ENABLED) return null;
  const pdfText = params.pdfText?.trim() ?? "";
  const detailPageText = params.detailPageText?.trim() ?? "";
  const listingText = params.listingText?.trim() ?? "";
  if (!pdfText && !detailPageText && !listingText) return null;

  const extractedAt = new Date();

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: LLM_EXTRACTOR_MODEL,
        stream: false,
        format: "json",
        options: {
          temperature: 0,
        },
        prompt: buildPrompt({
          organization: params.organization,
          titleRaw: params.titleRaw,
          listingText,
          detailPageText,
          pdfText,
          regexDetails: params.regexDetails ?? null,
          detailUrl: params.detailUrl,
          notificationPdfUrl: params.notificationPdfUrl,
          applyUrl: params.applyUrl,
          officialPageUrl: params.officialPageUrl,
        }),
      }),
      signal: AbortSignal.timeout(LLM_EXTRACTOR_TIMEOUT_MS),
    });

    if (!response.ok) {
      return {
        details: null,
        rawResponse: null,
        model: LLM_EXTRACTOR_MODEL,
        promptVersion: LLM_PROMPT_VERSION,
        basis: params.basis,
        extractedAt,
        error: `http_${response.status}`,
      };
    }

    const payload = (await response.json()) as { response?: string };
    if (!payload?.response) {
      return {
        details: null,
        rawResponse: null,
        model: LLM_EXTRACTOR_MODEL,
        promptVersion: LLM_PROMPT_VERSION,
        basis: params.basis,
        extractedAt,
        error: "empty_response",
      };
    }

    return {
      details: parseLlmDetailsJson(payload.response),
      rawResponse: payload.response,
      model: LLM_EXTRACTOR_MODEL,
      promptVersion: LLM_PROMPT_VERSION,
      basis: params.basis,
      extractedAt,
    };
  } catch (error) {
    return {
      details: null,
      rawResponse: null,
      model: LLM_EXTRACTOR_MODEL,
      promptVersion: LLM_PROMPT_VERSION,
      basis: params.basis,
      extractedAt,
      error: String((error as Error)?.message ?? error),
    };
  }
}
