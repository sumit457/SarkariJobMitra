import assert from "node:assert/strict";
import test from "node:test";

import { parseLlmDetailsJson } from "../llmDetailsExtractor";

test("parseLlmDetailsJson parses structured JSON response from model", () => {
  const raw = JSON.stringify({
    docType: "recruitment",
    isNewJob: true,
    canonicalTitle: "Support Officer Recruitment 2026",
    shortTitle: "Support Officer 2026",
    positionName: "Support Officer (On Contract Basis)",
    department: "CMPOC, Hyderabad",
    placeOfPosting: "Hyderabad",
    qualification: "No specific educational qualification is required",
    payScale: "Rs 50,000/-",
    applyBegin: "2026-02-26",
    applyLastDate: "2026-03-18",
    officialNotificationUrl: "https://sbi.bank.in/web/careers/current-openings",
    officialApplyUrl: "https://recruitment.sbi.bank.in/",
    confidence: 0.92,
    vacancyTotal: 9,
    categoryVacancy: {
      general: 3,
      obc: 3,
      sc: 1,
      st: 1,
      ews: 1,
      total: 9,
    },
  });

  const parsed = parseLlmDetailsJson(raw);
  assert.ok(parsed);
  assert.equal(parsed?.docType, "recruitment");
  assert.equal(parsed?.isNewJob, true);
  assert.equal(parsed?.canonicalTitle, "Support Officer Recruitment 2026");
  assert.equal(parsed?.shortTitle, "Support Officer 2026");
  assert.equal(parsed?.positionName, "Support Officer (On Contract Basis)");
  assert.equal(parsed?.department, "CMPOC, Hyderabad");
  assert.equal(parsed?.vacancyTotal, 9);
  assert.equal(parsed?.categoryVacancy?.total, 9);
  assert.equal(parsed?.applyBegin?.toISOString(), "2026-02-26T00:00:00.000Z");
  assert.equal(parsed?.officialApplyUrl, "https://recruitment.sbi.bank.in/");
  assert.equal(parsed?.confidence, 0.92);
});

test("parseLlmDetailsJson returns null for invalid output", () => {
  const parsed = parseLlmDetailsJson("not-json");
  assert.equal(parsed, null);
});

test("parseLlmDetailsJson drops out-of-range confidence", () => {
  const raw = JSON.stringify({
    docType: "recruitment",
    confidence: 1.4,
  });

  const parsed = parseLlmDetailsJson(raw);
  assert.ok(parsed);
  assert.equal(parsed?.confidence, undefined);
});
