import assert from "node:assert/strict";
import test from "node:test";

import { classifyDocTypeFromText, classifyNotice, shouldExposeRecruitmentFields } from "../noticeClassifier";

test("classifyNotice detects recruitment title as new_job", () => {
  assert.equal(classifyNotice({ rawTitle: "SSC CGL Recruitment 2026 Notification" }).notice_type, "new_job");
});

test("classifyNotice detects admit card title", () => {
  assert.equal(classifyNotice({ rawTitle: "SSC CGL Admit Card 2026" }).notice_type, "admit_card");
});

test("classifyNotice detects result title", () => {
  assert.equal(classifyNotice({ rawTitle: "BPSC AE Result and Merit List" }).notice_type, "result");
});

test("classifyNotice detects corrigendum title", () => {
  assert.equal(classifyNotice({ rawTitle: "Corrigendum to recruitment notice" }).notice_type, "corrigendum");
});

test("classifyNotice detects syllabus title", () => {
  assert.equal(classifyNotice({ rawTitle: "UP Police Constable Syllabus 2026" }).notice_type, "syllabus");
});

test("classifyDocTypeFromText detects extension notice", () => {
  assert.equal(classifyDocTypeFromText("Last date extended for online application"), "extension_notice");
});

test("classifyDocTypeFromText detects corrigendum", () => {
  assert.equal(classifyDocTypeFromText("Corrigendum to recruitment notice"), "corrigendum");
});

test("shouldExposeRecruitmentFields blocks result notices", () => {
  assert.equal(shouldExposeRecruitmentFields("Declaration of Result of Recruitment Exam", "Result"), false);
});

test("classifyDocTypeFromText keeps recruitment when title is strong but body mentions results", () => {
  assert.equal(
    classifyDocTypeFromText(
      "Combined Medical Services Examination, 2026",
      "minimum qualifying marks secured by the last recommended candidate in various categories",
    ),
    "recruitment",
  );
});

test("classifyDocTypeFromText marks annual calendars as not relevant", () => {
  assert.equal(
    classifyDocTypeFromText(
      "Annual Calendar 2026",
      "Programme of Examinations and Recruitment Tests conducted by the Commission",
    ),
    "not_relevant",
  );
});
