import assert from "node:assert/strict";
import test from "node:test";

import { mergeExtractedDetails } from "../mergeExtractedDetails";

test("mergeExtractedDetails prefers primary fields and falls back for missing values", () => {
  const merged = mergeExtractedDetails(
    {
      canonicalTitle: "Retired Bank Officials Recruitment 2026",
      applyBegin: new Date("2026-02-05T00:00:00.000Z"),
      applyLastDate: new Date("2026-02-26T00:00:00.000Z"),
      department: "Central Recruitment & Promotion Department",
      vacancyTotal: 246,
    },
    {
      docType: "recruitment",
      applyBegin: new Date("2026-03-08T00:00:00.000Z"),
      applyLastDate: new Date("2026-03-08T00:00:00.000Z"),
      department: "Wrong fallback department",
      qualification: "Fallback qualification",
      vacancyTotal: 999,
    },
  );

  assert.equal(merged.docType, "recruitment");
  assert.equal(merged.applyBegin?.toISOString(), "2026-03-08T00:00:00.000Z");
  assert.equal(merged.applyLastDate?.toISOString(), "2026-03-08T00:00:00.000Z");
  assert.equal(merged.department, "Wrong fallback department");
  assert.equal(merged.qualification, "Fallback qualification");
  assert.equal(merged.vacancyTotal, 999);
  assert.equal(merged.canonicalTitle, "Retired Bank Officials Recruitment 2026");
  assert.ok(merged.validationWarnings?.includes("conflict_apply_begin"));
});

test("mergeExtractedDetails keeps deterministic urls ahead of llm urls", () => {
  const merged = mergeExtractedDetails(
    {
      officialNotificationUrl: "https://example.com/fake.pdf",
      officialApplyUrl: "https://example.com/apply",
    },
    {
      officialNotificationUrl: "https://upsc.gov.in/notice.pdf",
      officialApplyUrl: "https://upsconline.nic.in/",
    },
  );

  assert.equal(merged.officialNotificationUrl, "https://upsc.gov.in/notice.pdf");
  assert.equal(merged.officialApplyUrl, "https://upsconline.nic.in/");
});
