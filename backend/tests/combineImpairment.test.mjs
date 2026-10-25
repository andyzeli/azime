import assert from "node:assert/strict";
import test from "node:test";
import { combineValues, combineImpairment, combineRegionalRatings } from "../dist/ama/combineImpairment.js";

const component = (kind, wpi, extra = {}) => ({ kind, wpi, root: null, side: null, canonicalDxIds: ["dx"], label: kind, ...extra });
const root = (root, side, wpi) => component("radiculopathy", wpi, { root, side, label: `${root} ${side}` });
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);

test("CVC percentage units, descending order, no rounding or mutation", () => {
  const values = [10, 30, 20];
  near(combineValues(values), 49.6);
  assert.deepEqual(values, [10, 30, 20]);
  assert.equal(combineValues([]), 0);
  assert.equal(combineValues([100, 90]), 100);
  for (const invalid of [-1, 101, NaN, Infinity]) assert.throws(() => combineValues([invalid]));
});

test("unilateral penalty precedes CVC; bilateral values remain full", () => {
  const components = [root("L4", "left", 10), root("L5", "left", 20), root("S1", "right", 5)];
  const before = structuredClone(components);
  // Left = CVC(20, 5) = 24; bilateral = CVC(24, 5) = 27.8.
  near(combineImpairment("lumbar_spine", components).wpi, 27.8);
  assert.deepEqual(components, before);
  near(combineImpairment("lumbar_spine", [root("L5", "left", 5), root("L5", "right", 4)]).wpi, 8.8);
});

test("all subsequent ipsilateral roots halved and regional caps apply only to nerves", () => {
  near(combineImpairment("lumbar_spine", [root("L3", "left", 4), root("L4", "left", 6), root("L5", "left", 10)]).wpi, 14.446);
  for (const [region, nerve, cap] of [["lumbar_spine", "L5", 33], ["thoracic_spine", "T1", 22], ["cervical_spine", "C5", 33]]) {
    assert.equal(combineImpairment(region, [root(nerve, "left", 30), root(nerve, "right", 30)]).wpi, cap);
    near(combineImpairment(region, [root(nerve, "left", 40), component("fracture", 10)]).wpi, cap + 10 * (1 - cap / 100));
  }
});

test("subsumes linked etiologies before pending checks; unrelated conditions stay pending", () => {
  const result = combineImpairment("lumbar_spine", [root("L5", "left", 5), component("etiology", null)]);
  assert.equal(result.wpi, 5);
  assert.match(result.rationale[0], /subsumed/);
  assert.equal(combineImpairment("lumbar_spine", [root("L5", "left", 5), component("etiology", 8, { canonicalDxIds: ["other"] })]).wpi, null);
  assert.equal(combineImpairment("lumbar_spine", [root("L5", "left", null), component("etiology", 8)]).wpi, null);
});

test("bone winner, CNS subtotal and final cross-chapter CVC", () => {
  // Bone 20 wins over 10; Chapter 17 = CVC(20, 5) = 24.
  // Chapter 13 = CVC(20, 10) = 28; regional = CVC(28, 24) = 45.28.
  near(combineImpairment("lumbar_spine", [component("fracture", 10), component("aomsi", 20), root("L5", "left", 5), component("cns", 20), component("cns", 10)]).wpi, 45.28);
  assert.equal(combineImpairment("lumbar_spine", [component("fracture", 20), component("aomsi", 10)]).wpi, 20);
  assert.equal(combineImpairment("lumbar_spine", [component("fracture", 10), component("aomsi", 10)]).wpi, 10);
});

test("unresolved/unsupported values never become zero or partial totals", () => {
  for (const c of [component("cns", null), component("unsupported", 7), component("etiology", 7, { canonicalDxIds: ["other"] })])
    assert.equal(combineImpairment("lumbar_spine", [root("L5", "left", 5), c]).wpi, null);
  assert.equal(combineImpairment("lumbar_spine", []).wpi, null);
  assert.equal(combineImpairment("lumbar_spine", [component("unsupported", 0)]).wpi, 0);
  assert.equal(combineImpairment("lumbar_spine", [component("fracture", 10), component("fracture", 15)]).wpi, null);
  assert.throws(() => combineImpairment("lumbar_spine", [root("L5", "left", 5), root("L5", "left", 6)]), /Duplicate/);
});

test("global rollup filters not-MMI regions, blocks unknowns and duplicate regions", () => {
  const regions = [
    { region: "lumbar_spine", is_mmi: true, wpi: 20 },
    { region: "cervical_spine", is_mmi: true, wpi: 10 },
    { region: "thoracic_spine", is_mmi: false, wpi: null },
  ];
  near(combineRegionalRatings(regions).wpi, 28);
  assert.equal(combineRegionalRatings([{ ...regions[0], is_mmi: null }]).wpi, null);
  assert.equal(combineRegionalRatings([{ ...regions[0], wpi: null }]).wpi, null);
  assert.equal(combineRegionalRatings([regions[2]]).wpi, null);
  assert.equal(combineRegionalRatings([{ ...regions[0], wpi: 0 }]).wpi, 0);
  assert.throws(() => combineRegionalRatings([regions[0], regions[0]]), /Duplicate region/);
});
