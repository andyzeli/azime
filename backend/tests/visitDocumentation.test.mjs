import assert from "node:assert/strict";
import test from "node:test";
import {
  initializeVisitDocumentation,
  saveVisitDocumentationRequestSchema,
  generatePostExamAnalysisRequestSchema,
  postExamAnalysisResponseSchema,
  postExamAnalysisSchema,
  storedPostExamAnalysisSchema,
} from "@azime/contracts";
import { buildPostExamInputSnapshot } from "../dist/ai/postExamInputSnapshot.js";
import { makePostExamAnalysis } from "../dist/ai/makePostExamAnalysis.js";
import { buildPostExamAnalysisUserPrompt } from "../dist/ai/postExamAnalysisPrompt.js";

const priorityId = "priority-0";
function fixture() {
  const trajectory = {
    direction: "Stable",
    evidenceQuality: "Sparse",
    interpretation: "Limited follow-up",
  };
  const visit = {
    id: 4,
    caseId: 1,
    revision: 2,
    createdAt: "2026-09-30T12:00:00.000Z",
    updatedAt: "2026-09-30T13:00:00.000Z",
    documentation: {
      ...initializeVisitDocumentation(),
      note: "Sitting tolerance remains 45 minutes",
      pdqId: 8,
      priorityResponses: [
        {
          region: "lumbar_spine",
          focus: "Did gains persist?",
          status: "response",
          note: "Gains persisted",
        },
        {
          region: "cervical_spine",
          focus: "Neck rotation?",
          status: "declined",
          note: null,
        },
      ],
    },
  };
  const fullReview = {
    treatments: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        treatmentId: "pt",
        treatment: "Physical therapy",
        source: "taxonomy",
        category: null,
        recordStatus: "Completed",
        recordDetail: "Eight visits",
        episodeIds: ["pt-1"],
        dispositionReviewed: true,
        physicianNote: null,
        assessments: [
          {
            canonicalDx: "strain",
            applicability: {
              value: "applicable",
              rationale: "Relevant",
              source: "ai",
              reviewStatus: "agree",
              note: null,
            },
            adequacy: {
              value: "adequately_trialed",
              rationale: "Adequate course",
              source: "physician",
              reviewStatus: "override",
              note: null,
            },
          },
        ],
      },
    ],
    inconsistencies: [],
    evidenceGaps: [],
    physicianNotes: null,
  };
  return {
    visit,
    refined: {
      id: 3,
      caseId: 1,
      region: "lumbar_spine",
      createdAt: "2026-09-30T11:00:00.000Z",
      updatedAt: "2026-09-30T11:30:00.000Z",
      inputSnapshot: {
        input: {
          caseContext: {
            caseType: "IME",
            injuryType: "specific",
            dateOfInjury: null,
          },
          scope: { region: "lumbar_spine", diagnoses: ["strain"] },
          caseSummary: {
            incidentNarrative: "Lifting injury",
            caseWideSummary: "Completed therapy",
            psychosocialFactors: null,
            statusTimeline: [],
          },
          reviewedAnalysis: {
            treatmentIssues: [],
            treatmentContext: [],
            treatmentNotes: [],
            inconsistencies: [],
            evidenceGaps: [],
            physicianNotes: null,
          },
        },
        fullReviewedAnalysis: fullReview,
      },
      analysis: {
        trajectoryAnalysis: {
          subjectiveTrajectory: trajectory,
          functionalTrajectory: trajectory,
          objectiveTrajectory: trajectory,
        },
        visitPriority: [
          {
            id: priorityId,
            focus: "Did gains persist?",
            whyItMatters: "Clarifies recovery",
            suggestedApproach: null,
          },
        ],
        schemaVersion: "draft-v2",
        sourceMetadata: { provider: "gemini", model: "test" },
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
  };
}

test("visit starts blank without inventing answers; saves require a revision", () => {
  const draft = initializeVisitDocumentation();
  assert.deepEqual(draft.priorityResponses, []);
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

test("post-exam snapshot freezes full review, the note, region responses, PDQ and provenance", () => {
  const args = fixture();
  const snapshot = buildPostExamInputSnapshot(args);
  assert.equal(
    snapshot.input.reviewedTreatmentAnalysis.treatments[0].assessments[0]
      .adequacy.value,
    "adequately_trialed",
  );
  assert.equal(snapshot.input.reviewedAnalysis, undefined);
  assert.equal(snapshot.input.refinedAnalysis.sourceMetadata, undefined);
  // Only this region's responses are included.
  assert.deepEqual(
    snapshot.input.visit.priorityResponses.map((r) => r.focus),
    ["Did gains persist?"],
  );
  assert.deepEqual(snapshot.basedOn, {
    refinedAnalysisId: 3,
    refinedAnalysisUpdatedAt: args.refined.updatedAt,
    visitDocumentationId: 4,
    visitDocumentationRevision: 2,
    pdqId: 8,
    pdqUpdatedAt: args.pdq.updatedAt,
  });
  args.visit.documentation.note = "Edited later";
  args.refined.analysis.visitPriority[0].focus = "Edited question";
  args.refined.inputSnapshot.fullReviewedAnalysis.treatments[0].recordDetail =
    "Edited history";
  args.pdq.data.responses[0].score = 10;
  assert.equal(snapshot.input.visit.note, "Sitting tolerance remains 45 minutes");
  assert.equal(
    snapshot.input.refinedAnalysis.visitPriority[0].focus,
    "Did gains persist?",
  );
  assert.equal(
    snapshot.input.reviewedTreatmentAnalysis.treatments[0].recordDetail,
    "Eight visits",
  );
  assert.equal(snapshot.input.visit.pdq.responses[0].score, 0);
});

test("snapshot rejects a visit or PDQ from another case", () => {
  for (const change of [
    (x) => {
      x.visit.caseId = 99;
    },
    (x) => {
      x.pdq.caseId = 99;
    },
  ]) {
    const args = fixture();
    change(args);
    assert.throws(() => buildPostExamInputSnapshot(args));
  }
});

test("no PDQ and unanswered priorities remain explicit", () => {
  const args = fixture();
  args.pdq = null;
  args.visit.documentation.priorityResponses = [];
  const snapshot = buildPostExamInputSnapshot(args);
  assert.equal(snapshot.input.visit.pdq, null);
  assert.equal(snapshot.basedOn.pdqId, null);
  assert.equal(snapshot.basedOn.pdqUpdatedAt, null);
  assert.deepEqual(snapshot.input.visit.priorityResponses, []);
  assert.equal(snapshot.input.refinedAnalysis.visitPriority.length, 1);
});

test("post-exam model prompt contains frozen input without persistence provenance", () => {
  const snapshot = buildPostExamInputSnapshot(fixture());
  const prompt = JSON.parse(
    buildPostExamAnalysisUserPrompt({
      ...snapshot.input,
      basedOn: snapshot.basedOn,
    }),
  );
  assert.deepEqual(prompt, snapshot.input);
  assert.equal(prompt.basedOn, undefined);
  assert.equal(prompt.visit.priorityResponses[0].focus, "Did gains persist?");
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
  const output = {
    plateauEvidence: {
      supporting: ["Persistent limitations"],
      opposing: ["Recent functional gains"],
    },
    mmiPosture: {
      direction: "Indeterminate",
      rationale: "Durability of gains remains unclear",
    },
  };
  assert.equal(postExamAnalysisSchema.safeParse(output).success, true);
  response.analysis = {
    ...output,
    schemaVersion: "draft-v1",
    sourceMetadata: { provider: "gemini", model: "test" },
  };
  assert.deepEqual(
    postExamAnalysisResponseSchema.parse(response).analysis,
    response.analysis,
  );
  assert.equal(storedPostExamAnalysisSchema.safeParse(output).success, false);
  assert.equal(
    postExamAnalysisSchema.safeParse({
      ...output,
      mmiPosture: { direction: "MMI", rationale: "" },
    }).success,
    false,
  );
  assert.equal(
    generatePostExamAnalysisRequestSchema.safeParse({}).success,
    false,
  );
  assert.equal(
    generatePostExamAnalysisRequestSchema.safeParse({ snapshotId: 0 }).success,
    false,
  );
  assert.deepEqual(
    generatePostExamAnalysisRequestSchema.parse({ snapshotId: 12 }),
    { snapshotId: 12 },
  );
});

test("post-exam generation is gated before any provider call", async () => {
  await assert.rejects(
    makePostExamAnalysis(buildPostExamInputSnapshot(fixture()).input),
    {
      name: "NotImplementedError",
      message: /awaits its final prompt and output schema/,
    },
  );
});
