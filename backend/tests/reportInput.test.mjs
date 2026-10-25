import assert from "node:assert/strict";
import test from "node:test";
import {
  groupTreatmentAssessments,
  reportAmaFindings,
  reportQuestionnaire,
} from "../dist/report/input.js";

test("grouping combines exact assessments only, preserving diagnosis order and differing rationales", () => {
  const base = {
    applicability: "applicable",
    rationale: "Not documented.",
  };
  assert.deepEqual(
    groupTreatmentAssessments([
      { diagnosis: "A", ...base },
      { diagnosis: "B", ...base },
      { diagnosis: "C", ...base, rationale: "Not documented. " },
      { diagnosis: "D", ...base, applicability: "not_applicable" },
    ]),
    [
      { diagnoses: ["A", "B"], ...base },
      { diagnoses: ["C"], ...base, rationale: "Not documented. " },
      { diagnoses: ["D"], ...base, applicability: "not_applicable" },
    ],
  );
});

const questionnaire = (version = "pdq-v1") => ({
  instrumentVersion: version,
  completedAt: "2026-09-30T21:27:49.282Z",
  scores: { totalScore: 3, denominator: 1, maxScore: 10, percentage: 30 },
  questions: [
    {
      id: "activity",
      group: "Function",
      prompt: "Frozen activity wording",
      options: Array.from({ length: 11 }, (_, value) => ({
        value,
        label: String(value),
      })),
    },
  ],
  responses: [{ itemId: "activity", score: 3 }],
});

test("questionnaire retains the saved date and wording, supplies scale and removes duplicate numeric labels", () => {
  const q = reportQuestionnaire("PDQ", questionnaire());
  assert.equal(q.completedAt, "2026-09-30T21:27:49.282Z");
  assert.match(q.instructions, /0 means no limitation/);
  assert.deepEqual(q.answers, [
    {
      group: "Function",
      question: "Frozen activity wording",
      score: 3,
      scoreRange: [0, 10],
    },
  ]);
  assert.equal(
    reportQuestionnaire("Unknown", questionnaire("unknown-version"))
      .instructions,
    null,
  );
  const choice = questionnaire();
  choice.questions[0].options[3].label = "Selected descriptive response";
  assert.equal(
    reportQuestionnaire("Choice", choice).answers[0].answerLabel,
    "Selected descriptive response",
  );
});

test("AMA negative findings name only the answered criteria, without claiming absent reflexes or normal sensation", () => {
  const f = {
    rowId: "row",
    description: "L4",
    nerveRoot: "L4",
    side: "left",
    canonicalDxIds: ["dx"],
    examination: [
      {
        taskId: "reflex",
        prompt: "Compare reflexes.",
        questionIds: ["reflex_absent", "reflex_diminished"],
        motorGrade: null,
        atrophyCm: null,
      },
      {
        taskId: "sensory",
        prompt: "Assess sensation.",
        questionIds: ["sensory_status"],
        motorGrade: null,
        atrophyCm: null,
      },
    ],
    answers: [
      {
        questionId: "reflex_absent",
        group: "PE",
        prompt: "Is the specified asymmetric absent reflex finding present?",
        criterion: null,
        answer: false,
        answerLabel: null,
      },
      {
        questionId: "sensory_status",
        group: "PE",
        prompt: "Which sensory finding is present?",
        criterion: null,
        answer: "none",
        answerLabel: "None of these findings",
      },
    ],
  };
  const before = structuredClone(f);
  assert.deepEqual(reportAmaFindings(f, String).tests, [
    { test: "Compare reflexes", result: "No asymmetric absent reflex finding" },
    { test: "Assess sensation", result: "No listed sensory finding selected" },
  ]);
  assert.deepEqual(f, before);
});
