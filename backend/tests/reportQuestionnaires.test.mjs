import assert from "node:assert/strict";
import test from "node:test";
import {
  compactReportExamination,
  compactReportQuestionnaire,
} from "../dist/report/inputs/examination.js";

const pdq = {
  title: "Pain and disability questionnaire",
  completedAt: "2026-09-30T21:27:49.282Z",
  instructions:
    "0 means no limitation and 10 means the most severe limitation.",
  scores: { totalScore: 62, denominator: 15, maxScore: 150, percentage: 41.3 },
  answers: [
    {
      group: "Function",
      question: "Work inside and outside the home",
      score: 3,
      scoreRange: [0, 10],
    },
  ],
};

test("PDQ becomes percentage and question/score pairs without invented groups or redundant scoring fields", () => {
  assert.deepEqual(compactReportQuestionnaire(pdq, "2026-09-30"), {
    name: "Pain and disability questionnaire",
    question_description: pdq.instructions,
    total_score: "41.3%",
    answers: [
      { question: "Work inside and outside the home", score: "3 / 10" },
    ],
  });
  assert.equal(
    compactReportQuestionnaire(pdq, "2026-10-16").completed_on,
    "2026-09-30",
  );
});

test("unknown percentage stays unavailable, zero stays zero, and descriptive choices survive", () => {
  assert.equal(
    compactReportQuestionnaire(
      { ...pdq, scores: { ...pdq.scores, percentage: null } },
      "2026-09-30",
    ).total_score,
    null,
  );
  assert.equal(
    compactReportQuestionnaire(
      { ...pdq, scores: { ...pdq.scores, percentage: 0 } },
      "2026-09-30",
    ).total_score,
    "0%",
  );
  const choice = {
    ...pdq,
    answers: [{ ...pdq.answers[0], answerLabel: "I can walk with mild pain." }],
  };
  assert.equal(
    compactReportQuestionnaire(choice, "2026-09-30").answers[0].score,
    "3 / 10 — I can walk with mild pain.",
  );
});

test("PDQ and other questionnaires share one completed list without modifying source data", () => {
  const examination = {
    date: "2026-09-30",
    note: "Visit",
    pdq,
    questionnaires: [{ ...pdq, title: "Regional questionnaire" }],
    amaFindings: [],
  };
  const before = structuredClone(examination);
  const result = compactReportExamination(examination);
  assert.deepEqual(
    result.questionnaires_completed.map((q) => q.name),
    [pdq.title, "Regional questionnaire"],
  );
  assert.equal("pdq" in result, false);
  assert.equal("questionnaires" in result, false);
  assert.deepEqual(examination, before);
  assert.deepEqual(
    compactReportExamination({ ...examination, pdq: null, questionnaires: [] })
      .questionnaires_completed,
    [],
  );
});

test("examination findings flatten by region, retaining side, test results and non-root context", () => {
  const root = {
    diagnoses: ["Radiculopathy"],
    row: "L4 radiculopathy",
    nerveRoot: "L4",
    side: "left",
    tests: [{ test: "Strength", result: "5/5" }],
  };
  const fracture = {
    diagnoses: ["Fracture"],
    row: "Cervical vertebral fracture",
    nerveRoot: null,
    side: null,
    tests: [{ test: "Imaging confirms fracture", result: "yes" }],
  };
  const examination = {
    date: "2026-09-30",
    note: "Visit",
    pdq: null,
    questionnaires: [],
    amaFindings: [
      { region: "lumbar_spine", findings: [root, { ...root, side: "right" }] },
      { region: "cervical_spine", findings: [fracture] },
      { region: "thoracic_spine", findings: [] },
    ],
  };
  const before = structuredClone(examination);
  const result = compactReportExamination(examination);
  assert.deepEqual(result.lumbar_spine_findings, [
    { nerveRoot: "L4", side: "left", tests: root.tests },
    { nerveRoot: "L4", side: "right", tests: root.tests },
  ]);
  assert.deepEqual(result.cervical_spine_findings, [
    {
      nerveRoot: null,
      side: null,
      finding: "Cervical vertebral fracture",
      tests: fracture.tests,
    },
  ]);
  assert.equal("thoracic_spine_findings" in result, false);
  assert.equal("amaFindings" in result, false);
  assert.deepEqual(examination, before);
});
