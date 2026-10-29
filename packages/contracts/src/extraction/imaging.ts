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
