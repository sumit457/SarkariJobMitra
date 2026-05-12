import { isOfficialUrl, normalizeHttpUrl } from "./officialDomains";
import { classifyDocTypeFromText, isPublicJobDocType, isRecruitmentDocType } from "./noticeClassifier";
import type { ExtractedJobDetails, JobDocType } from "./extractionTypes";

function clampConfidence(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Number(value.toFixed(3));
}

function sanitizePlainText(
  value?: string | null,
  options?: {
    maxLength?: number;
    reject?: RegExp[];
  },
) {
  if (!value) return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return undefined;
  if (typeof options?.maxLength === "number" && cleaned.length > options.maxLength) return undefined;

  const rejectPatterns = options?.reject ?? [
    /\b(?:https?:\/\/|www\.)/i,
    /\b(?:click here|download here|see detailed advertisement|candidate are requested|candidates are requested)\b/i,
  ];
  if (rejectPatterns.some((pattern) => pattern.test(cleaned))) return undefined;
  return cleaned;
}

function sanitizeJobUrl(url?: string | null) {
  if (!url) return undefined;
  const normalized = normalizeHttpUrl(url);
  if (!normalized) return undefined;
  if (!isOfficialUrl(normalized)) return undefined;
  return normalized;
}

function normalizeDocType(docType?: string | null): JobDocType | undefined {
  if (!docType) return undefined;
  const normalized = docType.trim().toLowerCase();
  if (normalized === "admit card") return "admit_card";
  if (normalized === "answer key") return "answer_key";
  if (normalized === "extension") return "extension_notice";
  if (normalized === "corrigenda") return "corrigendum";
  if (normalized === "result") return "result";
  if (normalized === "recruitment") return "recruitment";
  if (normalized === "admit_card" || normalized === "answer_key" || normalized === "extension_notice" || normalized === "corrigendum" || normalized === "not_relevant") {
    return normalized;
  }
  return undefined;
}

function dateToIso(value?: Date) {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString() : undefined;
}

function serializeWithDates(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => serializeWithDates(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, nested]) => nested !== undefined)
        .map(([key, nested]) => [key, serializeWithDates(nested)]),
    );
  }
  return value;
}

export function serializeExtractionForStorage(details: ExtractedJobDetails) {
  return serializeWithDates(details) as Record<string, unknown>;
}

export function validateAndSanitizeExtractedDetails(params: {
  details: ExtractedJobDetails;
  titleRaw: string;
  detailPageText?: string;
  pdfText?: string;
}) {
  const warnings = [...(params.details.validationWarnings ?? [])];
  const titleDocType = classifyDocTypeFromText(params.titleRaw, params.detailPageText, params.pdfText);
  let docType = normalizeDocType(params.details.docType) ?? titleDocType;

  if (titleDocType && docType && titleDocType !== docType) {
    if (!isPublicJobDocType(titleDocType) || docType === "recruitment") {
      warnings.push(`doc_type_overridden:${docType}->${titleDocType}`);
      docType = titleDocType;
    }
  }

  let applyBegin = params.details.applyBegin;
  let applyLastDate = params.details.applyLastDate;
  if (applyBegin && applyLastDate && applyLastDate.getTime() < applyBegin.getTime()) {
    warnings.push(`invalid_apply_window:${dateToIso(applyBegin)}>${dateToIso(applyLastDate)}`);
    applyBegin = undefined;
    applyLastDate = undefined;
  }

  let correctionFrom = params.details.correctionFrom;
  let correctionTo = params.details.correctionTo;
  if (correctionFrom && correctionTo && correctionTo.getTime() < correctionFrom.getTime()) {
    warnings.push(`invalid_correction_window:${dateToIso(correctionFrom)}>${dateToIso(correctionTo)}`);
    correctionFrom = undefined;
    correctionTo = undefined;
  }

  let ageMin = params.details.ageMin;
  let ageMax = params.details.ageMax;
  if (typeof ageMin === "number" && typeof ageMax === "number" && ageMin > ageMax) {
    warnings.push(`invalid_age_range:${ageMin}>${ageMax}`);
    ageMin = undefined;
    ageMax = undefined;
  }

  let vacancyTotal = params.details.vacancyTotal;
  const categoryVacancy = params.details.categoryVacancy
    ? {
        general: params.details.categoryVacancy.general,
        obc: params.details.categoryVacancy.obc,
        sc: params.details.categoryVacancy.sc,
        st: params.details.categoryVacancy.st,
        ews: params.details.categoryVacancy.ews,
        total: params.details.categoryVacancy.total,
      }
    : undefined;

  const categorySum = [categoryVacancy?.general, categoryVacancy?.obc, categoryVacancy?.sc, categoryVacancy?.st, categoryVacancy?.ews]
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    .reduce((sum, value) => sum + value, 0);

  if (!vacancyTotal && categorySum > 0) {
    vacancyTotal = categoryVacancy?.total ?? categorySum;
  }
  if (vacancyTotal && categorySum > 0 && Math.abs(vacancyTotal - categorySum) > 2) {
    warnings.push(`vacancy_conflict:${vacancyTotal}!=${categorySum}`);
  }

  const confidence = clampConfidence(params.details.confidence);
  const officialNotificationUrl = sanitizeJobUrl(params.details.officialNotificationUrl);
  const officialApplyUrl = sanitizeJobUrl(params.details.officialApplyUrl);

  if (params.details.officialNotificationUrl && !officialNotificationUrl) {
    warnings.push("invalid_official_notification_url");
  }
  if (params.details.officialApplyUrl && !officialApplyUrl) {
    warnings.push("invalid_official_apply_url");
  }

  const details: ExtractedJobDetails = {
    ...params.details,
    docType,
    isNewJob:
      typeof params.details.isNewJob === "boolean"
        ? params.details.isNewJob
        : isRecruitmentDocType(docType)
          ? true
          : docType
            ? false
            : undefined,
    canonicalTitle: sanitizePlainText(params.details.canonicalTitle, { maxLength: 220 }),
    shortTitle: sanitizePlainText(params.details.shortTitle, { maxLength: 140 }),
    positionName: sanitizePlainText(params.details.positionName, { maxLength: 220 }),
    department: sanitizePlainText(params.details.department, { maxLength: 220 }),
    placeOfPosting: sanitizePlainText(params.details.placeOfPosting, { maxLength: 220 }),
    qualification: sanitizePlainText(params.details.qualification, { maxLength: 320 }),
    payScale: sanitizePlainText(params.details.payScale, { maxLength: 220 }),
    examCentres: sanitizePlainText(params.details.examCentres, { maxLength: 260 }),
    shortSummary: sanitizePlainText(params.details.shortSummary, { maxLength: 360 }),
    relatedJobHint: sanitizePlainText(params.details.relatedJobHint, { maxLength: 180 }),
    applyBegin,
    applyLastDate,
    correctionFrom,
    correctionTo,
    ageMin,
    ageMax,
    vacancyTotal,
    categoryVacancy,
    officialNotificationUrl,
    officialApplyUrl,
    confidence,
  };

  if (!isPublicJobDocType(docType)) {
    details.isNewJob = false;
  }

  details.validationWarnings = Array.from(new Set(warnings));
  return {
    details,
    warnings: details.validationWarnings,
    publishable: isPublicJobDocType(docType),
  };
}
