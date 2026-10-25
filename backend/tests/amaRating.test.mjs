import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeAmaRegion } from "@azime/contracts";
import { evaluateAmaRule, getAMARating } from "../dist/ama/getAMARating.js";

const field = (name) => ({ field: name, equals: true });
const region = "lumbar_spine";
// Synthetic reference values: test selection order, not clinical correctness.
const row = {
  row_id: "17-21-01", region_id: region, description: "Synthetic",
  nerve_roots: [], examination_tasks: [],
  questions: ["low", "high"].map(id => ({ id, type: "boolean", group: "CS", prompt: id })),
  entries: [
    { entry_id: "1A", impairment: { value: 9, unit: "WPI" }, criteria: field("low") },
    { entry_id: "2A", impairment: { value: 7, unit: "WPI" }, criteria: field("high") },
  ],
};
const assessment = (answers = {}) => ({
  id: "a", region, rowId: row.row_id, nerveRoot: null, side: null,
  canonicalDxIds: ["dx", "shared_dx"], answers, motorGrades: {}, atrophyCm: {},
});
// Both linked diagnoses supported with confirmed history unless a test says otherwise.
const scope = (dxIds = ["dx", "shared_dx"], r = region) => ({
  diagnoses: dxIds.map((canonicalDx) => ({ canonicalDx, status: "supported" })),
  amaHistory: dxIds.map((canonicalDx) => ({ region: r, canonicalDx, confirmed: true })),
});
const ratingInput = (input) => ({ ...scope(), assessments: [], rows: [], selections: [], tables: [], ...input });
const rate = (answers) => getAMARating(region, ratingInput({ assessments: [assessment(answers)], rows: [row] })).components[0];

test("three-valued rules short-circuit and count compound conditions once", () => {
  assert.equal(evaluateAmaRule({ all: [field("a"), field("b")] }, { a: false }).status, "not_met");
  assert.equal(evaluateAmaRule({ any: [field("a"), field("b")] }, { a: true }).status, "met");
  const rule = { at_least: 2, of: [{ all: [field("a"), field("b")] }, field("c"), field("d")] };
  assert.deepEqual(evaluateAmaRule(rule, { a: true, b: true, c: null }), {
    status: "unresolved", unresolvedQuestionIds: ["c", "d"],
  });
  assert.equal(evaluateAmaRule(rule, { a: true, b: true, c: true }).status, "met");
  assert.equal(evaluateAmaRule(rule, { a: false, c: false }).status, "not_met");
  assert.deepEqual(evaluateAmaRule({ any: [field("a"), field("a")] }, {}), {
    status: "unresolved", unresolvedQuestionIds: ["a"],
  });
  assert.equal(evaluateAmaRule({ field: "choice", equals: "none" }, { choice: "none" }).status, "met");
});

test("higher unresolved entry blocks lower match; select by class/grade, not WPI", () => {
  assert.equal(rate({ low: true }).status, "unresolved");
  assert.equal(rate({ low: true }).wpi, null);
  assert.deepEqual(rate({ low: true }).unresolvedQuestionIds, ["high"]);
  assert.equal(rate({ low: true, high: false }).entryId, "1A");
  assert.equal(rate({ low: true, high: true }).wpi, 7);
  // Every entry answered and none met rates 0%.
  assert.deepEqual(
    [rate({ low: false, high: false }).status, rate({ low: false, high: false }).wpi, rate({ low: false, high: false }).zeroReason],
    ["rated", 0, "no_criteria_met"]
  );
  assert.equal(rate({ low: true, high: true }).zeroReason, null);
  const graded = { ...row, entries: [row.entries[0], { ...row.entries[1], entry_id: "1B" }] };
  assert.equal(getAMARating(region, ratingInput({ rows: [graded], assessments: [assessment({ low: true, high: true })] })).components[0].entryId, "1B");
});

