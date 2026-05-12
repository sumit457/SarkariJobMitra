import assert from "node:assert/strict";
import test from "node:test";

import { resolveApplyDates } from "../dateSelection";

test("resolveApplyDates prefers PDF-derived dates over noisy source listing dates", () => {
  const resolved = resolveApplyDates({
    details: {
      applyBegin: new Date("2026-02-05T00:00:00.000Z"),
      applyLastDate: new Date("2026-02-26T00:00:00.000Z"),
    },
    sourceOpenDate: new Date("2026-03-08T00:00:00.000Z"),
    sourceCloseDate: new Date("2026-03-08T00:00:00.000Z"),
  });

  assert.equal(resolved.applyBegin?.toISOString(), "2026-02-05T00:00:00.000Z");
  assert.equal(resolved.applyLastDate?.toISOString(), "2026-02-26T00:00:00.000Z");
});

test("resolveApplyDates falls back to source dates when PDF-derived dates are missing", () => {
  const resolved = resolveApplyDates({
    details: {},
    sourceOpenDate: new Date("2026-03-08T00:00:00.000Z"),
    sourceCloseDate: new Date("2026-03-08T00:00:00.000Z"),
  });

  assert.equal(resolved.applyBegin?.toISOString(), "2026-03-08T00:00:00.000Z");
  assert.equal(resolved.applyLastDate?.toISOString(), "2026-03-08T00:00:00.000Z");
});
