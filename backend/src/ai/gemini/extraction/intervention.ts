import { z } from "zod";

export const interventionSchema = z.object({
  procedureType: z
    .string()
    .describe(
      "The interventional procedure performed, stated concisely (e.g., 'Lumbar epidural steroid injection', 'Medial branch block', 'Sacroiliac joint injection').",
    ),

  target: z
    .string()
    .describe(
      "The anatomical target of the procedure, including spinal level, joint, nerve, or region when documented (e.g., 'L4-L5', 'right SI joint', 'left C5 medial branch').",
    ),

  laterality: z
    .enum([
      "left",
      "right",
      "bilateral",
      "midline",
      "not_applicable",
      "unclear",
    ])
    .describe(
      "The documented laterality of the procedure. Use 'unclear' if laterality cannot be determined from the record.",
    ),

  indication: z
    .string()
    .describe(
      "The documented clinical indication or condition for which the procedure was performed.",
    ),

  guidanceMethod: z
    .enum([
      "fluoroscopy",
      "ultrasound",
      "CT",
      "none_documented",
      "other",
      "unclear",
    ])
    .describe(
      "The imaging or procedural guidance method documented for the procedure.",
    ),

  medicationsInjected: z
    .array(
      z.object({
        name: z.string().describe("The injected medication or agent."),
        dose: z
          .string()
          .describe(
            "The documented dose, concentration, or volume, if provided.",
          ),
      }),
    )
    .describe(
      "Medications or agents administered during the procedure, such as corticosteroid, local anesthetic, or contrast.",
    ),

  technique: z
    .string()
    .describe(
      "A concise summary of the documented procedural technique. Include clinically relevant details without reproducing the full procedural narrative.",
    ),

  complications: z
    .string()
    .describe(
      "Any complications documented during or immediately after the procedure. If none were documented, state that concisely.",
    ),

  tolerance: z
    .string()
    .describe("How the patient tolerated the procedure, if documented."),

  immediateResponse: z
    .string()
    .describe(
      "Any immediate post-procedure symptom response or change documented at the visit. Do not infer longer-term effectiveness.",
    ),

  followUpPlan: z
    .string()
    .describe(
      "The documented follow-up plan after the procedure, including timing or next steps when provided.",
    ),
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
