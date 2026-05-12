import type { ExtractedJobDetails } from "./extractionTypes";

export type FieldCandidate = {
  fieldName: string;
  candidateValue: unknown;
  sourceType: string; // "regex" | "llm" | "detail_page" | "api" | "user_provided"
  sourceUrl?: string;
  confidence: number; // 0-1
  extractedAt: Date;
};

export type CandidateConflict = {
  fieldName: string;
  sourceA: string;
  valueA: unknown;
  sourceB: string;
  valueB: unknown;
  conflictType: "mismatch" | "incompatible_type";
};

/**
 * Extract field candidates from all available sources.
 *
 * Captures every candidate value for each field, regardless of conflict,
 * to enable admin review and merge logic.
 */
export function extractFieldCandidates(params: {
  regexDetails: ExtractedJobDetails;
  llmDetails?: ExtractedJobDetails | null;
  detailPageDetails?: Partial<ExtractedJobDetails>;
  basis: {
    listingTitle: boolean;
    listingText: boolean;
    detailPageText: boolean;
    pdfText: boolean;
    regexFields: boolean;
    sourceUrls: boolean;
  };
  detailUrl?: string;
  notificationPdfUrl?: string;
  applyUrl?: string;
}): FieldCandidate[] {
  const candidates: FieldCandidate[] = [];

  // Extract from regex-based extraction
  if (params.basis.regexFields && params.regexDetails) {
    const regexTime = new Date();
    extractFieldsFromDetails("regex", params.regexDetails, regexTime, candidates, {
      sourceUrl: params.notificationPdfUrl,
    });
  }

  // Extract from LLM extraction
  if (params.llmDetails) {
    const llmTime = new Date();
    extractFieldsFromDetails("llm", params.llmDetails, llmTime, candidates, {
      sourceUrl: params.notificationPdfUrl,
    });
  }

  // Extract from detail page parsing (UPSC, etc.)
  if (params.detailPageDetails && params.basis.detailPageText) {
    const detailPageTime = new Date();
    extractFieldsFromDetails("detail_page", params.detailPageDetails as ExtractedJobDetails, detailPageTime, candidates, {
      sourceUrl: params.detailUrl,
    });
  }

  return candidates;
}

function extractFieldsFromDetails(
  sourceType: string,
  details: Partial<ExtractedJobDetails>,
  extractedAt: Date,
  outCandidates: FieldCandidate[],
  meta: { sourceUrl?: string },
) {
  const fieldDefs: Array<keyof ExtractedJobDetails> = [
    "canonicalTitle",
    "shortTitle",
    "applyBegin",
    "applyLastDate",
    "examDate",
    "feeLastDate",
    "correctionFrom",
    "correctionTo",
    "feeGeneral",
    "feeObc",
    "feeScSt",
    "feePh",
    "feeFemale",
    "feeNote",
    "ageMin",
    "ageMax",
    "ageAsOn",
    "vacancyTotal",
    "positionName",
    "department",
    "placeOfPosting",
    "qualification",
    "payScale",
    "examCentres",
    "categoryVacancy",
    "shortSummary",
  ];

  for (const fieldName of fieldDefs) {
    const value = details[fieldName];
    if (value === undefined || value === null) continue;

    // Skip empty strings and zero-sized objects
    if (typeof value === "string" && !value.trim()) continue;
    if (typeof value === "object" && !("length" in value) && Object.keys(value).length === 0) continue;

    outCandidates.push({
      fieldName: String(fieldName),
      candidateValue: value,
      sourceType,
      sourceUrl: meta.sourceUrl,
      confidence: details.confidence ?? 0.75,
      extractedAt,
    });
  }
}

/**
 * Detect conflicts between candidates for the same field.
 */
export function detectFieldConflicts(candidates: FieldCandidate[]): CandidateConflict[] {
  const conflicts: CandidateConflict[] = [];
  const byField = new Map<string, FieldCandidate[]>();

  // Group candidates by field name
  for (const candidate of candidates) {
    if (!byField.has(candidate.fieldName)) {
      byField.set(candidate.fieldName, []);
    }
    byField.get(candidate.fieldName)!.push(candidate);
  }

  // Check each field for conflicts
  for (const [fieldName, fieldCandidates] of byField) {
    if (fieldCandidates.length < 2) continue;

    // Check all pairs
    for (let i = 0; i < fieldCandidates.length; i++) {
      for (let j = i + 1; j < fieldCandidates.length; j++) {
        const a = fieldCandidates[i];
        const b = fieldCandidates[j];

        if (!valuesEqual(a.candidateValue, b.candidateValue)) {
          conflicts.push({
            fieldName,
            sourceA: a.sourceType,
            valueA: a.candidateValue,
            sourceB: b.sourceType,
            valueB: b.candidateValue,
            conflictType: "mismatch",
          });
        }
      }
    }
  }

  return conflicts;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return false;

  // Deep compare objects
  if (typeof a === "object" && typeof b === "object") {
    const aKeys = Object.keys(a as Record<string, unknown>).sort();
    const bKeys = Object.keys(b as Record<string, unknown>).sort();

    if (aKeys.length !== bKeys.length) return false;
    if (!aKeys.every((k, i) => k === bKeys[i])) return false;

    for (const key of aKeys) {
      if (!valuesEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
        return false;
      }
    }
    return true;
  }

  // Date comparison
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  return false;
}

