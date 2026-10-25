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
        "The exact text from the record that supports the claim. Include any relevant context, but do not add interpretation or inference."
      ),
  })
  .describe(
    "Source evidence supporting this specific extracted item. The quote must come directly from the document and should be the smallest useful passage that clearly supports the extraction"
  );

const diagnosisShape = {
  evidence: evidence,
  name: strfield.describe("The name of the diagnosis."),
  //maybe add description ? or tell LLM to include description in name if available. so we can distiguish if icd not available
  icd: strfield
    .nullable()
    .describe(
      "The ICD code for the diagnosis, if available. If not available, this field should be null."
    ),
};

const diagnosisDescription =
  "A diagnosis explicitly documented in the source document. evidence, name, and icd must reflect the record without adding a diagnosis. name may be a concise rendering of the documented diagnosis rather than a verbatim copy. Use clinical knowledge only to map that documented diagnosis to the best-fitting canonicalDx category supplied in the allowed enum, which is of the form 'region.diagnosis' - the region prefixes to assist selection. Use unresolved when no category clearly applies; do not force a mapping";

export const diagnosisSchema = z.object({
  ...diagnosisShape,
  region: z.string().min(1),
  canonicalDx: z.string().min(1),
});

export const buildDiagnosisSchema = (canonicalDxValues: string[]) =>
  z
    .object({
      ...diagnosisShape,
      canonicalDx: z
        .enum(["unresolved", ...canonicalDxValues])
        .describe(
          "The canonical diagnosis label with its region prefix (e.g. 'lumbar.stenosis') selected from the supplied taxonomy, or 'unresolved' when none applies."
        ),
    })
    .describe(diagnosisDescription);

export const regionSchema = z.string().min(1);

export const buildRegionsSchema = (regions: string[]) =>
  z
    .enum(["other_body_part", "unclear", ...regions])
    .describe(
      "Map the explicitly documented anatomical site to an allowed case region. Use 'other_body_part' when the site is known but outside the allowed case regions, or 'unclear' when the region cannot be determined. Do not infer the treated region solely from diagnosis presence."
    );

export const medicationSchema = z.object({
  evidence: evidence,
  name: strfield.describe("The name of the medication."),
  dose: strfield.describe("The doseage."),
  frequency: strfield.describe("The frequency of the medication."),
  action: z
    .enum(["Ordered", "Stopped", "Current"])
    .describe(
      "The action taken with the medication. If medication is only mentioned (not explicitly ordered or stopped), this field should be 'current'."
    ),
});

export const imagingSummarySchema = z
  .object({
    evidence: evidence,
    modality: strfield.describe(
      "The imaging modality used (e.g., MRI, CT, EMG, X-ray)."
    ),
    date: strfield.describe("The date of the imaging study, if stated, as YYYY-MM-DD"),
    bodyPart: strfield.describe(
      "The body part or region imaged (e.g., 'right shoulder', 'lumbar spine')."
    ),
    impression: z
      .string()
      .describe(
        "The primary conclusion or bottom-line finding quoted by the clinician (e.g., 'L4-L5 disc bulge, no spinal stenosis')."
      ),
    relationshipToVisit: z
      .enum([
        "performed_at_visit",
        "results_reviewed",
        "historical_reference",
        "unclear",
      ])
      .describe(
        "whether the imaging was done in-house + reviewed, or just reviewed, or previous imaging referenced. Choose 'unclear' if it's not obvious"
      ),
  })
  .describe(
    "An imaging study entry. Include only findings explicitly documented in the record"
  );

export const functionalLimitationSchema = z
  .object({
    evidence: evidence,
    activity: strfield.describe(
      "The functional limitation activity explicitly stated in the record."
    ),
    status: strfield.describe(
      "The current status, severity, or change over time of the functional limitation, if stated."
    ),
  })
  .describe(
    "A functional limitation explicitly documented in this encounter. Do not infer limitations solely from pain, diagnosis, or exam findings. Evidence must directly support the specific activity limitation"
  );

export const procedureItemSchema = z.object({
  name: z.string().describe("Name of the procedure performed"),
  bodySite: z
    .string()
    .describe("Anatomical site (e.g., 'Left Knee', 'L4-L5 epidural space')."),
  region: regionSchema,
});
export const buildProcedureItemSchema = (regions: string[]) =>
  procedureItemSchema.extend({
    region: buildRegionsSchema(regions),
  });

export const treatmentPerformedSchema = z.object({
  name: z.string().describe("Name of the procedure performed"),
  bodySite: z
    .string()
    .describe(
      "Anatomical site (e.g., 'Left Knee', 'L4-L5 epidural space') of the procedure performed."
    ),
  region: regionSchema,
  treatmentType: z
    .enum([
      "injection",
      "ablation",
      "aspiration",
      "manipulation",
      "immobilization",
      "modality",
      "Other",
      "Unknown",
    ])
    .describe(
      "Choose most appropriate category for the treatment, or use 'Unknown' if none of the options fit. use 'modality' for Electircal stim, therapeutic ultrasound, thermal agents, mechanical traction or light therapy "
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
      "The documented laterality of the procedure. Use 'unclear' if laterality cannot be determined from the record."
    ),
  guidanceMethod: z
    .enum(["fluoroscopy", "ultrasound", "CT", "none", "other", "unclear"])
    .describe(
      "The imaging or procedural guidance method documented for the procedure."
    ),
  medicationsInjected: z
    .array(
      z.object({
        name: z.string().describe("The injected medication or agent."),
        dose: z
          .string()
          .describe(
            "The documented dose, concentration, or volume, if provided."
          ),
      })
    )
    .describe(
      "Medications or agents administered during the procedure, such as corticosteroid, local anesthetic, or contrast. Use empty array if not applicable"
    ),
  immediate_response: z
    .string()
    .describe("Verbatim stated immediate response, if documented. "),
  complications: z
    .string()
    .describe(
      "Explicitly stated complications during or immediately after the procedure"
    ),
});
export const buildTreatmentPerformedSchema = (regions: string[]) =>
  treatmentPerformedSchema.extend({
    region: buildRegionsSchema(regions),
  });
