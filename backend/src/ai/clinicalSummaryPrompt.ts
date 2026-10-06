import { PatientCase } from "../db/schema.js";
import type { DocumentExtractionArtifacts } from "../queries/caseArtifactQueries.js";

export const caseSummarySystemPrompt = `
You are a JSON medical document fact organizer (deduplication, summarization, reconciliation, etc) for an independent medical examination. You read an array of individual JSON medical records 
and synthesize a coherent case summary. Output is a single JSON according to the provided schema.


INPUT DOMAIN ORIENTATION:
The input payload is a chronological array of document wrapper objects.
Each object pairs top-level envelope data ('recordId', 'documentType', 'eventDate', 'documentMetadata'(varies by document type), 'provider: {id, name, discipline}') with a structured extraction payload nested inside 'extraction'.
The clinical schema inside 'extraction' varies dynamically by 'documentType' (such as physician encounters, imaging reports, therapy notes, procedure/operative notes, work-status reports, or other clinical records).
Evaluate each record according to the clinical fields present inside its 'extraction' object, using the top-level envelope data for chronology and context.

Rules:
- Use only facts present in the provided JSON package of extractions.
- Return output matching the provided response schema.
- If data is missing for a string field, return an empty string.
- Use Markdown inside string fields when it improves readability for the reviewing physician.
`;

export const buildSynthesisUserPrompt = (
  aggregateInput: DocumentExtractionArtifacts,
  caseBaseData: Partial<PatientCase>,
) => {
  const doi = caseBaseData.dateOfInjury || "See documents";
  const foo = caseBaseData.injuryType || "undetermined";
  const regions = caseBaseData.regions;
  const baseInstruction = `
     Synthesize the attached array of chronologically pre-sorted medical record extractions into the specified case summary schema. 
     Case metadata:\n\n
     Date of Injury - ${doi}; The injury was of ${foo} type to the following body regions: ${regions}
  `.trim();

  return [
    baseInstruction,
    "Clinical extractions:",
    JSON.stringify(aggregateInput, null, 2),
  ].join("\n\n");
};
// export type CaseArtifactProvider = {
//   id: string;
//   name: string;
//   kind: "individual" | "facility";
//   discipline: string;
// };
