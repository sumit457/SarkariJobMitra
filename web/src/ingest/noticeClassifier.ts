import type { JobDocType, NoticeType } from "./extractionTypes";

export type NoticeClassification = {
  notice_type: NoticeType;
  confidence: number;
  reason: string;
};

const CALENDAR_NOTICE_PATTERN =
  /\b(annual|exam(?:ination)?)\s+calendar\b|\bcalendar\s+of\s+(?:exam(?:ination)?s?|recruitment)\b|\bprogramme\s+of\s+exam(?:ination)?s\b/i;

export function classifyDocTypeFromText(...parts: Array<string | undefined | null>): JobDocType | undefined {
  const [title = "", ...rest] = parts.map((part) => (part ?? "").trim());
  const titleLower = title.toLowerCase();
  const bodyLower = rest.join(" ").toLowerCase();
  const combined = `${titleLower} ${bodyLower}`.trim();

  if (!combined) return undefined;

  if (/(result|merit|selected|selection list|provisional list|declaration|cut[-\s]?off)/i.test(titleLower)) return "result";
  if (/(admit\s+card|hall\s+ticket|e-?admit|city intimation)/i.test(titleLower)) return "admit_card";
  if (/(answer\s+key|response\s+sheet)/i.test(titleLower)) return "answer_key";
  if (/(extend|extended|extension notice|last date extended)/i.test(titleLower)) return "extension_notice";
  if (/(corrigendum|corrigenda|amendment|revised notice|correction notice|modification)/i.test(titleLower)) return "corrigendum";
  if (CALENDAR_NOTICE_PATTERN.test(titleLower)) return "not_relevant";
  if (/(audit report|tainted candidates|minutes of meeting|press release|not for recruitment)/i.test(titleLower)) return "not_relevant";
  if (/(recruit|vacanc|engagement|application|exam|examination|gds|opening|advertisement)/i.test(titleLower)) return "recruitment";

  if (/(result|merit|selected|selection list|provisional list|declaration|cut[-\s]?off)/i.test(bodyLower)) return "result";
  if (/(admit\s+card|hall\s+ticket|e-?admit|city intimation)/i.test(bodyLower)) return "admit_card";
  if (/(answer\s+key|response\s+sheet)/i.test(bodyLower)) return "answer_key";
  if (/(extend|extended|extension notice|last date extended)/i.test(bodyLower)) return "extension_notice";
  if (/(corrigendum|corrigenda|amendment|revised notice|correction notice|modification)/i.test(bodyLower)) return "corrigendum";
  if (CALENDAR_NOTICE_PATTERN.test(bodyLower)) return "not_relevant";
  if (/(audit report|tainted candidates|minutes of meeting|press release|not for recruitment)/i.test(bodyLower)) return "not_relevant";
  if (/(recruit|vacanc|engagement|application|exam|examination|gds|opening|advertisement)/i.test(bodyLower)) return "recruitment";
  return undefined;
}

export function docTypeToCategory(docType?: JobDocType | null): string | undefined {
  if (!docType) return undefined;
  if (docType === "recruitment") return "Recruitment";
  if (docType === "result") return "Result";
  if (docType === "admit_card") return "Admit Card";
  if (docType === "answer_key") return "Answer Key";
  if (docType === "corrigendum") return "Corrigendum";
  if (docType === "extension_notice") return "Extension Notice";
  if (docType === "not_relevant") return "Notice";
  return undefined;
}

export function deriveNoticeType(docType?: JobDocType | null): NoticeType {
  if (docType === "recruitment") return "new_job";
  if (docType === "result") return "result";
  if (docType === "admit_card") return "admit_card";
  if (docType === "answer_key") return "answer_key";
  if (docType === "corrigendum") return "corrigendum";
  if (docType === "extension_notice") return "extension_notice";
  if (docType === "not_relevant") return "notice";
  return "unknown";
}

function has(pattern: RegExp, text: string) {
  return pattern.test(text);
}

