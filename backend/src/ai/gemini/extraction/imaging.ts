import { z } from "zod";

export const imagingSchema = z.object({
  modality: z
    .enum([
      "MRI",
      "CT",
      "X-ray",
      "Ultrasound",
      "EMG/NCV",
      "bone_scan",
      "lab",
      "other",
    ])
    .describe(
      "Type of imaging performed (e.g., 'MRI 3.0T', 'Non-contrast CT', 'Digital X-Ray', 'Electromyography / EMG').",
    ),
  bodySite: z
    .string()
    .describe(
      "Anatomical area examined (e.g., 'Cervical Spine', 'Left Shoulder', 'Lumbar Spine with/without contrast').",
    ),

  clinicalIndication: z
    .string()
    .describe(
      "The doctor's reason for ordering the scan, if stated. Look for headers like: 'Indication', 'Clinical History', 'Reason for Exam', or 'History'.",
    ),
  comparisonStudies: z
    .string()
    .describe(
      "The comparison line as printed, listing any prior studies the radiologist compared against (e.g., 'MRI lumbar spine 08/14/2023'). Look under 'COMPARISON', 'Comparison Studies', or 'Prior Studies'. Copy exactly. If the report states none, capture that as written (e.g., 'None'). If no comparison line appears anywhere in the report, return an empty string.",
    ),
  detailedFindings: z
    .string()
    .describe(
      "The full findings section, reproduced as written. Look under 'FINDINGS', 'Findings', or the detailed observational body of the report. Copy the text exactly — do not summarize, condense, reorder, or omit normal findings. Include all anatomic levels and structures described. Do not move content here from the impression section",
    ),
  radiologistImpression: z
    .array(z.string())
    .describe(
      "The impression section, reproduced as written. Look under 'IMPRESSION', 'Impression', 'Conclusion', or 'Summary'. Copy the text exactly, preserving numbering and the radiologist's hedging language (e.g., 'may represent', 'consistent with'). Do not summarize or rewrite. Do not synthesize an impression from the findings section — if the report has no impression section, return an empty string. ",
    ),
});

export const imagingSystemPrompt = `
You are a specialized medical records data extractor.

Your task is to analyze a raw standalone imaging report (EMR output pdf) from radiologist (or similar specialist) and extract data into a strictly structured JSON format.

CONCEPTUAL MAPPING AUTONOMY:
The source documents may vary in format and may include headers, tables, and repeated sections,
You are granted full semantic license to map non-standard, colloquial, or layout-specific medical record sections into our target JSON schema keys. Use your clinical training data to deduce intent. 
For example:
- If a section contains discussion of observationsbut is unlabeled or uses an unrecognizable header, map it to 'detailedFindings'.
- Trust your internalized knowledge of PT EMR structures ( or legacy printouts) to correctly classify data, even if the raw formatting is chaotic.

Operational guardrails:
- Report only facts explicitly stated in the source documents.
- If data is missing for a field, do not write "Not Found", "N/A", or "None".
  - For missing arrays, return [].
  - For missing objects, return {}.
  - For missing strings, return "".

- Use Markdown (headings, lists, etc) inside string fields when it improves readability for the reviewing physician.

`;
