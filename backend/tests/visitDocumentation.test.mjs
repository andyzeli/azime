import assert from "node:assert/strict";
import test from "node:test";
import {
  initializeVisitDocumentation,
  saveVisitDocumentationRequestSchema,
  generatePostExamAnalysisRequestSchema,
  postExamAnalysisResponseSchema,
  postExamAnalysisSchema,
  storedPostExamAnalysisSchema,
  storedPreExamAnalysisSchema,
} from "@azime/contracts";
import { buildPostExamInputSnapshot } from "../dist/ai/postExamInputSnapshot.js";
import { buildPostExamAnalysisUserPrompt } from "../dist/ai/postExamAnalysisPrompt.js";

const assessment = (canonicalDx) => ({
  canonicalDx,
  aiApplicability: "applicable",
  aiApplicabilityRationale: "Relevant",
});
const row = (id, treatment, dxs) => ({
  id,
  suggestionReasoning: "",
  suggestionReason: null,
  treatmentId: null,
  treatment,
  source: "ai",
  recordDetail: "Eight visits",
  recordStatus: "Completed",
  episodeIds: [],
  assessments: dxs.map(assessment),
  aiExhaustion: "exhausted",
  aiExhaustionRationale: "Plateaued after a full course",
});
const agree = (dxs) => ({
  disposition: "keep",
  assessments: Object.fromEntries(dxs.map((dx) => [dx, { applicability: { action: "agree" } }])),
  exhaustion: { action: "agree" },
});

function fixture() {
  const preExam = {
    id: 3,
    updatedAt: "2026-09-30T11:00:00.000Z",
    analyzedDiagnoses: ["strain", "sij"],
    ladder: [],
    analysis: storedPreExamAnalysisSchema.parse({
      schemaVersion: "draft-v2",
      sourceMetadata: { provider: "gemini", model: "test" },
      treatmentAnalysis: [
        row("treatment-0", "Physical therapy", ["strain", "sij"]),
        row("treatment-1", "SI joint injection", ["sij"]),
      ],
      evidenceGaps: [],
      inconsistencies: [],
    }),
  };
  return {
    caseContext: { caseType: "IME", injuryType: "specific", dateOfInjury: null },
    region: "lumbar_spine",
    caseSummary: {
      id: 9,
      summary: {
        incidentNarrative: "Lifting injury",
        caseWideSummary: "Completed therapy",
        psychosocialFactors: null,
        statusTimeline: [],
      },
    },
    preExam,
    steering: {
      id: 5,
      caseId: 1,
      region: "lumbar_spine",
      revision: 7,
      createdAt: "2026-09-30T11:10:00.000Z",
      updatedAt: "2026-09-30T11:10:00.000Z",
      steering: {
        preExamAnalysisId: 3,
        preExamAnalysisUpdatedAt: preExam.updatedAt,
        treatments: {
          "treatment-0": agree(["strain", "sij"]),
          "treatment-1": agree(["sij"]),
        },
        addedTreatments: [],
        inconsistencies: {},
        evidenceGaps: {},
        notes: null,
      },
    },
    diagnoses: {
      caseId: 1,
      region: "lumbar_spine",
      revision: 4,
      updatedAt: "2026-09-30T11:20:00.000Z",
      diagnoses: [
        { canonicalDx: "strain", source: "records", status: "supported", reason: null },
        { canonicalDx: "sij", source: "records", status: "not_supported", reason: "Negative tests" },
      ],
    },
    dxLabel: (dx) => ({ strain: "Lumbar strain", sij: "SI joint dysfunction" })[dx] ?? dx,
    visit: {
      id: 4,
      caseId: 1,
      revision: 2,
      createdAt: "2026-09-30T12:00:00.000Z",
      updatedAt: "2026-09-30T13:00:00.000Z",
      documentation: {
        ...initializeVisitDocumentation(),
        note: "Sitting tolerance remains 45 minutes",
        pdqId: 8,
      },
    },
    pdq: {
      id: 8,
      caseId: 1,
      updatedAt: "2026-09-30T12:30:00.000Z",
      data: {
        instrumentVersion: "pdq-v1",
        completedAt: "2026-09-30T12:30:00.000Z",
        questions: [
          {
            id: "walking",
            group: "Function",
            prompt: "Walking",
            options: [
              { value: 0, label: "No limitation" },
              { value: 10, label: "Unable" },
            ],
          },
        ],
        responses: [{ itemId: "walking", score: 0 }],
        scores: { totalScore: 0, denominator: 1, maxScore: 10, percentage: 0 },
      },
    },
    questionnaires: [],
    amaMode: "off",
    amaRows: new Map(),
  };
}

