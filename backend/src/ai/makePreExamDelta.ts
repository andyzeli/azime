import { ZodError } from "zod";
import {
  preExamDeltaSchema,
  type Region,
  type StoredPreExamAnalysis,
} from "@azime/contracts";
import { generatePreExamJson } from "./makePreExamAnalysis.js";
import {
  buildPreExamDeltaSystemPrompt,
  buildPreExamDeltaUserPrompt,
} from "./preExamDeltaPrompt.js";
import { mergePreExamDelta } from "./preExamDelta.js";
import type { PreExamInputSnapshot } from "./preExamInputSnapshot.js";

const withoutSources = (ladder: PreExamInputSnapshot["ladder"]) =>
  ladder.map(({ sources: _sources, ...entry }) => entry);

const buildInput = (
  snapshot: PreExamInputSnapshot,
  analysis: StoredPreExamAnalysis,
  newDiagnosis: string,
  ladder: PreExamInputSnapshot["ladder"]
) => ({
  newDiagnosis,
  analyzedDiagnoses: snapshot.scope.diagnoses,
  existingTreatmentRows: analysis.treatmentAnalysis.map((row) => ({
    id: row.id,
    treatmentId: row.treatmentId,
    treatment: row.treatment,
    source: row.source,
    recordStatus: row.recordStatus,
    recordDetail: row.recordDetail,
    episodeIds: row.episodeIds,
    aiExhaustion: row.aiExhaustion,
    aiExhaustionRationale: row.aiExhaustionRationale,
  })),
  ladder: withoutSources(ladder),
  treatmentEpisodes: snapshot.treatmentEpisodes,
  currentMedications: snapshot.currentMedications,
  completedStudies: snapshot.completedStudies,
  workStatusHistory: snapshot.workStatusHistory,
  supportingRecords: snapshot.supportingRecords,
});
export type PreExamDeltaInput = ReturnType<typeof buildInput>;

// 3A for one added diagnosis against the frozen snapshot, merged into the existing rows.
export async function makePreExamDelta(
  snapshot: PreExamInputSnapshot,
  analysis: StoredPreExamAnalysis,
  region: Region,
  canonicalDx: string,
  ladder: PreExamInputSnapshot["ladder"]
) {
  const { provider, response, parsedJson } = await generatePreExamJson(
    buildPreExamDeltaUserPrompt(buildInput(snapshot, analysis, canonicalDx, ladder)),
    buildPreExamDeltaSystemPrompt(region),
    preExamDeltaSchema,
    "pre_exam_delta"
  );
  try {
    return mergePreExamDelta(
      analysis,
      snapshot,
      preExamDeltaSchema.parse(parsedJson),
      {
        canonicalDx,
        provider,
        model: response.model,
        createdAt: new Date().toISOString(),
      },
      ladder
    );
  } catch (error) {
    if (error instanceof ZodError) {
      console.error(`${provider} pre-exam delta failed schema validation:`, error.flatten());
      throw new Error(`${provider} pre-exam delta did not match the expected schema`);
    }
    throw error;
  }
}
