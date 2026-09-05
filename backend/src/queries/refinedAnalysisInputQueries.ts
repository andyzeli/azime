import type { RefinedAnalysisInput } from "../ai/refinedAnalysisPrompt.js";
import type { RefinedAnalysisSources } from "../ai/makeRefinedAnalysis.js";
import { MissingPrerequisiteError } from "../errors/missingPrerequisiteError.js";
import { getCaseArtifactBundle } from "./caseArtifactQueries.js";
import { getDeterministicSignals } from "./deterministicSignalQueries.js";
import { getPhysicianSteering } from "./physicianSteeringQueries.js";
import { getStoredPreExamAnalysis } from "./preExamAnalysisQueries.js";

export type RefinedAnalysisInputBundle = {
  input: RefinedAnalysisInput;
  sources: RefinedAnalysisSources;
};

export const getRefinedAnalysisInput = async (
  caseId: number,
): Promise<RefinedAnalysisInputBundle> => {
  const [artifacts, storedPreExamAnalysis, storedPhysicianSteering] =
    await Promise.all([
      getCaseArtifactBundle(caseId),
      getStoredPreExamAnalysis(caseId),
      getPhysicianSteering(caseId),
    ]);

  if (!artifacts.caseSummary) {
    throw new MissingPrerequisiteError(
      "Generate the case summary before refined analysis",
    );
  }

  if (!storedPreExamAnalysis) {
    throw new MissingPrerequisiteError(
      "Generate the pre-exam analysis before refined analysis",
    );
  }

  if (!storedPhysicianSteering) {
    throw new MissingPrerequisiteError(
      "Save physician steering before refined analysis",
    );
  }

  const deterministicSignals = await getDeterministicSignals(artifacts);

  return {
    input: {
      caseSummary: artifacts.caseSummary,
      deterministicSignals,
      preExamAnalysis: storedPreExamAnalysis.analysis,
      physicianSteering: storedPhysicianSteering.steering,
    },
    sources: {
      preExamAnalysisId: storedPreExamAnalysis.id,
      physicianSteeringId: storedPhysicianSteering.id,
      physicianSteeringRevision: storedPhysicianSteering.revision,
    },
  };
};
