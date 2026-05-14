import assert from "node:assert/strict";
import test from "node:test";

import { parseGenericOfficialNotices } from "../parsers/genericOfficial";

test("parseGenericOfficialNotices keeps recruitment links and skips noise", () => {
  const html = `
    <a href="/recruitment/advt-01.pdf">Advertisement for Junior Assistant Recruitment</a>
    <a href="/tender/notice.pdf">Tender Notice</a>
    <a href="/results">Result of Assistant Exam</a>
  `;

  const items = parseGenericOfficialNotices(html, "https://example.gov.in/jobs/");

  assert.equal(items.length, 2);
  assert.equal(items[0].pdfUrl, "https://example.gov.in/recruitment/advt-01.pdf");
  assert.equal(items[1].detailUrl, "https://example.gov.in/results");
});
