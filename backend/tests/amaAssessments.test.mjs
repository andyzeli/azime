import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeAmaRegion, visitDocumentationSchema } from "@azime/contracts";
import { amaAssessmentProblems } from "../dist/ama/assessments.js";
import { freezeAmaFindings } from "../dist/ama/findings.js";

const rows = new Map(
  JSON.parse(await readFile(new URL("../../docs/ama-spine.upload.json", import.meta.url), "utf8")).map((row) => [
    row.row_id,
    { ...row, region_id: normalizeAmaRegion(row.region_id) },
  ]),
);
const l5 = (overrides = {}) => ({
  id: "a1",
  region: "lumbar_spine",
  canonicalDxIds: ["lumbar_disc_herniation", "lumbar_radiculopathy"],
  rowId: "17-21-07",
  nerveRoot: "L5",
  side: "left",
  answers: {},
  motorGrades: {},
  atrophyCm: {},
  ...overrides,
});

test("valid root and non-root assessments, with separate sides", () => {
  assert.deepEqual(
    amaAssessmentProblems(
      [
        l5({ answers: { sensory_status: "diminished_pinprick", cs_confirmed: true, neural_tension: null } }),
        l5({ id: "a2", side: "right" }),
        l5({ id: "a3", rowId: "17-21-09", nerveRoot: null, side: null, canonicalDxIds: ["lumbar_fracture"] }),
        l5({ id: "a4", rowId: "17-20-04", region: "thoracic_spine", nerveRoot: "T7" }),
      ],
      rows,
    ),
    [],
  );
});

test("rejects duplicates, wrong roots/sides/regions and invalid answers", () => {
  const problems = (a) => amaAssessmentProblems(a, rows);
  assert.equal(problems([l5(), l5({ id: "a2" })]).length, 1);
  assert.equal(problems([l5({ nerveRoot: "S1" })]).length, 1);
  assert.equal(problems([l5({ side: null })]).length, 1);
  assert.equal(problems([l5({ region: "cervical_spine" })]).length, 1);
  assert.equal(problems([l5({ rowId: "17-21-09", nerveRoot: null, side: "left" })]).length, 1);
  assert.equal(problems([l5({ answers: { nope: true } })]).length, 1);
  assert.equal(problems([l5({ answers: { cs_confirmed: "yes" } })]).length, 1);
  assert.equal(problems([l5({ answers: { sensory_status: "made_up" } })]).length, 1);
});

test("motor answers are derived from muscle grades", () => {
  const problems = (a) => amaAssessmentProblems([l5(a)], rows);
  const derived = { motor_4: true, motor_3: true, motor_2: false, motor_0_to_1: false };
  assert.deepEqual(
    problems({ motorGrades: { great_toe_extensor_strength: "4", ankle_dorsiflexion_strength: "3" }, answers: derived }),
    [],
  );
  // Normal strength everywhere: every grade criterion is not met.
  assert.deepEqual(
    problems({
      motorGrades: { ankle_inversion_strength: "5" },
      answers: { motor_4: false, motor_3: false, motor_2: false, motor_0_to_1: false },
    }),
    [],
  );
  assert.equal(problems({ answers: { motor_4: true } }).length, 1);
  assert.equal(problems({ motorGrades: { ankle_dorsiflexion_strength: "3" }, answers: {} }).length, 4);
  assert.equal(problems({ motorGrades: { hip_flexion_strength: "4" }, answers: { ...derived, motor_3: false } }).length, 1);
  assert.equal(
    amaAssessmentProblems(
      [l5({ rowId: "17-21-08", nerveRoot: "S1", motorGrades: { s1_single_leg_heel_raises: "4" }, answers: { motor_4: true, motor_3: false, motor_2: false, motor_0_to_1: false } })],
      rows,
    ).length,
    1,
  );
});

test("atrophy answers are derived from per-site measurements", () => {
  const problems = (a) => amaAssessmentProblems([l5(a)], rows);
  // Any site in a band meets it; once a site is measured, the other bands are not met.
  assert.deepEqual(
    problems({
      atrophyCm: { thigh_circumference: 1.8, calf_circumference: 0.4 },
      answers: { atrophy: false, atrophy_2: true, atrophy_3: false, atrophy_4: false },
    }),
    [],
  );
  assert.equal(problems({ answers: { atrophy_2: true } }).length, 1);
  assert.equal(problems({ atrophyCm: { thigh_circumference: 1.2 }, answers: {} }).length, 4);
  assert.equal(problems({ atrophyCm: { forearm_circumference: 2 }, answers: {} }).length, 1);
  // L3: the >2 to ≤3 cm calf band uses the lower patellar border, not the medial joint line.
  assert.deepEqual(
    amaAssessmentProblems(
      [
        l5({
          rowId: "17-21-05",
          nerveRoot: "L3",
          atrophyCm: { calf_circumference: 2.5 },
          answers: { atrophy: false, atrophy_2: false, atrophy_4: false },
        }),
      ],
      rows,
    ),
    [],
  );
});

test("old visits parse with no assessments and no history answer", () => {
  const doc = visitDocumentationSchema.parse({
    note: "",
    pdqId: null,
    includedQuestionnaireIds: [],
    priorityResponses: [],
    diagnosisReviews: [
      { region: "lumbar_spine", canonicalDx: "x", status: "confirmed", note: null, refinedUpdatedAt: "t" },
    ],
  });
  assert.deepEqual(doc.amaAssessments, []);
  const [a] = visitDocumentationSchema.parse({ ...doc, amaAssessments: [l5({ motorGrades: undefined, atrophyCm: undefined })] }).amaAssessments;
  assert.deepEqual(a.motorGrades, {});
  assert.deepEqual(a.atrophyCm, {});
  assert.equal(doc.diagnosisReviews[0].amaHistoryConfirmed, null);
});

test("frozen findings trace each answer to the test that produced it", () => {
  const frozen = freezeAmaFindings(
    l5({
      motorGrades: { ankle_dorsiflexion_strength: "4" },
      atrophyCm: { calf_circumference: 1.8 },
      answers: {
        neural_tension: true,
        motor_4: true, motor_3: false, motor_2: false, motor_0_to_1: false,
        atrophy: false, atrophy_2: true, atrophy_3: false, atrophy_4: false,
        sensory_status: "none",
      },
    }),
    rows.get("17-21-07"),
  );
  assert.deepEqual(
    frozen.examination.map((t) => [t.taskId, t.motorGrade, t.atrophyCm]),
    [
      ["l5_sensory_assessment", null, null],
      ["l5_straight_leg_raise", null, null],
      ["ankle_dorsiflexion_strength", "4", null],
      ["calf_circumference", null, 1.8],
    ],
  );
  const slr = frozen.answers.find((a) => a.questionId === "neural_tension");
  assert.equal(slr.answer, true);
  assert.match(slr.prompt, /straight leg raise/);
  assert.equal(frozen.answers.find((a) => a.questionId === "sensory_status").answerLabel, "None of these findings");
  assert.equal(frozen.answers.some((a) => a.questionId === "cs_confirmed"), false);
});
