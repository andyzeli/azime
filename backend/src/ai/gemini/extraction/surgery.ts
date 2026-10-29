import { z } from "zod";
import { surgerySchema } from "@azime/contracts";
import { buildDiagnosisSchema, buildProcedureItemSchema } from "./shared.js";

export const surgerySystemPrompt = `
You are a specialized medical records data extractor.

Your task is to analyze a raw standalone surgery report (EMR output pdf) from a single provider and extract data into a strictly structured JSON format.

CONCEPTUAL MAPPING AUTONOMY:
The source documents may vary in format and may include headers, tables, and repeated sections,
You are granted full semantic license to map non-standard, colloquial, or layout-specific medical record sections into our target JSON schema keys. Use your clinical training data to deduce intent. 
For example:
- If a section contains discussion of findings and details but is unlabeled or uses an unrecognizable header, map it to 'operativeFindings'.
- Trust your internalized knowledge of PT EMR structures ( or legacy printouts) to correctly classify data, even if the raw formatting is chaotic.

Operational guardrails:
- Report only facts explicitly stated in the source documents.
- If data is missing for a field, do not write "Not Found", "N/A", or "None".
  - For missing arrays, return [].
  - For missing objects, return {}.
  - For missing strings, return "".

- Use Markdown (headings, lists, etc) inside string fields when it improves readability for the reviewing physician.

`;

export const buildSurgerySchema = (
  canonicalDxValues: string[],
  regions: string[],
) =>
  surgerySchema.extend({
    preOpDiagnoses: z
      .array(buildDiagnosisSchema(canonicalDxValues))
      .describe(
        "Pre-operative or pre-procedure diagnoses/indications. Look for headers like: 'Pre-Op Diagnosis', 'Preoperative Indication', 'Pre-Procedure Impression', or 'Indication for Surgery'.",
      ),
    postOpDiagnoses: z
      .array(buildDiagnosisSchema(canonicalDxValues))
      .describe(
        "Post-operative or post-procedure diagnoses recorded after the procedure. Look for headers like: 'Post-Op Diagnosis', 'Postoperative Impression', or 'Post-Procedure Diagnosis'.",
      ),
    proceduresPerformed: z
      .array(buildProcedureItemSchema(regions))
      .describe(
        "List of all surgical procedures or operations completed during this session. Look for: 'Procedure(s) Performed', 'Title of Operation', 'Surgeries Completed', or 'Interventions'.",
      ),
  });
