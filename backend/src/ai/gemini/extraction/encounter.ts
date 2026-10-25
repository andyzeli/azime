import { z } from "zod";
import {
  strfield,
  functionalLimitationSchema,
  imagingSummarySchema,
  medicationSchema,
  diagnosisSchema,
  buildDiagnosisSchema,
  buildTreatmentPerformedSchema,
  treatmentPerformedSchema,
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

  visitType: z.enum(["initial_visit", "follow_up"]),

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
  reviewOfSystems: z
    .string()
    .describe("Narrative of ROS if one was documented. "),
  reportedDateOfInjury: z
    .string()
    .describe("date of injury if recorded in note, as YYYY-MM-DD"),

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
  diagnoses: z
    .array(diagnosisSchema)
    .describe(
      "Extract each distinct diagnosis explicitly documented in this document into a diagnosis object. Return an empty array when none are documented",
    ),
  regions: z.array(z.string()),
  imagingFindings: z
    .array(imagingSummarySchema)
    .describe(
      "Return one object per distinct modality + date + finding combination. If one MRI contains three findings, return three objects with the same modality and date.",
    ),
  treatmentsPerformed: z
    .array(treatmentPerformedSchema)
    .describe(
      "Any in-office procedures, minor interventions, injections, aspirations, or applications performed DURING today's visit " +
        "(e.g., 'Trigger point injection L4-L5'). " +
        "Do NOT include future planned procedures here—only what was physically performed today. If none, return an empty array.",
    ),
  functionalLimitations: z
    .array(functionalLimitationSchema)
    .describe(
      "A list of functional limitations explicitly stated in the record. If none are mentioned, return an empty array.",
    ),
  workStatus: z
    .object({
      restrictions: z
        .array(z.string())
        .describe(
          "Itemized list of explicit physical restrictions (e.g., 'No lifting > 10 lbs', 'No bending/stooping', 'Must sit 15 mins every hour').",
        ),
      status: z.enum(["full_duty", "modified_duty", "off_work", "unknown"]),
    })
    .describe(
      "The patient's work status, return-to-work status, or work ability statement explicitly stated in the record. If none are mentioned, return an empty string.",
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
  followUpPlan: z
    .string()
    .describe(
      "Care provider's follow-up plan for the patient (e.g., 'Return in 4 weeks', 'PRN / As needed', 'Discharged from care'). " +
        "This is highly critical for tracking case closure. Usually part of plan or follow-up instructions. If not mentioned, return an empty string.",
    ),
});

export const buildEncounterSchema = (
  canonicalDxValues: string[],
  regions: string[],
) =>
  encounterSchema.extend({
    regions: z
      .array(z.enum([...regions, "unclear"]))
      .describe(
        "The body regions this note applies to. This field is helfpul for multi-region injuries",
      ),
    diagnoses: z
      .array(buildDiagnosisSchema(canonicalDxValues))
      .describe(
        "Extract each distinct diagnosis explicitly documented in this document into a diagnosis object that includes a mapping to categorical canonical diagnosis. Return an empty array when none are documented",
      ),
    treatmentsPerformed: z
      .array(buildTreatmentPerformedSchema(regions))
      .describe(
        "Any in-office procedures, minor interventions, injections, aspirations, or applications performed DURING today's visit " +
          "(e.g., 'Trigger point injection L4-L5'). " +
          "Do NOT include future planned procedures here—only what was physically performed today. If none, return an empty array.",
      ),
  });

export const encounterSystemPrompt = `
You are a specialized medical records data extractor.

Your task is to analyze a raw "encounter" (aka "progress report", "SOAP note", etc - an EMR output pdf) from a single provider and extract data into a strictly structured JSON format.

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