/**
 * Select the best candidate for a field based on source reliability and confidence.
 *
 * Scoring considers:
 * - Source type reliability (llm > detail_page > regex > api)
 * - Extraction confidence
 * - Agreement from multiple sources
 */
export function selectBestCandidate(
  fieldName: string,
  candidates: FieldCandidate[],
  options?: {
    sourceWeights?: Record<string, number>;
    adminLock?: { value: unknown; sourceType: string };
  },
): FieldCandidate | undefined {
  if (!candidates.length) return undefined;
  if (options?.adminLock) {
    return candidates.find(
      (c) => valuesEqual(c.candidateValue, options.adminLock!.value) && c.sourceType === options.adminLock!.sourceType,
    );
  }

  const sourceWeights = options?.sourceWeights ?? {
    llm: 1.0,
    detail_page: 0.9,
    regex: 0.7,
    api: 0.8,
    user_provided: 1.0,
  };

  // Score each candidate
  const scored = candidates.map((c) => ({
    candidate: c,
    score: (sourceWeights[c.sourceType] ?? 0.5) * (c.confidence ?? 0.75),
  }));

  // If multiple candidates with top score agree, boost that score
  const topScore = Math.max(...scored.map((s) => s.score));
  const topCandidates = scored.filter((s) => Math.abs(s.score - topScore) < 0.01);

  if (topCandidates.length > 1) {
    const agreeing = topCandidates.filter((s) => valuesEqual(s.candidate.candidateValue, topCandidates[0].candidate.candidateValue));
    if (agreeing.length > 1) {
      // Consensus: boost the agreed-upon candidate
      for (const s of agreeing) {
        s.score *= 1.2;
      }
    }
  }

  // Return the best-scored candidate
  const best = scored.reduce((prev, current) => (current.score > prev.score ? current : prev));
  return best.candidate;
}

/**
 * Create a normalized field value from available candidates.
 *
 * Preferred strategy:
 * 1. If admin-locked, use that
 * 2. If multiple sources agree on a value, use it
 * 3. Otherwise, prefer LLM > detail_page > regex > api
 */
export function normalizeFieldValue(
  fieldName: string,
  candidates: FieldCandidate[],
  options?: {
    adminLock?: { value: unknown; sourceType?: string };
    conflictThreshold?: number; // Min agreement ratio to avoid conflict flag
  },
): {
  chosenValue: unknown;
  chosenSource: string;
  hasConflict: boolean;
  agreementRatio: number;
} {
  const threshold = options?.conflictThreshold ?? 0.5;
  const fieldCandidates = candidates.filter((c) => c.fieldName === fieldName);

  if (!fieldCandidates.length) {
    return { chosenValue: undefined, chosenSource: "none", hasConflict: false, agreementRatio: 0 };
  }

  if (options?.adminLock) {
    return {
      chosenValue: options.adminLock.value,
      chosenSource: options.adminLock.sourceType ?? "admin",
      hasConflict: false,
      agreementRatio: 1,
    };
  }

  // Count agreement on each unique value
  const valueGroups = new Map<string, FieldCandidate[]>();
  for (const candidate of fieldCandidates) {
    const key = JSON.stringify(candidate.candidateValue);
    if (!valueGroups.has(key)) {
      valueGroups.set(key, []);
    }
    valueGroups.get(key)!.push(candidate);
  }

  const best = selectBestCandidate(fieldName, fieldCandidates, {
    sourceWeights: undefined,
    adminLock: undefined,
  });
  if (!best) {
    return { chosenValue: undefined, chosenSource: "none", hasConflict: true, agreementRatio: 0 };
  }

  const bestKey = JSON.stringify(best.candidateValue);
  const agreingCount = valueGroups.get(bestKey)?.length ?? 1;
  const agreementRatio = agreingCount / fieldCandidates.length;

  return {
    chosenValue: best.candidateValue,
    chosenSource: best.sourceType,
    hasConflict: agreementRatio < threshold,
    agreementRatio,
  };
}
