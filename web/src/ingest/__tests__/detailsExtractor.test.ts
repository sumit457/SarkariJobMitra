import assert from "node:assert/strict";
import test from "node:test";

import { extractJobDetailsFromPdfText } from "../detailsExtractor";

test("extractJobDetailsFromPdfText parses dates, fee, age and vacancy", () => {
  const sample = `
    Gramin Dak Sevak (GDS) Online Engagement Schedule-I, January-2026
    Applications are invited from 10/02/2026 to 03/03/2026.
    Examination will be held on 14/04/2026.
    Last date for fee payment: 04/03/2026
    Correction window: 06/03/2026 to 08/03/2026
    Application Fee: General/OBC/EWS Rs. 100/- ; SC/ST/Female/PWD Nil
    Age as on 03/03/2026 Minimum Age 18 Years Maximum Age 40 Years
    Vacancy Details Total : 21413 Posts
  `;

  const details = extractJobDetailsFromPdfText("India Post", sample);

  assert.equal(details.applyBegin?.toISOString(), "2026-02-10T00:00:00.000Z");
  assert.equal(details.applyLastDate?.toISOString(), "2026-03-03T00:00:00.000Z");
  assert.equal(details.examDate?.toISOString(), "2026-04-14T00:00:00.000Z");
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

test("extractJobDetailsFromPdfText parses SBI-style vacancy table and posting details", () => {
  const sample = `
    A. DETAILS OF POSITION/DEPARTMENT/VACANCY/ PLACE OF POSTING/ ELIGIBILITY/ REMUNERATION ETC.:
    1. Name of the Position Support Officer (On Contract Basis)
    2. Department Cash Management Product Operations Centre (CMPOC), Hyderabad
    3. No. of vacancy
    SC ST OBC EWS UR Total VI
    Support Officer
    Regular 1 1 2 1 3 8 --
    Backlog -- -- 1 -- -- 1 1
    Total 1 1 3 1 3 9 1
    4. Place of posting Hyderabad
    Education: No specific educational qualification is required, since the applicants are retired officers of SBI.
    Monthly Remuneration Payable: Rs 50,000/-
  `;

  const details = extractJobDetailsFromPdfText("SBI", sample);

  assert.equal(details.positionName, "Support Officer (On Contract Basis)");
  assert.equal(details.department, "Cash Management Product Operations Centre (CMPOC), Hyderabad");
  assert.equal(details.placeOfPosting, "Hyderabad");
  assert.equal(details.qualification, "No specific educational qualification is required, since the applicants are retired officers of SBI.");
  assert.equal(details.payScale, "Rs 50,000/-");
  assert.equal(details.vacancyTotal, 9);
  assert.equal(details.categoryVacancy?.general, 3);
  assert.equal(details.categoryVacancy?.obc, 3);
  assert.equal(details.categoryVacancy?.sc, 1);
  assert.equal(details.categoryVacancy?.st, 1);
  assert.equal(details.categoryVacancy?.ews, 1);
  assert.equal(details.categoryVacancy?.total, 9);
});

test("extractJobDetailsFromPdfText does not infer application fee from unrelated category references", () => {
  const sample = `
    ONLINE REGISTRATION OF APPLICATION FROM 05.02.2026 TO 26.02.2026
    ABBREVIATIONS: Gen - General; OBC - Other Backward Classes; SC - Scheduled Caste; ST - Scheduled Tribe
    1 Clerical # Rs 30,000/-
    Candidates belonging to OBC category but coming in the creamy layer are not entitled to reservation.
  `;

  const details = extractJobDetailsFromPdfText("SBI", sample);

  assert.equal(details.feeGeneral, undefined);
  assert.equal(details.feeObc, undefined);
  assert.equal(details.feeScSt, undefined);
});

test("extractJobDetailsFromPdfText drops noisy pay scale headers without money values", () => {
  const sample = `
    RECRUITMENT OF SPECIALIST CADRE OFFICER ON CONTRACT BASIS
    Annual CTC Range: Upper Range Bifurcation of Annual CTC Contract Period
  `;

  const details = extractJobDetailsFromPdfText("SBI", sample);

  assert.equal(details.payScale, undefined);
});
