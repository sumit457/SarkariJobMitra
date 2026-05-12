import assert from "node:assert/strict";
import test from "node:test";

import { resolveJobLinks } from "../linkResolver";
import { extractUrlsFromText } from "../officialDomains";

test("extractUrlsFromText keeps only official domains", () => {
  const text = `
    Apply at https://www.indiapost.gov.in/gdsonlineengagement
    Candidate login: https://app.indiapost.gov.in/gdscandidate
    Ignore mirror: https://sarkariresult.example/jobs
  `;

  const urls = extractUrlsFromText(text);
  assert.ok(urls.length >= 2);
  assert.ok(urls.some((url) => /indiapost\.gov\.in\/gdsonlineengagement/i.test(url)));
  assert.ok(urls.some((url) => /app\.indiapost\.gov\.in\/gdscandidate/i.test(url)));
  assert.ok(!urls.some((url) => /sarkariresult\.example/i.test(url)));
});

test("resolveJobLinks keeps landing apply link as primary for India Post GDS", () => {
  const links = resolveJobLinks({
    organization: "India Post",
    titleRaw: "GDS Online Engagement",
    pdfText: `
      For online engagement visit https://www.indiapost.gov.in/gdsonlineengagement
      Candidate Login: https://app.indiapost.gov.in/gdscandidate
    `,
    notificationPdfUrl: "https://www.indiapost.gov.in/gdsonlineengagement/pdf/descriptive-notification.pdf",
  });

  const apply = links.find((link) => link.kind === "apply");
  const login = links.find((link) => link.kind === "apply_login");
  const notification = links.find((link) => link.kind === "notification");

  assert.ok(apply);
  assert.equal(apply?.isPrimary, true);
  assert.match(String(apply?.url), /indiapost\.gov\.in\/gdsonlineengagement/i);

  assert.ok(login);
  assert.match(String(login?.url), /app\.indiapost\.gov\.in\/gdscandidate/i);

  assert.ok(notification);
  assert.match(String(notification?.url), /\.pdf$/i);
});

test("resolveJobLinks detects UPSC apply link from bare official domain in PDF text", () => {
  const links = resolveJobLinks({
    organization: "UPSC",
    titleRaw: "Central Armed Police Forces (ACs) Examination, 2026",
    pdfText: `
      Candidates are required to apply online at upsconline.nic.in/upsc/OTRP/
      Detailed notice: https://upsc.gov.in/sites/default/files/ExamNotifi_CAPF_AC_Exam_2026_Eng_20022026.pdf
    `,
    notificationPdfUrl: "https://upsc.gov.in/sites/default/files/ExamNotifi_CAPF_AC_Exam_2026_Eng_20022026.pdf",
  });

  const apply = links.find((link) => link.kind === "apply");
  const notification = links.find((link) => link.kind === "notification");

  assert.ok(apply);
  assert.match(String(apply?.url), /upsconline\.nic\.in/i);
  assert.equal(apply?.isPrimary, true);

  assert.ok(notification);
  assert.match(String(notification?.url), /\.pdf$/i);
});

test("resolveJobLinks falls back to official page when notification url is an unverified opaque endpoint", () => {
  const links = resolveJobLinks({
    organization: "India Post",
    titleRaw: "Recruitment Notice",
    notificationPdfUrl: "https://www.indiapost.gov.in/api/documents/file/U2FsdGVkX182broken",
    officialPageUrl: "https://www.indiapost.gov.in/vacancies/recruitments",
    applyUrl: "https://www.indiapost.gov.in/gdsonlineengagement",
  });

  const notification = links.find((link) => link.kind === "notification");

  assert.ok(notification);
  assert.equal(notification?.label, "View Official Notice");
  assert.equal(notification?.url, "https://www.indiapost.gov.in/vacancies/recruitments");
});

test("resolveJobLinks prefers official notice page for opaque document endpoints", () => {
  const links = resolveJobLinks({
    organization: "India Post",
    titleRaw: "Recruitment Notice",
    notificationPdfUrl: "https://www.indiapost.gov.in/api/documents/file/U2FsdGVkX182verified",
    officialPageUrl: "https://www.indiapost.gov.in/vacancies/recruitments",
  });

  const notification = links.find((link) => link.kind === "notification");

  assert.ok(notification);
  assert.equal(notification?.label, "View Official Notice");
  assert.equal(notification?.url, "https://www.indiapost.gov.in/vacancies/recruitments");
});

test("resolveJobLinks does not invent apply links for result-style notices", () => {
  const links = resolveJobLinks({
    organization: "India Post",
    titleRaw: "Declaration of Pending Results - Recruitment Notification",
    notificationPdfUrl: "https://www.indiapost.gov.in/api/documents/file/U2FsdGVkX182broken",
    officialPageUrl: "https://www.indiapost.gov.in/vacancies",
    applyUrl: "https://www.indiapost.gov.in/gdsonlineengagement",
  });

  assert.ok(links.find((link) => link.kind === "notification"));
  assert.equal(links.some((link) => link.kind === "apply"), false);
  assert.equal(links.some((link) => link.kind === "apply_login"), false);
});
