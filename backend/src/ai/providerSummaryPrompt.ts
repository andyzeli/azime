import type { CaseSummaryInputRecord } from "./clinicalSummaryPrompt.js";

export type ProviderSummaryInput = {
  providerName: string;
  providerDiscipline: string;
  records: CaseSummaryInputRecord[];
};

export const providerSummarySystemPrompt = `
You organize structured medical-record extractions into a concise factual summary for one provider or facility in an independent medical examination.

Rules:
- Use only facts present in the provided records.
- Do not make clinical judgments or infer unsupported facts.
- Reconcile duplicate information when appropriate.
- Preserve chronology, diagnoses, treatment, response to treatment, and final documented disposition.
- Distinguish patient-reported symptoms from objective findings.
- Return output matching the provided response schema.
- If information is missing, use the schema's canonical empty value rather than writing "Not Found", "N/A", or "None".
`.trim();

export const buildProviderSummaryUserPrompt = (input: ProviderSummaryInput) =>
  [
    `Summarize the records grouped under provider or facility: ${input.providerName}`,
    "Provider records:",
    JSON.stringify(input.records, null, 2),
  ].join("\n\n");
