import assert from "node:assert/strict";
import test from "node:test";
import { collapseMedications, collapseWorkStatus, compactAmaFindings, compactQuestionnaire } from "../dist/report/history.js";

const work = (date, status, restrictions = []) => ({ recordId: 1, documentType: "encounter", date, status, restrictions });

test("consecutive identical work statuses collapse into one period", () => {
  assert.deepEqual(
    collapseWorkStatus([
      work("2025-01-01", "off_work"),
      work("2025-02-01", "modified_duty", ["No lifting", "Sit/stand"]),
      work("2025-03-01", "modified_duty", ["Sit/stand", "No lifting"]),
      work("2025-04-01", "full_duty"),
      work("2025-05-01", "off_work"),
    ]),
    [
      { from: "2025-01-01", to: "2025-01-01", status: "off_work", restrictions: [] },
      { from: "2025-02-01", to: "2025-03-01", status: "modified_duty", restrictions: ["No lifting", "Sit/stand"] },
      { from: "2025-04-01", to: "2025-04-01", status: "full_duty", restrictions: [] },
      { from: "2025-05-01", to: "2025-05-01", status: "off_work", restrictions: [] },
    ]
  );
});

test("medications collapse by name across encounters", () => {
  const med = (date, medication, dose, action) => ({ recordId: 1, date, medication, dose, action });
  assert.deepEqual(
    collapseMedications([
      med("2025-01-01", "Naproxen", "500 mg", "Ordered"),
      med("2025-02-01", "naproxen ", "500 mg", "Current"),
      med("2025-03-01", "Naproxen", "250 mg", "Stopped"),
      med("2025-03-01", " ", "", "Current"),
    ]),
    [{ medication: "Naproxen", doses: ["500 mg", "250 mg"], firstDate: "2025-01-01", lastDate: "2025-03-01", lastAction: "Stopped" }]
  );
});

test("questionnaires keep only the chosen answer per question", () => {
  const q = {
    instrumentVersion: "v1", completedAt: "2026-01-01T00:00:00Z",
    questions: [{ id: "a", group: "Function", prompt: "Walking", options: [{ value: 0, label: "None" }, { value: 3, label: "Some" }] }],
    responses: [{ itemId: "a", score: 3 }],
    scores: { totalScore: 3, denominator: 1, maxScore: 10, percentage: 30 },
  };
  assert.deepEqual(compactQuestionnaire("PDQ", q).answers, [{ group: "Function", question: "Walking", answer: "Some", score: 3 }]);
});

const answer = (questionId, prompt, value, criterion = null, answerLabel = null) =>
  ({ questionId, group: "PE", prompt, criterion, answer: value, answerLabel });
const task = (prompt, questionIds, motorGrade = null, atrophyCm = null) =>
  ({ taskId: prompt, prompt, questionIds, motorGrade, atrophyCm });
const findings = (examination, answers, nerveRoot = "L5") => ({
  rowId: "17-21-07", description: "L5 row", nerveRoot, side: "left",
  canonicalDxIds: ["dx"], examination, answers,
});

