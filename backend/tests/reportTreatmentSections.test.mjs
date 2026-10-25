import assert from "node:assert/strict";
import test from "node:test";
import {
  careMarkedInappropriate,
  careMarkedExhausted,
  remainingCurativeCare,
  remainingMaintenanceCare,
} from "../dist/report/inputs/treatments.js";

const assessment = (
  diagnosis,
  applicability,
  rationale = "Saved rationale",
) => ({ diagnoses: [diagnosis], applicability, rationale });
const treatment = (
  assessments,
  recommendation = null,
  exhaustion = "not_exhausted",
) => ({
  treatment: "Treatment",
  category: "conservative",
  documentedHistory: { status: "Ongoing", detail: "Saved history" },
  reviewedAssessments: assessments,
  exhaustion: { value: exhaustion, rationale: "Saved exhaustion rationale" },
  physicianRecommendation: recommendation,
});

test("partial inapplicability, uncertainty, missing assessments, and exhaustion alone do not imply inappropriate care", () => {
  const cases = [
    treatment([
      assessment("A", "applicable"),
      assessment("B", "not_applicable"),
    ]),
    treatment([assessment("A", "unclear"), assessment("B", "contraIndicated")]),
    treatment([]),
    treatment(
      [assessment("A", "applicable")],
      { disposition: "maintenance", note: null },
      "exhausted",
    ),
  ];
  assert.deepEqual(careMarkedInappropriate(cases), []);
});

test("distinct exclusion reasons retain diagnosis attribution and wording", () => {
  const result = careMarkedInappropriate([
    treatment([
      assessment("A", "not_applicable", "Does not target A"),
      assessment("B", "contraIndicated", "Contraindication for B"),
    ]),
  ]);
  assert.deepEqual(
    result.map((r) => [
      r.diagnoses_considered,
      r.decision_basis,
      r.inappropriateness_rationale,
    ]),
    [
      [["A"], "not_applicable", "Does not target A"],
      [["B"], "contraindicated", "Contraindication for B"],
    ],
  );
});

test("physician rejection keeps the actual reason and is distinct from applicability review", () => {
  const result = careMarkedInappropriate([
    treatment([assessment("A", "applicable"), assessment("B", "unclear")], {
      disposition: "not_recommended",
      note: "Physician's reason",
    }),
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].decision_basis, "physician_not_recommended");
  assert.equal(result[0].inappropriateness_rationale, "Physician's reason");
  assert.deepEqual(result[0].diagnoses_considered, ["A", "B"]);
});

test("exhausted care rolls up only applicable diagnoses and preserves maintenance disposition and source rows", () => {
  const rows = [
    treatment(
      [
        assessment("A", "applicable"),
        assessment("B", "applicable"),
        assessment("A", "applicable"),
        assessment("C", "not_applicable"),
        assessment("D", "unclear"),
        assessment("E", "contraIndicated"),
      ],
      { disposition: "maintenance", note: null },
      "exhausted",
    ),
  ];
  const before = structuredClone(rows);
  assert.deepEqual(careMarkedExhausted(rows), [
    {
      treatment: "Treatment",
      category: "conservative",
      documentedHistory: rows[0].documentedHistory,
      diagnoses_addressed: ["A", "B"],
      exhaustion_rationale: "Saved exhaustion rationale",
    },
  ]);
  assert.deepEqual(rows, before);
  assert.deepEqual(
    careMarkedExhausted([
      treatment([assessment("A", "applicable")], null, "not_exhausted"),
      treatment([assessment("A", "applicable")], null, "unclear"),
    ]),
    [],
  );
});

test("exhausted care does not invent an applicable diagnosis or drop an explicit exhaustion decision", () => {
  const rows = [
    treatment([assessment("A", "not_applicable")], null, "exhausted"),
  ];
  assert.deepEqual(careMarkedExhausted(rows)[0].diagnoses_addressed, []);
  assert.equal(careMarkedInappropriate(rows).length, 1);
});

test("remaining care keeps one applicability rationale per diagnosis without matching strings", () => {
  const row = treatment(
    [
      assessment("A", "applicable", "PT is integral to A"),
      assessment("B", "applicable", "PT is part of care for B"),
      {
        diagnoses: ["C", "D"],
        applicability: "applicable",
        rationale: "Identical text",
      },
      assessment("E", "unclear", "Needs clarification"),
      assessment("F", "not_applicable", "Not relevant"),
      assessment("G", "contraIndicated", "Saved contraindication"),
    ],
    { disposition: "curative", note: "Physician note" },
  );
  const before = structuredClone(row);
  const [result] = remainingCurativeCare([row]);
  assert.deepEqual(result.applicability_rationales, [
    { diagnosis: "A", rationale: "PT is integral to A" },
    { diagnosis: "B", rationale: "PT is part of care for B" },
    { diagnosis: "C", rationale: "Identical text" },
    { diagnosis: "D", rationale: "Identical text" },
    {
      diagnosis: "E",
      rationale: "Needs clarification",
      applicability: "unclear",
    },
    {
      diagnosis: "G",
      rationale: "Saved contraindication",
      applicability: "contraIndicated",
    },
  ]);
  assert.equal(result.exhaustion_status, row.exhaustion.value);
  assert.equal(result.exhaustion_rationale, row.exhaustion.rationale);
  assert.equal("physician_note" in result, false);
  assert.deepEqual(row, before);
  assert.deepEqual(remainingMaintenanceCare([row]), []);
});

test("physician disposition alone selects care; exhaustion is never relabeled", () => {
  const rows = [
    treatment(
      [assessment("A", "applicable")],
      { disposition: "maintenance", note: null },
      "exhausted",
    ),
    treatment(
      [assessment("A", "applicable")],
      { disposition: "curative", note: null },
      "unclear",
    ),
    treatment([assessment("A", "applicable")], {
      disposition: "not_recommended",
      note: "No",
    }),
    treatment([assessment("A", "applicable")]),
  ];
  assert.equal(remainingMaintenanceCare(rows).length, 1);
  assert.equal(
    remainingMaintenanceCare(rows)[0].exhaustion_status,
    "exhausted",
  );
  assert.equal(
    remainingMaintenanceCare(rows)[0].exhaustion_rationale,
    rows[0].exhaustion.rationale,
  );
  assert.equal(
    remainingCurativeCare(rows)[0].exhaustion_rationale,
    rows[1].exhaustion.rationale,
  );
  assert.equal(remainingCurativeCare(rows).length, 1);
  assert.equal(remainingCurativeCare(rows)[0].exhaustion_status, "unclear");
  assert.equal(
    "not_exhausted_rationale" in remainingCurativeCare(rows)[0],
    false,
  );
});
