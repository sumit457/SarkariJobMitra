import assert from "node:assert/strict";
import test from "node:test";

import { validateAndSanitizeExtractedDetails } from "../extractionValidation";

test("validateAndSanitizeExtractedDetails clears contradictory application window", () => {
  const validated = validateAndSanitizeExtractedDetails({
    titleRaw: "Recruitment of Specialist Officer 2026",
    details: {
      docType: "recruitment",
      applyBegin: new Date("2026-03-20T00:00:00.000Z"),
      applyLastDate: new Date("2026-03-10T00:00:00.000Z"),
    },
  });

  assert.equal(validated.details.applyBegin, undefined);
  assert.equal(validated.details.applyLastDate, undefined);
  assert.ok(validated.warnings.includes("invalid_apply_window:2026-03-20T00:00:00.000Z>2026-03-10T00:00:00.000Z"));
});

test("validateAndSanitizeExtractedDetails prefers non-recruitment title evidence over llm recruitment guess", () => {
  const validated = validateAndSanitizeExtractedDetails({
    titleRaw: "Declaration of Result for Combined Exam 2026",
    details: {
      docType: "recruitment",
      isNewJob: true,
      confidence: 0.9,
    },
  });

  assert.equal(validated.details.docType, "result");
  assert.equal(validated.publishable, false);
  assert.equal(validated.details.isNewJob, false);
});

test("validateAndSanitizeExtractedDetails drops non-official urls", () => {
  const validated = validateAndSanitizeExtractedDetails({
    titleRaw: "Recruitment of Support Officer 2026",
    details: {
      docType: "recruitment",
      officialNotificationUrl: "https://random-site.example/notice.pdf",
      officialApplyUrl: "https://upsconline.nic.in/apply",
    },
  });

  assert.equal(validated.details.officialNotificationUrl, undefined);
  assert.equal(validated.details.officialApplyUrl, "https://upsconline.nic.in/apply");
  assert.ok(validated.warnings.includes("invalid_official_notification_url"));
});
