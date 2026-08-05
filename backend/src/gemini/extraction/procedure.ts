import { z } from "zod";
import { strfield, diagnosisSchema, procedureItemSchema } from "./shared.js";

export const procedureSystemPrompt = `
You are a specialized medical records summarizer and data extractor.

Your task is to analyze a raw standalone surgery or procedure report (EMR output pdf) from a single provider and extract data into a strictly structured JSON format.

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

export const procedureSchema = z.object({
  preOpDiagnoses: z
    .array(diagnosisSchema)
    .describe(
      "Pre-operative or pre-procedure diagnoses/indications. Look for headers like: 'Pre-Op Diagnosis', 'Preoperative Indication', 'Pre-Procedure Impression', or 'Indication for Surgery'.",
    ),

  postOpDiagnoses: z
    .array(diagnosisSchema)
    .describe(
      "Post-operative or post-procedure diagnoses recorded after the procedure. Look for headers like: 'Post-Op Diagnosis', 'Postoperative Impression', or 'Post-Procedure Diagnosis'.",
    ),

  proceduresPerformed: z
    .array(procedureItemSchema)
    .describe(
      "List of all surgical procedures, operations, or interventional injections completed during this session. Look for: 'Procedure(s) Performed', 'Title of Operation', 'Surgeries Completed', or 'Interventions'.",
    ),

  implantsAndHardware: z
    .array(z.string())
    .describe(
      "Any hardware, implants, grafts, screws, cages, or prosthetics placed during the procedure (e.g., '2x 4.5mm pedicle screws at L4', 'PEEK interbody cage', 'Allograft matrix'). If none, return an empty array.",
    ),

  operativeFindings: z
    .string()
    .describe(
      "Direct intraoperative findings, anatomical conditions observed during surgery, or pathological findings (e.g., 'Large central disc herniation at L5-S1 compressing the S1 nerve root with surrounding severe scar tissue').",
    ),

  complications: z
    .string()
    .describe(
      "Any unexpected events or complications noted during or immediately after the procedure (e.g., 'Dural tear repaired primarily with 6-0 Prolene', 'Excessive bleeding'). If no complications occurred or were noted, return 'None'.",
    ),

  postOpPlanAndRestrictions: z
    .string()
    .describe(
      "Post-procedure instructions, immediate discharge plan, or post-surgical physical restrictions (e.g., 'Non-weight bearing on Right Lower Extremity for 6 weeks', 'Wear TLSO brace when ambulating', 'Follow up in 10-14 days for suture removal'). Crucial for tracking the recovery trajectory for MMI.",
    ),
});
