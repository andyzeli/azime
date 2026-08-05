import type { AggregateSummaryInput } from "./types.js";

export const synthesisSystemPrompt = `
You are a medical records synthesizer operating on already-extracted provider summaries.

Your task is to synthesize provider-level summaries (from one or more providers) for a single case into one case-wide summary.

Operational guardrails:
- This is a synthesis pass, not a source-document extraction pass.
- Treat the provided JSON package of provider summaries as the only source of truth.
- Do not invent facts or resolve conflicts unless the provider summaries clearly support the resolution.
- When providers conflict or the background is unclear, say so explicitly in the relevant field.
- Preserve uncertainty and missing information as missing information.
- Return only JSON that matches the provided response schema.
- Use Markdown (headings, lists, etc) inside string fields when it improves readability for the reviewing physician.
JSON Field Definitions & Format Requirements:
- mainSummary: short narrative summary of the case as a whole.
- patientInfo: brief patient-identifying context relevant to the case, such as name, age, and sex, only if present in the input summaries.
- backgroundSummary: object - A merged (no duplicates) synthesis is better than naive concatenation. 
  - incidentDate: best synthesized incident date or onset date from the provider summaries. If unclear or conflicting, summarize that uncertainty here.
  - incidentDescriptionSummary: synthesized description of the injury mechanism or symptom onset narrative across providers.
  - pastMedicalHistorySummary: synthesized past medical history across providers.
  - allergiesSummary: synthesized allergy information across providers.
  - backgroundConflicts: summary of any conflicts, omissions, or uncertainty across provider background sections.
- currentStatus: short summary of the patient's current overall treatment or symptom status based on the provider summaries.
`.trim();

export const buildSynthesisUserPrompt = (
  aggregateInput: AggregateSummaryInput,
) => {
  const baseInstruction = `
Below is a deterministic JSON package containing all completed provider-level summaries for a single case.
Synthesize those summaries into one case-wide aggregate summary.
Focus on the big-picture case narrative, the combined background details, and the patient's current overall status.
  `.trim();

  return [
    baseInstruction,
    "Aggregate summary input JSON:",
    JSON.stringify(aggregateInput, null, 2),
  ].join("\n\n");
};

const semanticLicensePromptExample = `
You are an expert clinical data extraction engine. 

CONCEPTUAL MAPPING AUTONOMY:
You are granted full semantic license to map non-standard, colloquial, or layout-specific medical record sections into our target JSON schema keys. Use your clinical training data to deduce intent. 
For example:
- If a section contains patient-reported pain details but is unlabeled or uses an unrecognizable header, map it to 'historyOfPresentIllness'.
- Trust your internalized knowledge of EMR structures (Epic, Cerner, legacy printouts) to correctly classify data, even if the raw formatting is chaotic.

Strict Guardrails:
1. Grounding: Extract facts exactly as written...`;
