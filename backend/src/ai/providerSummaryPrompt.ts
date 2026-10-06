import type { DocumentExtractionArtifacts } from "../queries/caseArtifactQueries.js";

export type ProviderSummaryInput = {
  providerName: string;
  providerDiscipline: string;
  records: DocumentExtractionArtifacts;
};

export const providerSummarySystemPrompt = `
You organize structured medical-record extractions into a concise factual summary for one provider or facility in an independent medical examination.

Rules:
- Do not make clinical judgments or infer unsupported facts.
- Reconcile duplicate information when appropriate.
- Preserve chronology, diagnoses, treatment, response to treatment, and final documented disposition.
- Distinguish patient-reported symptoms from objective findings.
- Use Markdown (headings, lists, etc) inside the summary if it improves readability for the reviewing physician.
`.trim();

export const buildProviderSummaryUserPrompt = (input: ProviderSummaryInput) =>
  [
    `Summarize the records grouped under provider or facility: ${input.providerName}`,
    `Provider discipline: ${input.providerDiscipline}`,
    "Provider records:",
    JSON.stringify(input.records, null, 2),
  ].join("\n\n");
