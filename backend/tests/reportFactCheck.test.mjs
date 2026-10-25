import assert from "node:assert/strict";
import test from "node:test";
import { reportFactCheck } from "@azime/contracts";

const input = (mmi, wpi) => ({
  discussion: {
    regions: [{ region: "lumbar_spine", mmi, impairment: wpi === null ? null : { wpi } }],
    wholePerson: { allAtMmi: true, impairment: wpi === null ? null : { wpi, rationale: [] } },
  },
});
const atMmi = { status: "at_mmi", date: "2026-10-16", note: "" };

test("MMI dates match in common formats", () => {
  for (const text of ["MMI as of 2026-10-16", "on 10/16/2026", "October 16, 2026"])
    assert.deepEqual(reportFactCheck(input(atMmi, null), text), []);
  assert.deepEqual(reportFactCheck(input(atMmi, null), "MMI was reached."), ["lumbar_spine: MMI date 2026-10-16"]);
});

test("impairment values match exact, one decimal or rounded, but not inside other numbers", () => {
  for (const text of ["7.375% WPI", "7.4 % whole person", "rated 7% WPI"])
    assert.deepEqual(reportFactCheck(input(atMmi, 7.375), `2026-10-16 ${text}`), []);
  assert.equal(reportFactCheck(input(atMmi, 7.375), "2026-10-16 17% WPI").length, 2);
  assert.deepEqual(reportFactCheck(input({ status: "not_at_mmi", note: "", reevaluateIn: null }, null), "Not at MMI."), []);
});
