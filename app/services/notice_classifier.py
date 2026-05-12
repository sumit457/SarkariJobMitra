from __future__ import annotations

from dataclasses import dataclass
import re


NOTICE_TYPES = {
    "new_job",
    "apply_online",
    "corrigendum",
    "admit_card",
    "result",
    "answer_key",
    "exam_date",
    "interview_schedule",
    "document_verification",
    "syllabus",
    "rejection_list",
    "cancellation",
    "non_job",
    "unknown",
}


@dataclass(frozen=True)
class NoticeClassification:
    notice_type: str
    confidence: int
    reason: str


def _contains(pattern: str, text: str) -> bool:
    return re.search(pattern, text, flags=re.IGNORECASE) is not None


def classify_notice(
    raw_title: str | None,
    raw_text: str | None = None,
    source_metadata: dict | None = None,
    url: str | None = None,
) -> NoticeClassification:
    title = (raw_title or "").strip()
    body = (raw_text or "").strip()
    source_type = str((source_metadata or {}).get("source_type") or "").lower()
    combined = f"{title}\n{body}\n{url or ''}".lower()

    if not combined.strip():
        return NoticeClassification("unknown", 0, "No title, text, or URL was available.")

    if _contains(r"\b(admit\s+card|hall\s+ticket|e-?admit|city\s+intimation)\b", combined):
        return NoticeClassification("admit_card", 95, "Admit card or hall ticket terms were found.")
    if _contains(r"\b(answer\s+key|response\s+sheet)\b", combined):
        return NoticeClassification("answer_key", 95, "Answer key terms were found.")
    if _contains(r"\b(document\s+verification|dv\s+schedule)\b", combined):
        return NoticeClassification("document_verification", 92, "Document verification terms were found.")
    if _contains(r"\b(interview|viva[-\s]?voce)\b", combined):
        return NoticeClassification("interview_schedule", 90, "Interview schedule terms were found.")
    if _contains(r"\b(result|selected\s+candidates|merit\s+list|selection\s+list|cut[-\s]?off)\b", combined):
        return NoticeClassification("result", 92, "Result or merit-list terms were found.")
    if _contains(r"\b(rejection\s+list|rejected\s+candidates)\b", combined):
        return NoticeClassification("rejection_list", 90, "Rejection-list terms were found.")
    if _contains(r"\b(cancelled|cancellation|withdrawn)\b", combined):
        return NoticeClassification("cancellation", 90, "Cancellation terms were found.")
    if _contains(r"\b(syllabus|exam\s+pattern)\b", combined):
        return NoticeClassification("syllabus", 88, "Syllabus or exam-pattern terms were found.")
    if _contains(r"\b(corrigendum|corrigenda|addendum|amendment|last\s+date\s+extended|extension)\b", combined):
        return NoticeClassification("corrigendum", 88, "Corrigendum, addendum, or extension terms were found.")
    if _contains(r"\b(exam\s+date|exam\s+schedule|written\s+exam\s+schedule|cbt\s+schedule)\b", combined):
        return NoticeClassification("exam_date", 85, "Exam date or schedule terms were found.")
    if _contains(r"\b(apply\s+online|online\s+application|application\s+form)\b", combined):
        return NoticeClassification("apply_online", 82, "Apply-online terms were found.")
    if _contains(
        r"\b(recruitment|vacancy|vacancies|advertisement|notification|employment\s+notice|opening|engagement)\b",
        combined,
    ):
        confidence = 86 if source_type != "aggregator" else 72
        return NoticeClassification("new_job", confidence, "Recruitment or vacancy terms were found.")
    if _contains(r"\b(press\s+release|tender|auction|minutes\s+of\s+meeting|annual\s+report)\b", combined):
        return NoticeClassification("non_job", 75, "Administrative non-job terms were found.")

    return NoticeClassification("unknown", 35, "No deterministic notice rule matched.")
