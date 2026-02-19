import assert from "node:assert/strict";
import test from "node:test";

import { resolveJobLinks } from "../linkResolver";
import { extractUrlsFromText } from "../officialDomains";

test("extractUrlsFromText keeps only official domains", () => {
  const text = `
    Apply at https://www.indiapost.gov.in/gdsonlineengagement
    Candidate login: https://app.indiapost.gov.in/gdscandidate
    Ignore mirror: https://sarkariresult.example/jobs
  `;

  const urls = extractUrlsFromText(text);
  assert.equal(urls.length, 2);
  assert.ok(urls.some((url) => /indiapost\.gov\.in\/gdsonlineengagement/i.test(url)));
  assert.ok(urls.some((url) => /app\.indiapost\.gov\.in\/gdscandidate/i.test(url)));
});

test("resolveJobLinks keeps landing apply link as primary for India Post GDS", () => {
  const links = resolveJobLinks({
    organization: "India Post",
    titleRaw: "GDS Online Engagement",
    pdfText: `
      For online engagement visit https://www.indiapost.gov.in/gdsonlineengagement
      Candidate Login: https://app.indiapost.gov.in/gdscandidate
    `,
    notificationPdfUrl: "https://www.indiapost.gov.in/gdsonlineengagement/pdf/descriptive-notification.pdf",
  });

  const apply = links.find((link) => link.kind === "apply");
  const login = links.find((link) => link.kind === "apply_login");
  const notification = links.find((link) => link.kind === "notification");

  assert.ok(apply);
  assert.equal(apply?.isPrimary, true);
  assert.match(String(apply?.url), /indiapost\.gov\.in\/gdsonlineengagement/i);

  assert.ok(login);
  assert.match(String(login?.url), /app\.indiapost\.gov\.in\/gdscandidate/i);

  assert.ok(notification);
  assert.match(String(notification?.url), /\.pdf$/i);
});
