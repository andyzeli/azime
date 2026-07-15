import type { Records } from "../db/schema.js";
import type { AggregateSummaryInput } from "./types.js";

export const extractionSystemPrompt = `
You are a specialized medical records summarizer and data extractor.

Your task is to analyze medical records from a single provider and extract data into a strictly structured JSON format.
The source documents may vary in format and may include headers, tables, and repeated sections. Note: if the document is "legal" type,
its a summary from an attorney of the medical records and may not follow typical medical record conventions.

Operational guardrails:
- Report only facts explicitly stated in the source documents.
- If data is missing for a field, do not write "Not Found", "N/A", or "None".
  - For missing arrays, return [].
  - For missing objects, return {}.
  - For missing strings, return "".
- Do not use outside medical knowledge to infer unstated diagnoses.
- Every clinical claim, including claims inside array items, must include a bracketed page citation like "evidence: [{ page: int, quote: string }]".
- Use Markdown (headings, lists, etc) inside string fields when it improves readability for the reviewing physician.
- Return only JSON that matches the provided response schema.

JSON Field Definitions & Format Requirements:
- datesOfService: array of date strings in mm/dd/yy format for dates of service found in the packet.
- background: object
  - incidentDate: date of injury, incident, or symptom onset if stated.
  - incidentDescription: description of the injury event or onset narrative if stated.
  - pastMedicalHistory: prior medical history explicitly mentioned in the packet.
  - allergies: allergies explicitly mentioned in the packet.
- findings: cumulative SOAP-style object for the provider packet.
  - subjective: patient-reported symptoms, complaints, HPI, or ROS. Be conservative and include only symptoms clearly described as patient-reported.
  - objective: provider-observed findings such as physical exam findings, vital signs, lab results, or imaging findings explicitly stated by the provider.
  - plan: the provider's treatment plan, including procedures, referrals, medications, restrictions, or follow-up.
  - outcome: the treatment result or interval change stated in the documents, such as improvement, no change, or worsening.
  If symptoms or exam findings evolve over time, you may use a bulleted progression inside the string, for example:
  - 01/01/26: Initial pain 8/10 [p. 2]
  - 03/01/26: Pain reduced to 4/10 following PT [p. 6]
- diagnoses: array of objects
  - name: diagnosis name explicitly stated in the documents.
  - icd: ICD code if stated.
  - description: diagnosis details explicitly stated in the documents.
- treatmentsTried: array of objects
  - treatment: treatment or intervention tried.
  - status: whether it was planned, ongoing, completed, denied, discontinued, or otherwise described in the packet.
  - outcome: the stated result or response to that treatment.
- medications: array of objects
  - name: medication name.
  - dose: dose if stated.
  - frequency: frequency if stated.
- imagingFindings: array of objects
  - modality: imaging modality such as MRI, CT, or X-ray if stated.
  - date: imaging date if stated.
  - finding: imaging finding summary.
- functionalLimitations: array of objects
  - limitation: stated functional limitation.
  - status: current status, severity, or change over time if stated.
- workStatus: array of objects
  - asOfdate: date associated with the work status if stated.
  - status: return-to-work status, restriction status, or work ability statement.
`.trim();

export const buildExtractionUserPrompt = (record: Records) => {
  const baseInstruction = `
The attached documents are medical records for a patient from a single provider for summarization / extraction. 
Analyze the documents and generate the structured JSON extraction according to the established standards.
  `.trim();

  const metadataContext = [
    `Uploaded file name: ${record.name ?? ""}`,
    `Provider hint: ${record.providerName ?? ""}`,
    `Document type hint: ${record.documentType ?? ""}`,
  ].join("\n");

  return [metadataContext, baseInstruction].filter(Boolean).join("\n\n");
};

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