test("AMA findings become test/result pairs without derived answers or reference guidance", () => {
  const compact = compactAmaFindings(findings([
    task("Assess toe strength.", ["motor_3"], "3"),
    task("Measure the calf.", ["atrophy"], null, 0),
    task("Assess sensation.", ["sensory_status"]),
    task("Assess neural tension.", ["neural_tension"]),
    task("Assess sensory criterion.", ["sensory_criterion"]),
    task("Compare knee reflexes between sides.", ["reflex_absent", "reflex_diminished"]),
  ], [
    answer("sensory_status", "Which sensory finding is present?", "sharp_dull_loss", null, "Loss of sharp/dull discrimination"),
    answer("cs_confirmed", "Is this nerve-root diagnosis supported by at least one of the listed alternatives?", true, "MRI confirmation\n\nLong guidance"),
    answer("neural_tension", "Is the specified straight leg raise test positive?", false),
    answer("sensory_criterion", "Is the sensory criterion met?", true),
    answer("reflex_absent", "Is the specified asymmetric absent reflex finding present?", true),
    answer("reflex_diminished", "Is the specified asymmetric diminished reflex finding present?", false),
    answer("motor_3", "Derived grade", true),
    answer("atrophy", "Derived measurement", false),
  ]), (dx) => `label ${dx}`);
  assert.deepEqual(compact, {
    diagnoses: ["label dx"], row: "L5 row", nerveRoot: "L5", side: "left",
    tests: [
      { test: "Assess toe strength", result: "3/5" },
      { test: "Measure the calf", result: "0 cm" },
      { test: "Assess sensation", result: "Loss of sharp/dull discrimination" },
      { test: "Assess neural tension", result: "negative" },
      { test: "Assess sensory criterion", result: "yes" },
      { test: "Compare knee reflexes between sides", result: "asymmetric absent reflex" },
      { test: "Nerve root confirmed by imaging, electrodiagnosis or surgery", result: "yes" },
    ],
  });
});

test("AMA reflex groups retain multiple positive findings or none", () => {
  for (const [value, result] of [[true, "asymmetric absent reflex; asymmetric diminished reflex"], [false, "none"]]) {
    const compact = compactAmaFindings(findings([
      task("Compare reflexes.", ["reflex_absent", "reflex_diminished"]),
    ], [
      answer("reflex_absent", "Is the specified asymmetric absent reflex finding present?", value),
      answer("reflex_diminished", "Is the specified asymmetric diminished reflex finding present?", value),
    ]), String);
    assert.deepEqual(compact.tests, [{ test: "Compare reflexes", result }]);
  }
});

test("AMA unlinked criteria and history retain confirmations and choice labels", () => {
  const compact = compactAmaFindings(findings([], [
    answer("fracture_1", "Confirm this fracture criterion?", true, "Compression fracture.\nFurther guidance"),
    answer("fracture_2", "Confirm this fracture criterion?", false, "Burst fracture.\nFurther guidance"),
    answer("history", "Prior surgery?", false),
    answer("instability", "Do radiographs meet one of the listed criteria?", true, "by flexion and extension radiographs (one of the following)\n- Translation"),
    answer("fusion_extent", "What does imaging confirm?", "single", null, "Single-level fusion"),
    answer("cs_confirmed", "Do imaging or operative findings support this diagnosis?", true),
  ], null), String);
  assert.deepEqual(compact.tests, [
    { test: "Compression fracture", result: "yes" },
    { test: "Burst fracture", result: "no" },
    { test: "Prior surgery", result: "no" },
    { test: "Do radiographs meet one of the listed criteria", result: "yes" },
    { test: "What does imaging confirm", result: "Single-level fusion" },
    { test: "Do imaging or operative findings support this diagnosis", result: "yes" },
  ]);
});

test("AMA grades preserve range and zero; unresolved and derived-only tasks are omitted", () => {
  const compact = compactAmaFindings(findings([
    task("Assess strength.", ["motor_0_to_1"], "0_to_1"),
    task("Unanswered test.", ["missing"]),
    task("Derived-only task.", ["motor_3"]),
  ], [answer("motor_3", "Derived", true)]), String);
  assert.deepEqual(compact.tests, [
    { test: "Assess strength", result: "0–1/5" },
  ]);
});

test("AMA single yes/no findings read positive/negative, present/absent, otherwise yes/no", () => {
  const compact = compactAmaFindings(findings([
    task("Straight leg raise.", ["slr"]),
    task("Look for the finding.", ["finding"]),
    task("Review the examination.", ["pe_consistent"]),
  ], [
    answer("slr", "Is the specified straight leg raise test positive?", true),
    answer("finding", "Is the specified finding present?", false),
    answer("pe_consistent", "Is the physical examination consistent with this diagnosis?", true),
  ], null), String);
  assert.deepEqual(compact.tests, [
    { test: "Straight leg raise", result: "positive" },
    { test: "Look for the finding", result: "absent" },
    { test: "Review the examination", result: "yes" },
  ]);
});
