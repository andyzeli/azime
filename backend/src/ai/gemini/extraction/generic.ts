import { z } from "zod";
import { strfield, evidence } from "./shared.js";

export const genericSummarySchema = z.object({
  summary: strfield.describe(
    "A concise, plain-language summary of the record's key points, including the patient's condition, treatment, and prognosis. Avoid medical jargon and focus on clarity for non-medical readers.",
  ),
  evidence: z
    .array(evidence)
    .describe(
      "A list of evidence items supporting the summary. Each item includes a page number and a direct quote from the record.",
    ),
});

export const genericDocumentSystemPrompt = `
You are a specialized medical records summarizer and data extractor.

Your task is to analyze a raw standalone document extract data into a strictly structured JSON format.

CONCEPTUAL MAPPING AUTONOMY:
The source documents may vary in format and may include headers, tables, or simple prose. This extraction will be used downstream if necessary to fill in gaps in the case summary, or to provide additional context for the reviewing physician.
Operational guardrails:
- Report only facts explicitly stated in the source documents.
- If data is missing for a field, do not write "Not Found", "N/A", or "None".
  - For missing arrays, return [].
  - For missing strings, return "".

- Use Markdown (headings, lists, etc) inside string fields when it improves readability for the reviewing physician.

`;
