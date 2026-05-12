import assert from "node:assert/strict";
import test from "node:test";

import { parseSscGovCalendarApiPayload, parseSscGovNoticeBoardApiPayload } from "../parsers/sscGov";

test("parseSscGovNoticeBoardApiPayload keeps examId and builds attachment PDF URL", () => {
  const payload = JSON.stringify({
    data: [
      {
        headline: "Important Notice: Revised vacancies for SSC JE 2026",
        examId: "bxtirqg6pmwje26",
        createdAt: "2026-02-25T10:45:42.996Z",
        attachments: [
          {
            fileName: "notice3_25022026.pdf",
            type: "application/pdf",
            path: "uploads\\masterData\\NoticeBoards\\notice3_25022026.pdf",
          },
        ],
      },
    ],
  });

  const items = parseSscGovNoticeBoardApiPayload(payload);
  assert.equal(items.length, 1);
  assert.equal(items[0].examId, "bxtirqg6pmwje26");
  assert.match(String(items[0].pdfUrl), /\/api\/attachment\/uploads\/masterData\/NoticeBoards\//i);
});

test("parseSscGovCalendarApiPayload returns only default source years and sets session/date fields", () => {
  const payload = JSON.stringify({
    data: [
      {
        headline: "Combined Graduate Level Examination, 2026",
        examId: "cgl2026",
        createdAt: "2026-01-12T07:27:56.783Z",
        startDate: "2026-03-31",
        endDate: "2026-04-30",
        redirectUrl: "",
      },
      {
        headline: "Combined Graduate Level Examination, 2024",
        examId: "cgl2024",
        createdAt: "2024-01-09T14:16:42.274Z",
        startDate: "2024-06-24",
        endDate: "2024-07-24",
        redirectUrl: "",
      },
    ],
  });

  const items = parseSscGovCalendarApiPayload(payload);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "Combined Graduate Level Examination, 2026");
  assert.equal(items[0].examId, "cgl2026");
  assert.equal(items[0].sourceSession, "2026-27");
  assert.equal(items[0].sourceOpenDate?.toISOString(), "2026-03-31T00:00:00.000Z");
  assert.equal(items[0].sourceCloseDate?.toISOString(), "2026-04-30T00:00:00.000Z");
  assert.match(String(items[0].detailUrl), /for-candidates\/examination-calendar/i);
});
