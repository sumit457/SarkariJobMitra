import assert from "node:assert/strict";
import test from "node:test";

import { deriveExamName } from "../nameNormalizer";

test("deriveExamName generates concise generic title with normalized year from cycle range", () => {
  const out = deriveExamName({
    organization: "SBI",
    titleRaw: "ENGAGEMENT OF RETIRED BANK OFFICERS OF SBI AS SUPPORT OFFICER ON CONTRACT BASIS (CRPD/RS/2025-26/28)",
  });

  assert.equal(out.examName, "Retired Bank Officers Of SBI As Support Officer On Contract Basis 2026");
});

test("deriveExamName prefers extracted job position title when available", () => {
  const out = deriveExamName({
    organization: "SBI",
    titleRaw: "ENGAGEMENT OF RETIRED BANK OFFICERS OF SBI AS SUPPORT OFFICER ON CONTRACT BASIS (CRPD/RS/2025-26/28)",
    preferredTitle: "Support Officer (On Contract Basis)",
  });

  assert.equal(out.examName, "Support Officer (On Contract Basis) 2026");
});

test("deriveExamName ignores low-quality preferred title and falls back to official statement", () => {
  const out = deriveExamName({
    organization: "India Post",
    titleRaw:
      "Declaration of Pending Results - Online Recruitment of Meritorious Sportspersons, Notification NO.W-17/55/2022-SPN-I dated 08-11-2023 - Karnataka Circle",
    preferredTitle: "to which",
  });

  assert.match(out.examName, /Declaration of Pending Results/i);
  assert.doesNotMatch(out.examName, /^to which/i);
});
