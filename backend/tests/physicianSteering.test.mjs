import assert from "node:assert/strict";
import test from "node:test";
import {
  initializePhysicianSteering,
  physicianSteeringResponseSchema,
  physicianSteeringSchema,
  resolvePreExamReview,
  savePhysicianSteeringRequestSchema,
  steeringMatchesAnalysis,
  storedPreExamAnalysisSchema,
} from "@azime/contracts";
import { validatePhysicianSteeringReferences } from "../dist/ai/physicianSteeringSchema.js";

const rowId = "11111111-1111-4111-8111-111111111111";
const gapId = "22222222-2222-4222-8222-222222222222";
const conflictId = "33333333-3333-4333-8333-333333333333";
const addedId = "44444444-4444-4444-8444-444444444444";
const identity = { id: 12, updatedAt: "2026-09-29T12:00:00.000Z" };
const analysis = storedPreExamAnalysisSchema.parse({
  schemaVersion: "draft-v2",
  sourceMetadata: { provider: "gemini", model: "test" },
  treatmentAnalysis: [
    {
      id: rowId,
      suggestionReasoning: "",
      suggestionReason: null,
      treatmentId: "pt",
      treatment: "Physical therapy",
      source: "taxonomy",
      recordDetail: "Two visits documented",
      recordStatus: "Completed",
      episodeIds: ["episode-1"],
      assessments: ["strain", "disc_herniation"].map((canonicalDx) => ({
        canonicalDx,
        aiApplicability: "applicable",
        aiApplicabilityRationale: "Addresses this diagnosis",
        aiAdequacy: "adequately_trialed",
        aiAdequacyRationale: "Original AI reasoning",
      })),
    },
  ],
  evidenceGaps: [
    { id: gapId, gap: "Visit count", significance: "Uncertain duration" },
  ],
  inconsistencies: [
    { id: conflictId, description: "Conflicting duration", type: "Record" },
  ],
});
const snapshot = {
  scope: { region: "lumbar_spine", diagnoses: ["strain", "disc_herniation"] },
  ladder: [{ treatmentId: "pt" }],
  treatmentEpisodes: [{ id: "episode-1" }],
};
const addedTreatment = {
  id: addedId,
  treatmentId: null,
  treatment: "Physician-suggested treatment",
  category: "conservative",
  episodeIds: [],
  assessments: {
    strain: {
      applicability: "applicable",
      adequacy: "not_tried",
      rationale: "Physician judgment",
    },
  },
};
const draft = () => initializePhysicianSteering(identity);

test("initialization returns independent sparse drafts without recording agreement", () => {
  const first = draft();
  const second = draft();
  assert.deepEqual(physicianSteeringSchema.parse(first), first);
  assert.deepEqual(first.treatments, {});
  first.treatments[rowId] = { disposition: "prune" };
  assert.deepEqual(second.treatments, {});
  const review = resolvePreExamReview(analysis, second);
  assert.equal(review.treatmentAnalysis[0].dispositionReviewed, false);
  assert.equal(
    review.treatmentAnalysis[0].assessments[0].adequacy.reviewStatus,
    "unreviewed",
  );
  assert.equal(review.evidenceGaps[0].reviewed, false);
});

test("resuming steering clones decisions; a replaced 3A with the same ID starts fresh", () => {
  const saved = draft();
  saved.treatments[rowId] = { disposition: "prune" };
  const resumed = initializePhysicianSteering(identity, saved);
  assert.deepEqual(resumed, saved);
  resumed.treatments[rowId].disposition = "keep";
  assert.equal(saved.treatments[rowId].disposition, "prune");
  for (const next of [
    { ...identity, id: 13 },
    { ...identity, updatedAt: "2026-09-29T13:00:00.000Z" },
  ]) {
    assert.equal(steeringMatchesAnalysis(saved, next), false);
    assert.deepEqual(initializePhysicianSteering(next, saved).treatments, {});
  }
});

test("agreement and override apply independently per diagnosis without changing 3A", () => {
  const steering = draft();
  steering.treatments[rowId] = {
    disposition: "keep",
    assessments: {
      strain: {
        applicability: { action: "agree", note: "Reviewed" },
        adequacy: {
          action: "override",
          value: "inadequately_trialed",
          rationale: "Only two visits",
        },
      },
    },
  };
  const before = structuredClone({ analysis, steering });
  validatePhysicianSteeringReferences(steering, analysis, snapshot);
  const review = resolvePreExamReview(analysis, steering);
  const [strain, disc] = review.treatmentAnalysis[0].assessments;
  assert.equal(strain.applicability.reviewStatus, "agree");
  assert.equal(strain.applicability.note, "Reviewed");
  assert.equal(strain.adequacy.value, "inadequately_trialed");
  assert.equal(strain.adequacy.source, "physician");
  assert.equal(strain.aiAdequacy, "adequately_trialed");
  assert.equal(disc.adequacy.value, "adequately_trialed");
  assert.equal(disc.adequacy.reviewStatus, "unreviewed");
  assert.deepEqual({ analysis, steering }, before);
  review.treatmentAnalysis[0].episodeIds.push("preview-only");
  assert.deepEqual(analysis.treatmentAnalysis[0].episodeIds, ["episode-1"]);
});