export function classifyNotice(params: {
  rawTitle?: string | null;
  rawText?: string | null;
  sourceMetadata?: { source_type?: string | null } | null;
  url?: string | null;
}): NoticeClassification {
  const combined = `${params.rawTitle ?? ""}\n${params.rawText ?? ""}\n${params.url ?? ""}`.toLowerCase();
  const sourceType = (params.sourceMetadata?.source_type ?? "").toLowerCase();

  if (!combined.trim()) return { notice_type: "unknown", confidence: 0, reason: "No text available." };
  if (has(/\b(admit\s+card|hall\s+ticket|e-?admit|city\s+intimation)\b/i, combined)) {
    return { notice_type: "admit_card", confidence: 95, reason: "Admit card terms found." };
  }
  if (has(/\b(answer\s+key|response\s+sheet)\b/i, combined)) {
    return { notice_type: "answer_key", confidence: 95, reason: "Answer key terms found." };
  }
  if (has(/\b(document\s+verification|dv\s+schedule)\b/i, combined)) {
    return { notice_type: "document_verification", confidence: 92, reason: "Document verification terms found." };
  }
  if (has(/\b(interview|viva[-\s]?voce)\b/i, combined)) {
    return { notice_type: "interview_schedule", confidence: 90, reason: "Interview terms found." };
  }
  if (has(/\b(result|selected\s+candidates|merit\s+list|selection\s+list|cut[-\s]?off)\b/i, combined)) {
    return { notice_type: "result", confidence: 92, reason: "Result terms found." };
  }
  if (has(/\b(rejection\s+list|rejected\s+candidates)\b/i, combined)) {
    return { notice_type: "rejection_list", confidence: 90, reason: "Rejection-list terms found." };
  }
  if (has(/\b(cancelled|cancellation|withdrawn)\b/i, combined)) {
    return { notice_type: "cancellation", confidence: 90, reason: "Cancellation terms found." };
  }
  if (has(/\b(syllabus|exam\s+pattern)\b/i, combined)) {
    return { notice_type: "syllabus", confidence: 88, reason: "Syllabus terms found." };
  }
  if (has(/\b(corrigendum|corrigenda|addendum|amendment|last\s+date\s+extended|extension)\b/i, combined)) {
    return { notice_type: "corrigendum", confidence: 88, reason: "Corrigendum or extension terms found." };
  }
  if (has(/\b(exam\s+date|exam\s+schedule|written\s+exam\s+schedule|cbt\s+schedule)\b/i, combined)) {
    return { notice_type: "exam_date", confidence: 85, reason: "Exam date terms found." };
  }
  if (has(/\b(apply\s+online|online\s+application|application\s+form)\b/i, combined)) {
    return { notice_type: "apply_online", confidence: 82, reason: "Apply-online terms found." };
  }
  if (has(/\b(recruitment|vacancy|vacancies|advertisement|notification|employment\s+notice|opening|engagement)\b/i, combined)) {
    return {
      notice_type: "new_job",
      confidence: sourceType === "aggregator" ? 72 : 86,
      reason: "Recruitment or vacancy terms found.",
    };
  }
  if (has(/\b(press\s+release|tender|auction|minutes\s+of\s+meeting|annual\s+report)\b/i, combined)) {
    return { notice_type: "non_job", confidence: 75, reason: "Administrative non-job terms found." };
  }

  return { notice_type: "unknown", confidence: 35, reason: "No deterministic notice rule matched." };
}

export function classifyNoticeCategory(title: string): string | undefined {
  return docTypeToCategory(classifyDocTypeFromText(title));
}

export function isPublicJobDocType(docType?: JobDocType | null) {
  return docType === "recruitment";
}

export function isRecruitmentDocType(docType?: JobDocType | null) {
  return docType === "recruitment";
}

export function shouldExposeRecruitmentFields(title: string, category?: string | null, docType?: JobDocType | null) {
  if (docType) return isRecruitmentDocType(docType);

  const classified = classifyDocTypeFromText(title, category ?? "");
  if (classified) return isRecruitmentDocType(classified);

  const lower = `${title} ${category ?? ""}`.toLowerCase();
  return /(recruit|vacanc|engagement|apply|application|notification|exam|opening|gds)/i.test(lower);
}
