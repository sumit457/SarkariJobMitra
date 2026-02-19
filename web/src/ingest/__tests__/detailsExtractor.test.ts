import assert from "node:assert/strict";
import test from "node:test";

import { extractJobDetailsFromPdfText } from "../detailsExtractor";

test("extractJobDetailsFromPdfText parses dates, fee, age and vacancy", () => {
  const sample = `
    Gramin Dak Sevak (GDS) Online Engagement Schedule-I, January-2026
    Applications are invited from 10/02/2026 to 03/03/2026.
    Last date for fee payment: 04/03/2026
    Correction window: 06/03/2026 to 08/03/2026
    Application Fee: General/OBC/EWS Rs. 100/- ; SC/ST/Female/PWD Nil
    Age as on 03/03/2026 Minimum Age 18 Years Maximum Age 40 Years
    Vacancy Details Total : 21413 Posts
  `;

  const details = extractJobDetailsFromPdfText("India Post", sample);

  assert.equal(details.applyBegin?.toISOString(), "2026-02-10T00:00:00.000Z");
  assert.equal(details.applyLastDate?.toISOString(), "2026-03-03T00:00:00.000Z");
  assert.equal(details.feeLastDate?.toISOString(), "2026-03-04T00:00:00.000Z");
  assert.equal(details.correctionFrom?.toISOString(), "2026-03-06T00:00:00.000Z");
  assert.equal(details.correctionTo?.toISOString(), "2026-03-08T00:00:00.000Z");
  assert.equal(details.feeGeneral, 100);
  assert.equal(details.feeScSt, 0);
  assert.equal(details.feeFemale, 0);
  assert.equal(details.ageMin, 18);
  assert.equal(details.ageMax, 40);
  assert.equal(details.vacancyTotal, 21413);
});