test("visit starts blank without inventing answers; saves require a revision", () => {
  const draft = initializeVisitDocumentation();
  assert.equal(draft.priorityResponses, undefined);
  assert.equal(draft.note, "");
  assert.equal(draft.pdqId, null);
  assert.equal(
    saveVisitDocumentationRequestSchema.safeParse({ documentation: draft })
      .success,
    false,
  );
  assert.equal(
    saveVisitDocumentationRequestSchema.safeParse({
      documentation: draft,
      expectedRevision: 0,
    }).success,
    true,
  );
});

test("post-exam snapshot covers supported diagnoses only, with provenance", () => {
  const args = fixture();
  const snapshot = buildPostExamInputSnapshot(args);
  const { input } = snapshot;
  assert.deepEqual(input.diagnoses, [{ canonicalDx: "strain", label: "Lumbar strain" }]);
  // Not-supported assessments are dropped, and rows left with none disappear.
  assert.deepEqual(
    input.reviewedTreatmentAnalysis.treatments.map((t) => [t.treatment, t.assessments.map((a) => a.canonicalDx)]),
    [["Physical therapy", ["strain"]]],
  );
  assert.equal(input.visit.examinationDate, "2026-09-30");
  assert.deepEqual(snapshot.basedOn, {
    caseSummaryId: 9,
    preExamAnalysisId: 3,
    preExamAnalysisUpdatedAt: args.preExam.updatedAt,
    physicianSteeringId: 5,
    physicianSteeringRevision: 7,
    diagnosesRevision: 4,
    visitDocumentationId: 4,
    visitDocumentationRevision: 2,
    pdqId: 8,
    pdqUpdatedAt: args.pdq.updatedAt,
  });
  args.visit.documentation.note = "Edited later";
  args.pdq.data.responses[0].score = 10;
  assert.equal(input.visit.note, "Sitting tolerance remains 45 minutes");
  assert.equal(input.visit.pdq.responses[0].score, 0);
});

test("post-exam snapshot is refused until the assessment is finished", () => {
  const cases = [
    [(x) => { x.diagnoses.diagnoses[1].status = "working"; }, /Decide every diagnosis.*SI joint dysfunction/],
    [(x) => { x.diagnoses.diagnoses[0].status = "not_supported"; }, /No diagnosis in this region is supported/],
    [(x) => { x.preExam.analyzedDiagnoses = ["strain"]; }, /Analyze SI joint dysfunction first/],
    [(x) => { x.steering.id = null; }, /Save the treatment review/],
    [(x) => { x.steering.steering.preExamAnalysisUpdatedAt = "2026-09-29T00:00:00.000Z"; }, /Save the treatment review/],
    // Rows are reviewed across every listed diagnosis, not only supported ones.
    [(x) => { delete x.steering.steering.treatments["treatment-1"]; }, /1 treatment is unreviewed/],
    [(x) => { delete x.steering.steering.treatments["treatment-0"].assessments.sij; }, /1 treatment is unreviewed/],
    [(x) => { delete x.steering.steering.treatments["treatment-0"].exhaustion; }, /1 treatment is unreviewed/],
    [(x) => { x.pdq.caseId = 99; }, /PDQ belongs to a different case/],
  ];
  for (const [change, message] of cases) {
    const args = fixture();
    change(args);
    assert.throws(() => buildPostExamInputSnapshot(args), message);
  }
  // A pruned row counts as reviewed.
  const args = fixture();
  args.steering.steering.treatments["treatment-1"] = { disposition: "prune" };
  assert.doesNotThrow(() => buildPostExamInputSnapshot(args));
});

