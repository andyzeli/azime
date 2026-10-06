import { z } from "zod";
import { buildRegionsSchema, regionSchema, strfield } from "./shared.js";
// 4. Physical Therapy, OT progress reports, and functional exams

const therapyItemScchema = z.object({
  detail: z
    .string()
    .describe(
      "Specific exercises, sets/reps, machine settings, or manual mobilization techniques performed for this modality " +
        "(e.g., 'Prone press-ups 3x10, quadruped bird-dogs with 2-second hold', or 'IFC electrical stim with moist heat to lumbar spine x 15 min').",
    ),
  type: z
    .enum([
      "active_exercise",
      "manual_therapy",
      "passive_modalities",
      "functional_training",
      "aquatic_therapy",
      "home_exercise_program",
      "other",
    ])
    .describe("The broad clinical class of the therapeutic intervention."),
});
export const therapySchema = z.object({
  regions: z.array(regionSchema),
  // Duplicated Clinical Narrative Fields (for daily notes)

  historyOfPresentIllness: z
    .string()
    .describe(
      "The patient's subjective complaints, pain levels, and current status. " +
        "Look for sections labeled 'Subjective', 'S:', or 'Patient Status'.",
    ),

  // Heavy Evaluation & MMI-Specific Metrics (for summaries/evals)
  //
  therapiesPerformed: z
    .array(therapyItemScchema)
    .default([])
    .describe(
      "List of categorized therapeutic treatments and their specific exercise/modality details performed during this visit.",
    ),
  objectiveMetrics: z
    .array(strfield)
    .describe(
      "Extract only significant, abnormal, or milestone objective metrics (e.g., 'Lumbar flexion: 35/90 deg', 'Right grip: 20 lbs (50% deficit)'). " +
        "SUMMARIZATION RULE: If a table or group of measurements shares a uniform result (e.g., an entire 8-point ROM grid shows '0 deg' or 'untestable due to pain'), collapse them into a single summary string (e.g., 'All lumbar planes: 0 deg / untestable due to severe pain') rather than listing each row separately. " +
        "Do not list or extract full tables of normal, unremarkable findings.",
    ),

  functionalLimitations: z
    .array(strfield)
    .describe(
      "Explicit physical restrictions or limitations noted by the therapist (e.g., 'cannot sit > 30 mins', 'no lifting over 10 lbs').",
    ),

  therapistAssessment: z
    .string()
    .describe(
      "The therapist's overall clinical impression of progress or plateauing. There's usually a section called 'Assessment'. " +
        "Look for explicit mentions of 'Maximum Therapeutic Benefit', 'Plateaued', 'Maturity', or progress rates.",
    ),

  followUpPlan: z
    .string()
    .describe(
      "Care provider's follow-up plan for the patient (e.g., '2x/week for 4 weeks', 'Discharged to home program').",
    ),
  noteType: z
    .enum([
      "initial_eval",
      "progress_note_or_reeval",
      "daily_note",
      "discharge_summary",
      "unspecified",
    ])
    .describe("Clinical level of this therapy encounter."),
});

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
