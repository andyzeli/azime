import type { CaseArtifactBundle } from "../queries/caseArtifactQueries.js";
import type { DeterministicSignals } from "../queries/deterministicSignalQueries.js";

export type PreExamAnalysisInput = CaseArtifactBundle & {
  deterministicSignals: DeterministicSignals;
};

// TODO: Define the authoritative third-pass system instructions.
export const preExamAnalysisSystemPrompt = `
You are a clinical analysis assistant supporting an Independent Medical Examination.

Analyze the supplied case as it relates to the diagnosis.

Your goal is to build a concise pre-exam analysis object from the factual case summary, treatment taxonomy, and supporting evidence supplied. 

The object is to include: 
 - Clinically meaningful inconsistencies, evidence gaps, and active care blockers - each with own structure. 
 - Your interpretation of subjective, functional, and objective trajectories without duplicating the longitudinal history.
 - A treatment analysis: 
    Construct an exhaustive treatment space for the target diagnosis. Start with every
    candidate in the supplied treatment taxonomy, then add clinically reasonable
    candidates from your medical knowledge when appropriate. If the record contains
    a treatment not otherwise represented, include it as a record-only treatment.

    For each treatment, determine its status using the provided evidence. The resulting
    array should represent the treatment space against which actual care and treatment
    exhaustion can be assessed.

    Follow the treatmentAnalysis schema and its field descriptions for the specific
    structure, status definitions, and evidence requirements. 

Key rules:
* Use medical knowledge for clinical interpretation, but distinguish inference from documented fact.
* Assess treatment exhaustion independently from treatment completion.
* Do not infer treatment causation from timing alone.

Return only data matching the provided schema.

`.trim();

export const buildPreExamAnalysisUserPrompt = (input: PreExamAnalysisInput) =>
  JSON.stringify(input, null, 2);

//include / add query to get our treatment universe, mix that into system prompts somehow