test("physician-added treatments outside the taxonomy reach pass 4, scoped to supported dx", () => {
  const args = fixture();
  const added = (id, dx) => ({
    id,
    treatmentId: null,
    treatment: `Free-text ${dx}`,
    category: "conservative",
    assessments: { [dx]: { applicability: "applicable", rationale: "Physician" } },
    exhaustion: "not_exhausted",
    exhaustionRationale: "Never tried",
  });
  args.steering.steering.addedTreatments = [
    added("6f1c1f0e-0000-4000-8000-000000000001", "strain"),
    added("6f1c1f0e-0000-4000-8000-000000000002", "sij"),
  ];
  const { treatments } = buildPostExamInputSnapshot(args).input.reviewedTreatmentAnalysis;
  const row = treatments.find((t) => t.source === "physician");
  assert.equal(treatments.filter((t) => t.source === "physician").length, 1);
  assert.equal(row.treatment, "Free-text strain");
  assert.equal(row.treatmentId, null);
  assert.equal(row.exhaustion.value, "not_exhausted");
  assert.equal(row.exhaustion.source, "physician");
});

test("no PDQ remains explicit", () => {
  const args = fixture();
  args.pdq = null;
  const snapshot = buildPostExamInputSnapshot(args);
  assert.equal(snapshot.input.visit.pdq, null);
  assert.equal(snapshot.basedOn.pdqId, null);
  assert.equal(snapshot.basedOn.pdqUpdatedAt, null);
});

test("post-exam model prompt contains frozen input without persistence provenance", () => {
  const snapshot = buildPostExamInputSnapshot(fixture());
  const prompt = buildPostExamAnalysisUserPrompt({
    ...snapshot.input,
    basedOn: snapshot.basedOn,
  });
  const json = JSON.parse(prompt.slice(prompt.indexOf("{")));
  assert.deepEqual(json, snapshot.input);
  assert.equal(json.basedOn, undefined);
});

test("post-exam response supports an unanalyzed snapshot and a validated output", () => {
  const response = {
    id: 12,
    caseId: 1,
    region: "lumbar_spine",
    inputSnapshot: buildPostExamInputSnapshot(fixture()),
    analysis: null,
    createdAt: "2026-09-30T12:00:00.000Z",
    updatedAt: "2026-09-30T12:00:00.000Z",
  };
  assert.equal(postExamAnalysisResponseSchema.parse(response).analysis, null);
  const trajectory = { direction: "Stable", evidenceQuality: "Moderate", interpretation: "Comparable findings" };
  const output = {
    trajectory: { subjective: trajectory, functional: trajectory, objective: trajectory },
    plateauEvidence: {
      supporting: ["Sitting tolerance 45 minutes at discharge and today"],
      opposing: ["Recent functional gains"],
    },
    mmiPosture: { direction: "Indeterminate", rationale: "Durability of gains remains unclear" },
  };
  assert.equal(postExamAnalysisSchema.safeParse(output).success, true);
  response.analysis = {
    ...output,
    schemaVersion: "draft-v2",
    sourceMetadata: { provider: "gemini", model: "test" },
  };
  assert.deepEqual(postExamAnalysisResponseSchema.parse(response).analysis, response.analysis);
  // Existing saved analyses remain readable; the retired field is discarded.
  const legacyAnalysis = {
    ...response.analysis,
    unresolvedQuestions: [
      { question: "Did gains persist?", whyItMatters: "Plateau", wouldResolve: "Therapy discharge note" },
    ],
  };
  assert.deepEqual(
    postExamAnalysisResponseSchema.parse({ ...response, analysis: legacyAnalysis }).analysis,
    response.analysis,
  );
  assert.equal("unresolvedQuestions" in postExamAnalysisSchema.shape, false);
  assert.equal(storedPostExamAnalysisSchema.safeParse(output).success, false);
  assert.equal(
    postExamAnalysisSchema.safeParse({ ...output, mmiPosture: { direction: "MMI", rationale: "" } }).success,
    false,
  );
  assert.equal(generatePostExamAnalysisRequestSchema.safeParse({}).success, false);
  assert.equal(generatePostExamAnalysisRequestSchema.safeParse({ snapshotId: 0 }).success, false);
  assert.deepEqual(generatePostExamAnalysisRequestSchema.parse({ snapshotId: 12 }), { snapshotId: 12 });
});