test("region filtering, unlinked findings, shared diagnoses and no mutation or totals", () => {
  const input = ratingInput({ rows: [row], assessments: [assessment({ high: true }), { ...assessment(), region: "cervical_spine" }] });
  const before = structuredClone(input);
  const result = getAMARating(region, input);
  assert.equal(result.components.length, 1);
  assert.deepEqual(result.components[0].canonicalDxIds, ["dx", "shared_dx"]);
  assert.equal("wpi" in result, false);
  assert.deepEqual(input, before);
  assert.deepEqual(getAMARating("thoracic_spine", input).components, []);
  const unlinked = getAMARating(region, ratingInput({ rows: [row], assessments: [{ ...assessment({ high: true }), canonicalDxIds: [] }] })).components[0];
  assert.equal(unlinked.status, "not_rated");
  assert.equal(unlinked.notRatedReason, "unlinked");
});

test("only supported diagnoses are rated; a history 'no' rates 0%", () => {
  const rateWith = (diagnoses, amaHistory) =>
    getAMARating(region, ratingInput({ diagnoses, amaHistory, rows: [row], assessments: [assessment({ high: true })] })).components[0];
  const supported = (canonicalDx) => ({ canonicalDx, status: "supported" });
  const confirmed = (canonicalDx, value = true) => ({ region, canonicalDx, confirmed: value });

  // One linked diagnosis not supported: rated for the other only.
  const partial = rateWith([supported("dx"), { canonicalDx: "shared_dx", status: "not_supported" }], [confirmed("dx"), confirmed("shared_dx")]);
  assert.equal(partial.wpi, 7);
  assert.deepEqual(partial.canonicalDxIds, ["dx"]);

  const unsupported = rateWith([{ canonicalDx: "dx", status: "not_supported" }], [confirmed("dx")]);
  assert.deepEqual([unsupported.status, unsupported.notRatedReason, unsupported.wpi], ["not_rated", "diagnosis_not_supported", null]);
  assert.deepEqual(unsupported.canonicalDxIds, ["dx", "shared_dx"]);

  // History "no" rates 0% without looking at the findings.
  const declined = rateWith([supported("dx")], [confirmed("dx", false)]);
  assert.deepEqual([declined.status, declined.wpi, declined.zeroReason, declined.entryId], ["rated", 0, "history_not_confirmed", null]);

  // Unasked history is pending, not excluded; one confirmed diagnosis is enough to rate.
  assert.equal(rateWith([supported("dx")], []).status, "pending_history");
  assert.equal(rateWith([supported("dx"), supported("shared_dx")], [confirmed("dx", false)]).status, "pending_history");
  assert.equal(rateWith([supported("dx"), supported("shared_dx")], [confirmed("dx", false), confirmed("shared_dx")]).status, "rated");
  // History answers belong to their region.
  assert.equal(rateWith([supported("dx")], [{ ...confirmed("dx"), region: "cervical_spine" }]).status, "pending_history");
});

test("invalid or duplicate assessments fail rather than produce ratings", () => {
  assert.throws(() => getAMARating(region, ratingInput({ rows: [], assessments: [assessment()] })), /Unknown AMA row/);
  assert.throws(() => getAMARating(region, ratingInput({ rows: [row], assessments: [assessment({ high: "yes" })] })), /Invalid answer/);
  assert.throws(() => getAMARating(region, ratingInput({ rows: [row], assessments: [assessment(), assessment()] })), /Duplicate assessment/);
});

