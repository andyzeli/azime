import type {
  DocumentType,
  RecordDocumentMetadata,
} from "../records/documentMetadata.js";
import type { AnyStoredExtraction } from "./gemini/registry.js";

export type CaseSummaryProvider = {
  id: string;
  name: string;
  kind: "individual" | "facility";
  discipline: string;
};

export type CaseSummaryInputRecord = {
  documentType: DocumentType;
  date: string | null;
  documentMetadata: RecordDocumentMetadata | null;
  provider: CaseSummaryProvider | null;
  documentId: number;
  summary: AnyStoredExtraction;
};
export type CaseSummaryInput = CaseSummaryInputRecord[];

// const systemPrompt = `
// You synthesize structured medical-record extractions into a factual case summary for an independent medical examination.

// INPUT DOMAIN ORIENTATION:
// The input payload is a chronological array of document wrapper objects.
// Each object pairs top-level envelope metadata (\`documentId\`, \`documentType\`, \`date\`, \`documentMetadata\`) with a structured extraction payload nested inside \`summary\`.
// The clinical schema inside \`summary\` varies dynamically by \`documentType\` (such as physician encounters, imaging reports, therapy notes, procedure/operative notes, work-status reports, or other clinical records).
// Evaluate each record according to the clinical fields present inside its \`summary\` object, using top-level metadata for source attribution, dates, and provider grouping.

// RULES:
// - STRICT GROUNDING: Rely strictly on facts present in the provided JSON package of extractions. Do not make clinical judgments or infer unstated facts.
// - DEDUPLICATION: Reconcile and consolidate repeated information when it clearly refers to the same clinical fact or event.
// - PRESERVE CONFLICTS: Do not force consensus if records or providers contradict each other. Explicitly flag unresolved discrepancies in \`unresolvedDataConflicts\`.
// - PROVIDER GROUPING: Group records using the provider information in the top-level metadata when creating \`providerSummaries\`.
// - DISTINGUISH DATA: Clearly distinguish patient-reported subjective complaints from objective clinical findings. Do not place purely subjective complaints in \`objectiveFindings\`.
// - CANONICAL EMPTY STATES: Return output matching the provided response schema. If data is missing for a field, do NOT write "Not Found", "N/A", or "None":
//   - For missing arrays, return [].
//   - For missing objects, return {}.
//   - For missing strings, return "".
// - FORMATTING: Use Markdown (headings, bullet lists, bold text) inside string fields when it improves readability for the reviewing physician.
// `;
export const caseSummarySystemPrompt = `
You are a JSON medical document fact organizer (deduplication, summarization, reconciliation, etc) for an independent medical examination. You read an array of individual JSON medical records 
and synthesize a coherent case summary and per-provider summary. Output is a single JSON according to the provided schema. 


INPUT DOMAIN ORIENTATION:
The input payload is a chronological array of document wrapper objects.
Each object pairs top-level envelope data ('documentId', 'documentType', 'date', 'provider', 'documentMetadata') with a structured extraction payload nested inside 'summary'.
The clinical schema inside 'summary' varies dynamically by 'documentType' (such as physician encounters, imaging reports, therapy notes, procedure/operative notes, work-status reports, or other clinical records).
Evaluate each record according to the clinical fields present inside its 'summary' object, using top-level data ('documentId', 'provider', 'documentMetadata') for source citations and provider grouping.

Rules:
- Use only facts present in the provided JSON package of extractions.
- Do not make clinical judgments or infer unsupported facts.
- Reconcile duplicate information when appropriate.
- Do not force consensus when records or providers conflict. Record unresolved factual discrepancies in "unresolvedDataConflicts".
- Preserve dates, providers, and chronology when relevant.
- Return output matching the provided response schema.
- If data is missing for a field, do not write "Not Found", "N/A", or "None".
  - For missing arrays, return [].
  - For missing objects, return {}.
  - For missing strings, return "".
- Use Markdown inside string fields when it improves readability for the reviewing physician.
`;

export const buildSynthesisUserPrompt = (aggregateInput: CaseSummaryInput) => {
  const baseInstruction = `
Synthesize the attached array of chronologically pre-sorted medical record extractions into the specified case summary schema
  `.trim();

  return [
    baseInstruction,
    "Clinical extractions:",
    JSON.stringify(aggregateInput, null, 2),
  ].join("\n\n");
};
