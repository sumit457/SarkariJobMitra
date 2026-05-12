import assert from "node:assert/strict";
import test from "node:test";

import { parseSbiCurrentOpenings } from "../parsers/sbi";

test("parseSbiCurrentOpenings extracts active openings with notification and apply links", () => {
  const html = `
    <div id="jobLinks">
      <div
        class="accordion lateral accordion-close collapsed"
        data-target="#a_section0"
        data-articleid="CRPD/SCO/2099-00/99"
      >
        <p>RECRUITMENT OF SPECIALIST CADRE OFFICER ON REGULAR BASIS (Apply Online from 01.03.2099 to 20.03.2099)</p>
        <p>ADVERTISEMENT NO: CRPD/SCO/2099-00/99</p>
        <button class="btn btn-lg blue-btn">LAST DATE TO APPLY : 20-03-2099</button>
      </div>
      <div class="accordion-content collapse" id="a_section0" data-parent="#jobLinks">
        <li>DOWNLOAD ADVERTISEMENT(<a href="/documents/a_adv.pdf">English</a>/<a href="/documents/a_adv_h.pdf">Hindi</a>)</li>
        <li><a href="https://recruitment.sbi.bank.in/crpd-sco-2099-00-99/apply">APPLY ONLINE</a></li>
      </div>

      <div
        class="accordion lateral accordion-close collapsed"
        data-target="#a_section1"
        data-articleid="CRPD/SCO/2024-25/11"
      >
        <p>OLD OPENING (Apply Online from 01.01.2024 to 10.01.2024)</p>
        <p>ADVERTISEMENT NO: CRPD/SCO/2024-25/11</p>
        <button class="btn btn-lg blue-btn">LAST DATE TO APPLY : 10-01-2024</button>
      </div>
      <div class="accordion-content collapse" id="a_section1" data-parent="#jobLinks">
        <li>DOWNLOAD ADVERTISEMENT(<a href="/documents/old_adv.pdf">English</a>)</li>
        <li><a href="https://recruitment.sbi.bank.in/crpd-sco-2024-25-11/apply">APPLY ONLINE</a></li>
      </div>
    </div>
  `;

  const items = parseSbiCurrentOpenings(html, "https://sbi.bank.in/web/careers/current-openings");
  assert.equal(items.length, 1);

  const first = items[0];
  assert.match(String(first.title), /RECRUITMENT OF SPECIALIST CADRE OFFICER ON REGULAR BASIS/i);
  assert.equal(first.examId, "CRPD/SCO/2099-00/99");
  assert.equal(first.sourceOpenDate?.toISOString(), "2099-03-01T00:00:00.000Z");
  assert.equal(first.sourceCloseDate?.toISOString(), "2099-03-20T00:00:00.000Z");
  assert.match(String(first.pdfUrl), /a_adv\.pdf/i);
  assert.match(String(first.applyUrl), /recruitment\.sbi\.bank\.in/i);
});

