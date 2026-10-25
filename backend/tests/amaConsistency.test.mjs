import assert from "node:assert/strict";
import test from "node:test";
import { radiculopathyCheck } from "@azime/contracts";

const region = "lumbar_spine";
const pe = (id, extra = {}) => ({ id, type: "boolean", group: "PE", prompt: id, ...extra });
// Synthetic L5 row: one sensory choice, one boolean sign, plus a CS question that never counts.
const rootRow = {
  row_id: "17-21-07", region_id: region, description: "L5", nerve_roots: ["L5"],
  examination_tasks: [], entries: [],
  questions: [
    pe("sensory_status", {
      type: "choice",
      options: ["symptoms_without_objective_loss", "diminished_pinprick", "none"].map((value) => ({ value, label: value })),
    }),
    pe("neural_tension"),
    { id: "cs_confirmed", type: "boolean", group: "CS", prompt: "cs" },
  ],
};
const otherRow = { ...rootRow, row_id: "17-21-10", nerve_roots: [], questions: [pe("neural_tension")] };
const assessment = (answers, rowId = rootRow.row_id) => ({
  id: rowId, region, rowId, nerveRoot: rowId === rootRow.row_id ? "L5" : null,
  side: rowId === rootRow.row_id ? "left" : null, canonicalDxIds: ["lumbar_disc_herniation"],
  answers, motorGrades: {}, atrophyCm: {},
});
const check = (dx, assessments) => radiculopathyCheck(region, dx, assessments, [rootRow, otherRow]);
const rad = ["lumbar_radiculopathy"];
const negative = { sensory_status: "none", neural_tension: false };

test("positive root findings without radiculopathy diagnosed are flagged", () => {
  assert.deepEqual(check([], [assessment({ neural_tension: true })]), {
    kind: "findings_without_diagnosis",
    components: [{ nerveRoot: "L5", side: "left" }],
  });
  assert.equal(check([], [assessment({ sensory_status: "diminished_pinprick" })])?.kind, "findings_without_diagnosis");
  assert.equal(check(rad, [assessment({ neural_tension: true })]), null);
});

test("symptoms count only with study confirmation; studies alone and non-root rows never do", () => {
  const symptoms = { sensory_status: "symptoms_without_objective_loss" };
  assert.equal(check([], [assessment({ ...symptoms, cs_confirmed: true })])?.kind, "findings_without_diagnosis");
  assert.equal(check([], [assessment({ ...symptoms, cs_confirmed: false })]), null);
  assert.equal(check([], [assessment({ sensory_status: "none", cs_confirmed: true })]), null);
  assert.equal(check([], [assessment({ neural_tension: true }, otherRow.row_id)]), null);
});

test("radiculopathy with every root's exam answered and negative is flagged", () => {
  assert.equal(check(rad, [assessment(negative)])?.kind, "diagnosis_without_findings");
  const symptoms = { ...negative, sensory_status: "symptoms_without_objective_loss" };
  assert.equal(check(rad, [assessment(symptoms)])?.kind, "diagnosis_without_findings");
  assert.equal(check(rad, [assessment({ ...symptoms, cs_confirmed: true })]), null);
  // Still being recorded, or no roots chosen: nothing to say yet.
  assert.equal(check(rad, [assessment({ sensory_status: "none" })]), null);
  assert.equal(check(rad, []), null);
  assert.equal(check([], [assessment(negative)]), null);
});
