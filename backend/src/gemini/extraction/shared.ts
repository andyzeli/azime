import { z } from "zod";

export const strfield = z.string();

export const evidence = z.object({
  page: z.number().int().describe("The page number where the claim is found."),
  quote: z
    .string()
    .describe(
      "The exact text from the record that supports the claim. Include any relevant context, but do not add interpretation or inference.",
    ),
});

export const diagnosisSchema = z.object({
  name: strfield.describe("The name of the diagnosis."),
  icd: strfield
    .nullable()
    .describe(
      "The ICD code for the diagnosis, if available. If not available, this field should be null.",
    ),
  evidence: evidence,
  //  description: strfield,
});
export const medicationSchema = z.object({
  name: strfield.describe("The name of the medication."),
  dose: strfield.describe("The doseage."),
  frequency: strfield.describe("The frequency of the medication."),
  action: strfield.describe(
    "The action taken with the medication (e.g., started, stopped, current). If medication is only mentioned (not explicitly ordered or stopped), this field should be 'current'.",
  ),
  evidence: evidence,
});

export const imagingSummarySchema = z
  .object({
    modality: strfield.describe(
      "The imaging modality used (e.g., MRI, CT, X-ray).",
    ),
    date: strfield.describe("The date of the imaging study."),
    bodyPart: strfield.describe(
      "The body part or region imaged (e.g., 'right shoulder', 'lumbar spine').",
    ),
    finding: strfield.describe("The finding from the imaging study."),
    impression: z
      .string()
      .describe(
        "The primary conclusion or bottom-line finding quoted by the clinician (e.g., 'L4-L5 disc bulge, no spinal stenosis').",
      ),
    evidence: evidence,
  })
  .describe(
    "A single imaging finding entry. Include only findings explicitly documented in the record",
  );

export const functionalLimitationSchema = z.object({
  activity: strfield.describe(
    "The functional limitation activity explicitly stated in the record.",
  ),
  status: strfield.describe(
    "The current status, severity, or change over time of the functional limitation, if stated.",
  ),
});

export const procedureItemSchema = z.object({
  name: z
    .string()
    .describe("Name of the procedure, injection, or intervention performed."),
  bodySite: z
    .string()
    .describe("Anatomical site (e.g., 'Left Knee', 'L4-L5 epidural space')."),
});
