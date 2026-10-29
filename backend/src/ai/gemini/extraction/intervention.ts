import { interventionSchema } from "@azime/contracts";
import { buildRegionsSchema } from "./shared.js";

export const buildInterventionSchema = (regions: string[]) =>
  interventionSchema.extend({
    region: buildRegionsSchema(regions),
  });

export const interventionSystemPrompt = `
You are a specialized medical records data extractor.

Your task is to analyze a raw standalone non-surgical procedure report (EMR output pdf) from a single provider and extract data into a strictly structured JSON format.

CONCEPTUAL MAPPING AUTONOMY:
The source documents may vary in format and may include headers, tables, and repeated sections,
You are granted full semantic license to map non-standard, colloquial, or layout-specific medical record sections into our target JSON schema keys. Use your clinical training data to deduce intent. 
For example:
- Trust your internalized knowledge of PT EMR structures ( or legacy printouts) to correctly classify data, even if the raw formatting is chaotic.

Operational guardrails:
- Report only facts explicitly stated in the source documents.
- If data is missing for a field, do not write "Not Found", "N/A", or "None".
  - For missing arrays, return [].
  - For missing objects, return {}.
  - For missing strings, return "".

- Use Markdown (headings, lists, etc) inside string fields when it improves readability for the reviewing physician.

`;
