import type { CaseSummaryArtifact } from "../queries/caseArtifactQueries.js";
import type { DeterministicSignals } from "../queries/deterministicSignalQueries.js";
import type { PhysicianSteering } from "./physicianSteeringSchema.js";
import type { StoredPreExamAnalysis } from "./preExamAnalysisSchema.js";

export type RefinedAnalysisInput = {
  caseSummary: CaseSummaryArtifact;
  deterministicSignals: DeterministicSignals;
  physicianSteering: PhysicianSteering;
  preExamAnalysis: StoredPreExamAnalysis;
};

// TODO: Define the authoritative third-pass system instructions.
export const refinedAnalysisSystemPrompt = `
Refined analysis prompt is not implemented.
`.trim();

export const buildRefinedAnalysisUserPrompt = (input: RefinedAnalysisInput) =>
  JSON.stringify(input, null, 2);

// TODO: Add the treatment-universe query as a separate prompt input once its
// contract and prompt role are defined.
