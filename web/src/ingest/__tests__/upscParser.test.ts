import assert from "node:assert/strict";
import test from "node:test";

import { parseUpscActiveExams, parseUpscExamCalendar, parseUpscForthcomingExams } from "../parsers/upsc";

test("parseUpscActiveExams extracts detail links and skips listing links", () => {
  const html = `
    <html><body>
      <a href="/examinations/active-exams">Active Exams</a>
      <a href="/examinations/Central%20Armed%20Police%20Forces%20%28ACs%29%20Examination%2C%202026">
        Central Armed Police Forces (ACs) Examination, 2026
      </a>
      <a href="/examinations/Combined%20Medical%20Services%20Examination%2C%202026">
        Combined Medical Services Examination, 2026
      </a>
      <a href="/examinations/Combined%20Medical%20Services%20Examination%2C%202026">
        Combined Medical Services Examination, 2026
      </a>
    </body></html>
  `;

  const items = parseUpscActiveExams(html, "https://upsc.gov.in/examinations/active-exams");
  assert.equal(items.length, 2);
  assert.match(String(items[0].detailUrl), /upsc\.gov\.in\/examinations\//i);
  assert.equal(items[0].pdfUrl, undefined);
});

test("parseUpscForthcomingExams reads exam names from table", () => {
  const html = `
    <table>
      <tr><th>Exam Name</th></tr>
      <tr><td>Engineering Services Examination, 2026</td></tr>
      <tr><td>Civil Services Examination, 2026</td></tr>
    </table>
  `;

  const items = parseUpscForthcomingExams(html, "https://upsc.gov.in/examinations/forthcoming-exams");
  assert.equal(items.length, 2);
  assert.equal(items[0].title, "Engineering Services Examination, 2026");
});

test("parseUpscExamCalendar keeps only 2026 entries and parses notification date", () => {
  const html = `
    <table>
      <tr>
        <th>Name of Examination</th>
        <th>Date of Notification</th>
        <th>Date of Commencement</th>
      </tr>
      <tr>
        <td><a href="/examinations/Combined%20Medical%20Services%20Examination%2C%202026">CMS 2026</a></td>
        <td>19/02/2026</td>
        <td>20/07/2026</td>
      </tr>
      <tr>
        <td>CSE 2025</td>
        <td>01/03/2025</td>
        <td>30/06/2025</td>
      </tr>
    </table>
  `;

  const items = parseUpscExamCalendar(html, "https://upsc.gov.in/examinations/exam-calendar");
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "CMS 2026");
  assert.equal(items[0].publishedOn?.toISOString(), "2026-02-19T00:00:00.000Z");
  assert.match(String(items[0].detailUrl), /upsc\.gov\.in\/examinations\//i);
});
