import assert from "node:assert/strict";
import test from "node:test";

import { parseUpscDetailPage } from "../detailPageExtractor";

test("parseUpscDetailPage extracts key table fields and notification pdf", () => {
  const html = `
    <html><body>
      <h1>Central Armed Police Forces (ACs) Examination, 2026</h1>
      <table>
        <tr><th>Date of Notification</th><td>20/02/2026</td></tr>
        <tr><th>Date of Commencement of Examination</th><td>19/07/2026</td></tr>
        <tr><th>Duration of Examination</th><td>One Day</td></tr>
        <tr><th>Last Date for Receipt of Applications</th><td>12/03/2026 - 6:00pm</td></tr>
        <tr><th>Download Notification</th><td><a href="/sites/default/files/ExamNotifi_CAPF_AC_Exam_2026_Eng_20022026.pdf">Notice</a></td></tr>
      </table>
      <a href="https://upsconline.nic.in/upsc/OTRP/">Apply Online</a>
    </body></html>
  `;

  const parsed = parseUpscDetailPage(
    html,
    "https://upsc.gov.in/examinations/Central%20Armed%20Police%20Forces%20%28ACs%29%20Examination%2C%202026",
  );

  assert.equal(parsed.notificationDate?.toISOString(), "2026-02-20T00:00:00.000Z");
  assert.equal(parsed.examStartDate?.toISOString(), "2026-07-19T00:00:00.000Z");
  assert.equal(parsed.applicationLastDate?.toISOString(), "2026-03-12T00:00:00.000Z");
  assert.equal(parsed.examDuration, "One Day");
  assert.match(String(parsed.notificationPdfUrl), /ExamNotifi_CAPF_AC_Exam_2026/i);
  assert.match(String(parsed.applyUrl), /upsconline\.nic\.in/i);
});
