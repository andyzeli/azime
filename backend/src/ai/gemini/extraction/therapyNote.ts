import { z } from "zod";
import { therapySchema } from "@azime/contracts";
import { buildRegionsSchema } from "./shared.js";

// 4. Physical Therapy, OT progress reports, and functional exams

export const buildTherapySchema = (regions: string[]) =>
  therapySchema.extend({
    regions: z
      .array(buildRegionsSchema(regions))
      .describe(
        "Distinct body regions explicitly addressed by therapy in this note. Do not assign regions from diagnosis presence alone. Use 'unclear' if the addressed region cannot be determined.",
      ),
  });
export const therapySystemPrompt = `
You are a specialized medical records summarizer and data extractor.

Your task is to analyze a raw "therapy" or "rehabilitation" report (EMR output pdf) from a single provider and extract data into a strictly structured JSON format.

CONCEPTUAL MAPPING AUTONOMY:
The source documents may vary in format and may include headers, tables, and repeated sections,
You are granted full semantic license to map non-standard, colloquial, or layout-specific medical record sections into our target JSON schema keys. Use your clinical training data to deduce intent. 
For example:
- If a section contains patient-reported pain details but is unlabeled or uses an unrecognizable header, map it to 'historyOfPresentIllness'.
- Trust your internalized knowledge of PT EMR structures ( or legacy printouts) to correctly classify data, even if the raw formatting is chaotic.

Operational guardrails:
- Report only facts explicitly stated in the source documents.
- If data is missing for a field, do not write "Not Found", "N/A", or "None".
  - For missing arrays, return [].
  - For missing objects, return {}.
  - For missing strings, return "".

- Use Markdown (headings, lists, etc) inside string fields when it improves readability for the reviewing physician.

`;
