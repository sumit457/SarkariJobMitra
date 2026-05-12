export const JOB_DOC_TYPES = [
  "recruitment",
  "result",
  "admit_card",
  "answer_key",
  "corrigendum",
  "extension_notice",
  "not_relevant",
] as const;

export type JobDocType = (typeof JOB_DOC_TYPES)[number];

export const NOTICE_TYPES = [
  "new_job",
  "apply_online",
  "result",
  "admit_card",
  "answer_key",
  "corrigendum",
  "exam_date",
  "interview_schedule",
  "document_verification",
  "syllabus",
  "rejection_list",
  "cancellation",
  "extension_notice",
  "non_job",
  "notice",
  "unknown",
] as const;

export type NoticeType = (typeof NOTICE_TYPES)[number];

export type CategoryVacancySplit = {
  general?: number;
  obc?: number;
  sc?: number;
  st?: number;
  ews?: number;
  total?: number;
};

export type ExtractionSourceBasis = {
  listingTitle: boolean;
  listingText: boolean;
  detailPageText: boolean;
  pdfText: boolean;
  regexFields: boolean;
  sourceUrls: boolean;
};

export type ExtractedJobDetails = {
  docType?: JobDocType;
  isNewJob?: boolean;
  canonicalTitle?: string;
  shortTitle?: string;
  applyBegin?: Date;
  applyLastDate?: Date;
  examDate?: Date;
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
  positionName?: string;
  department?: string;
  placeOfPosting?: string;
  qualification?: string;
  payScale?: string;
  examCentres?: string;
  categoryVacancy?: CategoryVacancySplit;
  shortSummary?: string;
  officialNotificationUrl?: string;
  officialApplyUrl?: string;
  relatedJobHint?: string;
  confidence?: number;
  validationWarnings?: string[];
  sourceBasis?: ExtractionSourceBasis;
};

export type LlmExtractionAttempt = {
  details: ExtractedJobDetails | null;
  rawResponse: string | null;
  model: string;
  promptVersion: string;
  basis: ExtractionSourceBasis;
  extractedAt: Date;
  error?: string;
};
