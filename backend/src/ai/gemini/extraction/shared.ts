import { z } from "zod";

export const strfield = z.string();

export const evidence = z
  .object({
    page: z
      .number()
      .int()
      .describe("The page number where the claim is found."),
    quote: z
      .string()
      .describe(
        "The exact text from the record that supports the claim. Include any relevant context, but do not add interpretation or inference.",
      ),
  })
  .describe(
    "Source evidence supporting this specific extracted item. The quote must come directly from the document and should be the smallest useful passage that clearly supports the extraction",
  );

export const diagnosisSchema = z
  .object({
    evidence: evidence,
    name: strfield.describe("The name of the diagnosis."),
    icd: strfield
      .nullable()
      .describe(
        "The ICD code for the diagnosis, if available. If not available, this field should be null.",
      ),
    //  description: strfield,
  })
  .describe(
    "A diagnosis explicitly documented in this encounter. The evidence must support this specific diagnosis.",
  );
export const medicationSchema = z.object({
  evidence: evidence,
  name: strfield.describe("The name of the medication."),
  dose: strfield.describe("The doseage."),
  frequency: strfield.describe("The frequency of the medication."),
  action: z
    .enum(["Ordered", "Stopped", "Current"])
    .describe(
      "The action taken with the medication. If medication is only mentioned (not explicitly ordered or stopped), this field should be 'current'.",
    ),
});

export const imagingSummarySchema = z
  .object({
    evidence: evidence,
    modality: strfield.describe(
      "The imaging modality used (e.g., MRI, CT, X-ray).",
    ),
    date: strfield.describe("The date of the imaging study, if stated"),
    bodyPart: strfield.describe(
      "The body part or region imaged (e.g., 'right shoulder', 'lumbar spine').",
    ),
    impression: z
      .string()
      .describe(
        "The primary conclusion or bottom-line finding quoted by the clinician (e.g., 'L4-L5 disc bulge, no spinal stenosis').",
      ),
    relationshipToVisit: z
      .enum([
        "performed_at_visit",
        "results_reviewed",
        "historical_reference",
        "unclear",
      ])
      .describe(
        "whether the imaging was done in-house + reviewed, or just reviewed, or previous imaging referenced. Choose 'unclear' if it's not obvious",
      ),
  })
  .describe(
    "An imaging study entry. Include only findings explicitly documented in the record",
  );

export const functionalLimitationSchema = z
  .object({
    evidence: evidence,
    activity: strfield.describe(
      "The functional limitation activity explicitly stated in the record.",
    ),
    status: strfield.describe(
      "The current status, severity, or change over time of the functional limitation, if stated.",
    ),
  })
  .describe(
    "A functional limitation explicitly documented in this encounter. Do not infer limitations solely from pain, diagnosis, or exam findings. Evidence must directly support the specific activity limitation",
  );

export const procedureItemSchema = z.object({
  name: z
    .string()
    .describe("Name of the procedure, injection, or intervention performed."),
  bodySite: z
    .string()
    .describe("Anatomical site (e.g., 'Left Knee', 'L4-L5 epidural space')."),
});
