import type { ExtractedJobDetails } from "./extractionTypes";

export function mergeExtractedDetails(
  primary: ExtractedJobDetails | null | undefined,
  fallback: ExtractedJobDetails,
): ExtractedJobDetails {
  const primaryCat = primary?.categoryVacancy;
  const fallbackCat = fallback.categoryVacancy;
  const mergedCat = {
    general: primaryCat?.general ?? fallbackCat?.general,
    obc: primaryCat?.obc ?? fallbackCat?.obc,
    sc: primaryCat?.sc ?? fallbackCat?.sc,
    st: primaryCat?.st ?? fallbackCat?.st,
    ews: primaryCat?.ews ?? fallbackCat?.ews,
    total: primaryCat?.total ?? fallbackCat?.total,
  };
  const hasCategory = Object.values(mergedCat).some((value) => typeof value === "number");

  const warnings = new Set<string>([...(fallback.validationWarnings ?? []), ...(primary?.validationWarnings ?? [])]);
  const primaryConfidence = typeof primary?.confidence === "number" ? primary.confidence : undefined;

  if (primary?.applyBegin && fallback.applyBegin && primary.applyBegin.getTime() !== fallback.applyBegin.getTime()) {
    warnings.add("conflict_apply_begin");
  }
  if (primary?.applyLastDate && fallback.applyLastDate && primary.applyLastDate.getTime() !== fallback.applyLastDate.getTime()) {
    warnings.add("conflict_apply_last_date");
  }
  if (typeof primary?.vacancyTotal === "number" && typeof fallback.vacancyTotal === "number" && primary.vacancyTotal !== fallback.vacancyTotal) {
    warnings.add("conflict_vacancy_total");
  }

  return {
    docType: fallback.docType ?? primary?.docType,
    isNewJob: typeof primary?.isNewJob === "boolean" ? primary.isNewJob : fallback.isNewJob,
    canonicalTitle: primary?.canonicalTitle,
    shortTitle: primary?.shortTitle,
    applyBegin: fallback.applyBegin ?? primary?.applyBegin,
    applyLastDate: fallback.applyLastDate ?? primary?.applyLastDate,
    examDate: fallback.examDate ?? primary?.examDate,
    feeLastDate: fallback.feeLastDate ?? primary?.feeLastDate,
    correctionFrom: fallback.correctionFrom ?? primary?.correctionFrom,
    correctionTo: fallback.correctionTo ?? primary?.correctionTo,
    feeGeneral: fallback.feeGeneral ?? primary?.feeGeneral,
    feeObc: fallback.feeObc ?? primary?.feeObc,
    feeScSt: fallback.feeScSt ?? primary?.feeScSt,
    feePh: fallback.feePh ?? primary?.feePh,
    feeFemale: fallback.feeFemale ?? primary?.feeFemale,
    feeNote: fallback.feeNote ?? primary?.feeNote,
    ageMin: fallback.ageMin ?? primary?.ageMin,
    ageMax: fallback.ageMax ?? primary?.ageMax,
    ageAsOn: fallback.ageAsOn ?? primary?.ageAsOn,
    vacancyTotal: fallback.vacancyTotal ?? primary?.vacancyTotal,
    positionName: fallback.positionName ?? primary?.positionName,
    department: fallback.department ?? primary?.department,
    placeOfPosting: fallback.placeOfPosting ?? primary?.placeOfPosting,
    qualification: fallback.qualification ?? primary?.qualification,
    payScale: fallback.payScale ?? primary?.payScale,
    examCentres: fallback.examCentres ?? primary?.examCentres,
    categoryVacancy: hasCategory ? mergedCat : undefined,
    shortSummary: fallback.shortSummary ?? primary?.shortSummary,
    officialNotificationUrl: fallback.officialNotificationUrl ?? primary?.officialNotificationUrl,
    officialApplyUrl: fallback.officialApplyUrl ?? primary?.officialApplyUrl,
    relatedJobHint: primary?.relatedJobHint ?? fallback.relatedJobHint,
    confidence: primaryConfidence,
    sourceBasis: primary?.sourceBasis ?? fallback.sourceBasis,
    validationWarnings: warnings.size > 0 ? [...warnings] : undefined,
  };
}