test("pruning and dismissing preserve evidence and can be undone by removing decisions", () => {
  const steering = draft();
  steering.treatments[rowId] = { disposition: "prune" };
  steering.evidenceGaps[gapId] = {
    disposition: "dismiss",
    reason: "Resolved at review",
  };
  steering.inconsistencies[conflictId] = { disposition: "keep" };
  const review = resolvePreExamReview(analysis, steering);
  assert.equal(review.treatmentAnalysis[0].active, false);
  assert.deepEqual(review.treatmentAnalysis[0].episodeIds, ["episode-1"]);
  assert.equal(review.evidenceGaps[0].disposition, "dismiss");
  assert.equal(review.evidenceGaps[0].gap, analysis.evidenceGaps[0].gap);
  assert.equal(review.inconsistencies[0].reviewed, true);
  delete steering.treatments[rowId];
  assert.equal(
    resolvePreExamReview(analysis, steering).treatmentAnalysis[0].active,
    true,
  );
});

test("physician-added treatments retain their origin and do not invent record history", () => {
  const steering = draft();
  steering.addedTreatments = [structuredClone(addedTreatment)];
  validatePhysicianSteeringReferences(steering, analysis, snapshot);
  const review = resolvePreExamReview(analysis, steering);
  assert.equal(review.addedTreatments[0].source, "physician");
  assert.deepEqual(review.addedTreatments[0].episodeIds, []);
  review.addedTreatments[0].assessments.strain.rationale = "Changed in preview";
  assert.equal(
    steering.addedTreatments[0].assessments.strain.rationale,
    "Physician judgment",
  );
});

test("saves require valid judgment values and a nonblank override rationale", () => {
  for (const override of [
    { action: "override", value: "inadequately_trialed", rationale: " " },
    { action: "override", value: "made_up", rationale: "Reason" },
    { action: "disagree" },
  ]) {
    const steering = draft();
    steering.treatments[rowId] = {
      assessments: { strain: { adequacy: override } },
    };
    assert.equal(physicianSteeringSchema.safeParse(steering).success, false);
  }
  assert.equal(
    savePhysicianSteeringRequestSchema.safeParse({
      steering: draft(),
      expectedRevision: 0,
    }).success,
    true,
  );
  assert.equal(
    savePhysicianSteeringRequestSchema.safeParse({ steering: draft() }).success,
    false,
  );
});

test("review references must belong to the supplied regional analysis", () => {
  for (const patch of [
    { treatments: { [addedId]: { disposition: "keep" } } },
    {
      treatments: {
        [rowId]: {
          assessments: { unrelated_dx: { adequacy: { action: "agree" } } },
        },
      },
    },
    { evidenceGaps: { [conflictId]: { disposition: "dismiss" } } },
    { inconsistencies: { [gapId]: { disposition: "keep" } } },
  ]) {
    assert.throws(
      () =>
        validatePhysicianSteeringReferences(
          { ...draft(), ...patch },
          analysis,
          snapshot,
        ),
      (error) => error.statusCode === 400,
    );
  }
});

test("added treatments validate IDs, scoped diagnoses, taxonomy and episode references", () => {
  const invalidTreatments = [
    [{ ...addedTreatment, id: rowId }],
    [addedTreatment, addedTreatment],
    [{ ...addedTreatment, assessments: {} }],
    [
      {
        ...addedTreatment,
        assessments: { outside_scope: addedTreatment.assessments.strain },
      },
    ],
    [{ ...addedTreatment, episodeIds: ["unknown-episode"] }],
    [{ ...addedTreatment, treatmentId: "unknown-taxonomy-id" }],
  ];
  for (const addedTreatments of invalidTreatments) {
    assert.throws(
      () =>
        validatePhysicianSteeringReferences(
          { ...draft(), addedTreatments },
          analysis,
          snapshot,
        ),
      (error) => error.statusCode === 400,
    );
  }
});

test("response distinguishes unsaved drafts from persisted revisions", () => {
  const response = {
    id: null,
    caseId: 1,
    region: "lumbar_spine",
    steering: draft(),
    revision: 0,
    createdAt: null,
    updatedAt: null,
  };
  assert.equal(
    physicianSteeringResponseSchema.safeParse(response).success,
    true,
  );
  assert.equal(
    physicianSteeringResponseSchema.safeParse({ ...response, revision: 1 })
      .success,
    false,
  );
  assert.equal(
    physicianSteeringResponseSchema.safeParse({
      ...response,
      id: 1,
      revision: 1,
      createdAt: identity.updatedAt,
      updatedAt: identity.updatedAt,
    }).success,
    true,
  );
});