test("real uploaded row uses exact entry value and keeps sides separate", async () => {
  const upload = JSON.parse(await readFile(new URL("../reference-data/ama-rows/spine.json", import.meta.url), "utf8"));
  const original = upload.find(r => r.row_id === "17-19-06");
  // Use the C4 sensory row by description to avoid depending on its numeric ID.
  const source = original?.description.includes("C4") ? original : upload.find(r => r.description.includes("C4 Nerve Root"));
  assert.ok(source);
  const reference = { ...source, region_id: normalizeAmaRegion(source.region_id) };
  const a = { ...assessment({ cs_confirmed: true, sensory_status: "sharp_dull_loss" }),
    region: reference.region_id, rowId: reference.row_id, nerveRoot: "C4", side: "left" };
  const result = getAMARating(reference.region_id, { ...ratingInput({ rows: [reference], assessments: [a, { ...a, id: "right", side: "right" }] }), ...scope(undefined, reference.region_id) });
  assert.equal(result.components.length, 2);
  assert.equal(result.components[0].entryId, "1C");
  assert.equal(result.components[0].wpi, reference.entries.find(e => e.entry_id === "1C").impairment.value);
});

test("table branch distinguishes zero, missing answers and invalid selections", () => {
  const table = {
    table_id: "synthetic", source_ref: { chapter: "13" }, class_options: [{ value: 0 }, { value: 1 }],
    mod_options: { options: [{ id: "a" }] },
    results: [{ class_value: 0, mod_option_id: "a", wpi: 0 }, { class_value: 1, mod_option_id: "a", wpi: 12 }],
  };
  const selection = { region, tableId: table.table_id, canonicalDxIds: ["dx"], classValue: 0, modOptionId: "a" };
  const evaluate = (s) => getAMARating(region, ratingInput({ selections: [s], tables: [table] })).components[0];
  assert.equal(evaluate(selection).wpi, 0);
  assert.equal(evaluate({ ...selection, classValue: 1 }).wpi, 12);
  assert.deepEqual(evaluate({ ...selection, classValue: null }).missingAnswers, ["classValue"]);
  assert.equal(evaluate({ ...selection, modOptionId: null }).status, "unresolved");
  assert.throws(() => evaluate({ ...selection, classValue: 4 }), /Invalid AMA class/);
  assert.throws(() => evaluate({ ...selection, modOptionId: "unknown" }), /Invalid AMA modifier/);
  assert.throws(() => evaluate({ ...selection, tableId: "unknown" }), /Unknown AMA table/);
  assert.throws(() => getAMARating(region, ratingInput({ selections: [selection, selection], tables: [table] })), /Duplicate AMA table/);
  const unsupported = getAMARating(region, ratingInput({ diagnoses: [{ canonicalDx: "dx", status: "not_supported" }], selections: [selection], tables: [table] })).components[0];
  assert.deepEqual([unsupported.status, unsupported.wpi], ["not_rated", null]);

  // Rows and tables in one region, one call.
  const both = getAMARating(region, ratingInput({
    rows: [row], assessments: [assessment({ high: true })],
    selections: [{ ...selection, classValue: 1 }], tables: [table],
  }));
  assert.deepEqual(both.components.map((c) => [c.method, c.wpi]), [["diagnostic_row", 7], ["class_modifier_table", 12]]);
});


test("regional result combines real root entries and preserves the response contract", async () => {
  const { amaRegionRatingResponseSchema } = await import("@azime/contracts");
  const upload = JSON.parse(await readFile(new URL("../reference-data/ama-rows/spine.json", import.meta.url), "utf8"));
  const source = upload.find(r => r.row_id === "17-19-06");
  const reference = { ...source, region_id: normalizeAmaRegion(source.region_id) };
  const a = { ...assessment({ cs_confirmed: true, sensory_status: "sharp_dull_loss" }),
    region: reference.region_id, rowId: reference.row_id, nerveRoot: "C4", side: "left" };
  const result = getAMARating(reference.region_id, { ...ratingInput({ rows: [reference], assessments: [a, { ...a, id: "right", side: "right" }] }), ...scope(undefined, reference.region_id) });
  assert.equal(result.combined.wpi, 9.75);
  assert.deepEqual(result.combinationIssues, []);
  assert.deepEqual(amaRegionRatingResponseSchema.parse(result), result);
});
