import { z } from "zod";

export const imagingSchema = z.object({
  modality: z
    .string()
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
      "The doctor's reason for ordering the scan. Look for headers like: 'Indication', 'Clinical History', 'Reason for Exam', or 'History'.",
    ),

  comparisonStudies: z
    .string()
    .describe(
      "Prior scans referenced by the radiologist to track changes over time (e.g., 'Compared to prior MRI dated 03/15/2025: No significant interval change'). " +
        "CRITICAL FOR MMI: Capture any notes stating whether findings are 'stable', 'unchanged', or 'worsened'.",
    ),

  detailedFindings: z
    .string()
    .describe(
      "The body/narrative of the report detailing specific anatomical levels, disc spaces, or joint structures. " +
        "Look for headers like: 'Findings', 'Observations', or 'Examination'.",
    ),
  radiologistImpression: z
    .array(z.string())
    .describe(
      "The itemized, numbered, or bulleted summary conclusions written at the bottom of the report. " +
        "Look for headers like: 'Impression', 'Conclusion', or 'Diagnostic Summary'. Output as clean, individual string items.",
    ),
});

export const imagingSystemPrompt = `
You are a specialized medical records summarizer and data extractor.

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
