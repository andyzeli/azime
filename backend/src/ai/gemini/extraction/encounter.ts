import { z } from "zod";
import {
  strfield,
  functionalLimitationSchema,
  imagingSummarySchema,
  procedureItemSchema,
  medicationSchema,
  diagnosisSchema,
} from "./shared.js";

const diagnosticOrderSchema = z.object({
  sourceText: strfield.describe(
    "The verbatim order line as printed (e.g., 'Order MRI lumbar spine w/o contrast'). Copy exactly.",
  ),

  modality: z.enum([
    "MRI",
    "CT",
    "X-ray",
    "Ultrasound",
    "EMG/NCV",
    "bone_scan",
    "lab",
    "other",
  ]),
  bodyPart: strfield.describe(
    "Normalized body region (e.g., 'lumbar spine', 'right shoulder'). Use the same vocabulary as imaging findings.",
  ),
});
const referralSchema = z.object({
  sourceText: strfield.describe(
    "The verbatim referral line as printed (e.g., 'Refer to PT 3x/week x 4 weeks'). Copy exactly.",
  ),
  specialty: z
    .enum([
      "physical_therapy",
      "occupational_therapy",
      "chiropractic",
      "acupuncture",
      "pain_management",
      "orthopedic_surgery",
      "neurosurgery",
      "neurology",
      "psychiatry_psychology",
      "physiatry",
      "rheumatology",
      "podiatry",
      "other",
    ])
    .describe(
      "Normalized specialty. You are allowed to use your medical knowledge to map synonyms, e.g. that 'PT' should map to'physical_therapy'",
    ),
  bodyPart: strfield.describe(
    "Body region, if specified. Empty string if not.",
  ),
  purpose: strfield.describe(
    "Reason for referral as stated (e.g., 'surgical consult', 'ongoing treatment').",
  ),
});
export const encounterSchema = z.object({
  // dateOfService: strfield.describe(
  //   "The date of service for the encounter, in YYYY-MM-DD format.",
  // ),
  chiefComplaint: z
    .string()
    .describe(
      `The patient's primary current reason(s) for this visit, stated concisely (e.g., 'Right shoulder pain'). Include all distinct complaints documented for this encounter. Do not include historical problems unless they are part of the current reason for visit. This may appear under 'CC', 'Chief Complaint', 'Reason for Visit', 'Presenting Problem', or similar headings.`,
    ),
  historyOfPresentIllness: z
    .string()
    .describe(
      "The narrative of the current injury or pain leading up to today's visit " +
        "(e.g., pain levels, aggravating factors, worsening symptoms). This data usually found under headings like: 'HPI', 'History of Present Illness', 'History', 'Interval History', 'Patient States', 'HPI Narrative', or simply under 'Subjective' - which is broader and includes other fields.",
    ),
  functionalLimitations: z
    .array(functionalLimitationSchema)
    .describe(
      "A list of functional limitations explicitly stated in the record. If none are mentioned, return an empty array.",
    ),
  workStatus: z
    .string()
    .describe(
      "The patient's work status, return-to-work status, or work ability statement explicitly stated in the record. If none are mentioned, return an empty string.",
    ),
  pastMedicalHistory: z
    .string()
    .describe(
      "Pre-existing conditions, historical surgeries, childhood illnesses, or prior accidents " +
        "that are distinct from the current primary injury. If none are mentioned in this note, leave as an empty string.",
    ),
  objective: z
    .string()
    .describe(
      `Physical examination findings and other direct clinical observations from this encounter, including palpation, range of motion, strength, sensation, reflexes, gait, provocative testing, and similar findings. Instead of verbatim, compress by removing filler words and repitition noise and keep pure signal. Do not include patient-reported symptoms unless documented as an observed exam finding. Look for headers such as 'Objective', 'O:', 'Physical Exam', 'PE', 'Examination', 'Vitals', or 'Clinical Findings'`,
    ),
  assessment: z
    .string()
    .describe(
      "The clinician's assessment or impression for this encounter. Summarize concisely without adding new inferences",
    ),
  medications: z
    .array(medicationSchema)
    .describe(
      "A list of medications per medicationSchema, as explicitly stated in the record. If none are mentioned, return an empty array.",
    ),
  diagnoses: z.array(diagnosisSchema),
  imagingFindings: z
    .array(imagingSummarySchema)
    .describe(
      "Return one object per distinct modality + date + finding combination. If one MRI contains three findings, return three objects with the same modality and date.",
    ),
  proceduresPerformed: z
    .array(procedureItemSchema)
    .describe(
      "Any in-office procedures, minor interventions, injections, aspirations, or applications performed DURING today's visit " +
        "(e.g., 'Right knee cortisone injection 40mg', 'Trigger point injection L4-L5', 'Short leg cast application'). " +
        "Do NOT include future planned procedures here—only what was physically performed today. If none, return an empty array.",
    ),
  diagnosticOrders: z
    .array(diagnosticOrderSchema)
    .describe(
      "Any new scans, injections, or diagnostic tests ordered today (e.g., 'Order lumbar MRI', 'Schedule EMG'). ",
    ),
  referrals: z
    .array(referralSchema)
    .describe(
      "New referrals to other specialties or clinics ordered today (e.g., 'Refer to Physical Therapy 3x/week', " +
        "'Refer to spine specialist for surgical consult').",
    ),
  followUpTimeline: z
    .string()
    .describe(
      "When the doctor wants to see the patient next (e.g., 'Return in 4 weeks', 'PRN / As needed', 'Discharged from care'). " +
        "This is highly critical for tracking case closure. Usually part of plan or follow-up instructions. If not mentioned, return an empty string.",
    ),
});

export const encounterSystemPrompt = `
You are a specialized medical records data extractor.

Your task is to analyze a raw "encounter" or "progress report" (EMR output pdf) from a single provider and extract data into a strictly structured JSON format.

CONCEPTUAL MAPPING AUTONOMY:
The source documents may vary in format and may include headers, tables, and repeated sections,
You are granted full semantic license to map non-standard, colloquial, or layout-specific medical record sections into our target JSON schema keys. Use your clinical training data to deduce intent. 
For example:
- If a section contains patient-reported pain details but is unlabeled or uses an unrecognizable header, map it to 'historyOfPresentIllness'.
- Trust your internalized knowledge of EMR structures (Epic, Cerner, legacy printouts) to correctly classify data, even if the raw formatting is chaotic.


Operational guardrails:
- Report only facts and recommendations explicitly stated in the source documents.
- If data is missing for a field, do not write "Not Found", "N/A", or "None".
  - For missing arrays, return [].
  - For missing objects, return {}.
  - For missing strings, return "".
- Do not use outside medical knowledge to infer unstated diagnoses.
- Clinical claims usually must include evidence (see the the stated JSON field descriptions)".
- Use Markdown (headings, lists, etc) inside string fields when it improves readability for the reviewing physician.
`.trim();
