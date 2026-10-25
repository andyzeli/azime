import assert from "node:assert/strict";
import test from "node:test";
import { storedPreExamAnalysisSchema } from "@azime/contracts";
import { mergePreExamDelta } from "../dist/ai/preExamDelta.js";

const scored = (canonicalDx, aiApplicability = "applicable") => ({
  canonicalDx,
  aiApplicability,
  aiApplicabilityRationale: "why",
});
const { canonicalDx: _dx, ...newDxAssessment } = scored("x", "not_applicable");
const revised = { aiExhaustion: "not_exhausted", aiExhaustionRationale: "revised" };
const row = (id, fields) => ({
  id,
  suggestionReasoning: "",
  suggestionReason: null,
  treatmentId: null,
  treatment: id,
  source: "taxonomy",
  recordDetail: null,
  recordStatus: "Not Documented",
  episodeIds: [],
  assessments: [scored("radiculopathy")],
  aiExhaustion: "exhausted",
  aiExhaustionRationale: "original",
  ...fields,
});
const newRow = (fields) => ({
  suggestionReasoning: "",
  suggestionReason: null,
  treatmentId: null,
  treatment: "new",
  recordDetail: null,
  recordStatus: "Not Documented",
  episodeIds: [],
  assessment: newDxAssessment,
  ...revised,
  ...fields,
});
const ladderEntry = (treatmentId) => ({
  id: `ladder-${treatmentId}`,
  region: "lumbar_spine",
  canonicalDx: "sij",
  treatmentId,
  treatment: treatmentId,
  category: "injection",
  aliases: [],
  applicability: null,
  adequacy: null,
  sources: [],
});

const analysis = storedPreExamAnalysisSchema.parse({
  schemaVersion: "draft-v2",
  sourceMetadata: { provider: "gemini", model: "test" },
  treatmentAnalysis: [
    row("treatment-0", { treatmentId: "pt" }),
    row("treatment-1", { source: "record_only", episodeIds: ["ep-sij"], treatment: "SI shot" }),
    row("treatment-2", { source: "ai", treatment: "Yoga" }),
  ],
  evidenceGaps: [],
  inconsistencies: [],
});
const snapshot = {
  scope: { region: "lumbar_spine", diagnoses: ["radiculopathy"] },
  ladder: [],
  treatmentEpisodes: [],
  currentMedications: [],
  completedStudies: [],
  workStatusHistory: [],
  supportingRecords: [],
};
const added = { canonicalDx: "sij", provider: "gemini", model: "test", createdAt: "2026-10-17T00:00:00.000Z" };
const ladder = [ladderEntry("pt"), ladderEntry("sij_injection"), ladderEntry("rfa")];

test("an added diagnosis extends rows without touching ids or prior assessments", () => {
  const merged = mergePreExamDelta(
    analysis,
    snapshot,
    {
      existingRowAssessments: ["treatment-0", "treatment-1", "treatment-2"].map((rowId) => ({ rowId, ...newDxAssessment, ...revised })),
      newRows: [
        newRow({ source: "taxonomy", treatmentId: "pt" }), // already a row → assessment only
        newRow({ source: "taxonomy", treatmentId: "sij_injection", treatment: "SI joint injection", episodeIds: ["ep-sij"] }), // upgrades record_only
        newRow({ source: "taxonomy", treatmentId: "rfa", treatment: "RFA" }),
        newRow({ source: "ai", treatment: "SI belt" }),
      ],
    },
    added,
    ladder,
  );
  const rows = merged.analysis.treatmentAnalysis;

  assert.deepEqual(rows.map((r) => r.id), ["treatment-0", "treatment-1", "treatment-2", "treatment-3", "treatment-4"]);
  for (const r of rows.slice(0, 3)) {
    assert.deepEqual(r.assessments.map((a) => a.canonicalDx), ["radiculopathy", "sij"]);
    assert.deepEqual(r.assessments[0], scored("radiculopathy"));
  }
  // One assessment per diagnosis even when the model assessed the row twice.
  assert.equal(rows[0].assessments.length, 2);
  assert.deepEqual(
    { source: rows[1].source, treatmentId: rows[1].treatmentId, treatment: rows[1].treatment, episodeIds: rows[1].episodeIds },
    { source: "taxonomy", treatmentId: "sij_injection", treatment: "SI joint injection", episodeIds: ["ep-sij"] },
  );
  assert.deepEqual([rows[3].treatment, rows[3].source], ["RFA", "taxonomy"]);
  assert.deepEqual([rows[4].treatment, rows[4].source], ["SI belt", "ai"]);
  assert.deepEqual(rows[4].assessments.map((a) => a.canonicalDx), ["sij"]);

  // Not applicable to the new diagnosis: exhaustion and its review stand.
  assert.deepEqual(merged.reassessed, []);
  assert.equal(rows[0].aiExhaustion, "exhausted");
  assert.equal(rows[3].aiExhaustion, "not_exhausted");

  assert.deepEqual(merged.snapshot.scope.diagnoses, ["radiculopathy", "sij"]);
  assert.equal(merged.snapshot.ladder.length, 3);
  assert.deepEqual(merged.analysis.addedDiagnoses, [added]);
  // Inputs are not mutated.
  assert.equal(analysis.treatmentAnalysis[1].source, "record_only");
  assert.deepEqual(snapshot.scope.diagnoses, ["radiculopathy"]);
});

test("unknown rows and off-ladder taxonomy rows are rejected", () => {
  assert.throws(
    () => mergePreExamDelta(analysis, snapshot, { existingRowAssessments: [{ rowId: "nope", ...newDxAssessment, ...revised }], newRows: [] }, added, ladder),
    /unknown row/,
  );
  assert.throws(
    () => mergePreExamDelta(analysis, snapshot, { existingRowAssessments: [], newRows: [newRow({ source: "taxonomy", treatmentId: "made_up" })] }, added, ladder),
    /not in the ladder/,
  );
});

test("an applicable new diagnosis revises exhaustion and reports the row for review", () => {
  const merged = mergePreExamDelta(
    analysis,
    snapshot,
    {
      existingRowAssessments: [
        { rowId: "treatment-0", ...newDxAssessment, aiApplicability: "applicable", ...revised },
        { rowId: "treatment-1", ...newDxAssessment, aiApplicability: "unclear", ...revised },
        { rowId: "treatment-2", ...newDxAssessment, ...revised },
      ],
      newRows: [],
    },
    added,
    ladder,
  );
  const rows = merged.analysis.treatmentAnalysis;
  assert.deepEqual(merged.reassessed, ["treatment-0", "treatment-1"]);
  assert.deepEqual(rows.map((r) => r.aiExhaustion), ["not_exhausted", "not_exhausted", "exhausted"]);
  assert.equal(rows[0].aiExhaustionRationale, "revised");
  assert.equal(analysis.treatmentAnalysis[0].aiExhaustion, "exhausted");
});
