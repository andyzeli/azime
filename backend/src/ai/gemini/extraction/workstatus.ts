import { z } from "zod";
import { strfield } from "./shared.js";

export const workStatusSystemPrompt = `
You are a specialized medical records summarizer and data extractor.

Your task is to analyze a raw standalone work status or accommodation report extract data into a strictly structured JSON format.

CONCEPTUAL MAPPING AUTONOMY:
The source documents may vary in format and may include headers, tables, or simple prose.

Operational guardrails:
- Report only facts explicitly stated in the source documents.
- If data is missing for a field, do not write "Not Found", "N/A", or "None".
  - For missing arrays, return [].
  - For missing objects, return {}.
  - For missing strings, return "".

- Use Markdown (headings, lists, etc) inside string fields when it improves readability for the reviewing physician.

`;

export const workStatusReportSchema = z.object({
  reportDate: strfield.describe(
    "The date of the work status report, if explicitly stated in the record.",
  ),
  status: z.enum(["full_duty", "modified_duty", "off_work", "unknown"]),
  restrictions: z
    .array(z.string())
    .describe(
      "Itemized list of explicit physical restrictions (e.g., 'No lifting > 10 lbs', 'No bending/stooping', 'Must sit 15 mins every hour').",
    ),
  effectiveFrom: strfield
    .optional()
    .describe("Start date of accomodation: dd/mm/yyyy"),
  effectiveThrough: strfield
    .optional()
    .describe("End date of accomodation: dd/mm/yyyy"),
});
