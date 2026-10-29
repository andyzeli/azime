import { z } from "zod";
import {
  diagnosisSchema,
  procedureItemSchema,
  treatmentPerformedSchema,
} from "@azime/contracts";

// Model-facing schema variants. Stored shapes live in @azime/contracts; these
// narrow free-text fields to the case's regions and canonical diagnoses.

const diagnosisDescription =
  "A diagnosis explicitly documented in the source document. evidence, name, and icd must reflect the record without adding a diagnosis. name may be a concise rendering of the documented diagnosis rather than a verbatim copy. Use clinical knowledge only to map that documented diagnosis to the best-fitting canonicalDx category supplied in the allowed enum, which is of the form 'region.diagnosis' - the region prefixes to assist selection. Use unresolved when no category clearly applies; do not force a mapping";

export const buildDiagnosisSchema = (canonicalDxValues: string[]) =>
  diagnosisSchema
    .omit({ region: true })
    .extend({
      canonicalDx: z
        .enum(["unresolved", ...canonicalDxValues])
        .describe(
          "The canonical diagnosis label with its region prefix (e.g. 'lumbar.stenosis') selected from the supplied taxonomy, or 'unresolved' when none applies."
        ),
    })
    .describe(diagnosisDescription);

export const buildRegionsSchema = (regions: string[]) =>
  z
    .enum(["other_body_part", "unclear", ...regions])
    .describe(
      "Map the explicitly documented anatomical site to an allowed case region. Use 'other_body_part' when the site is known but outside the allowed case regions, or 'unclear' when the region cannot be determined. Do not infer the treated region solely from diagnosis presence."
    );

export const buildProcedureItemSchema = (regions: string[]) =>
  procedureItemSchema.extend({
    region: buildRegionsSchema(regions),
  });

export const buildTreatmentPerformedSchema = (regions: string[]) =>
  treatmentPerformedSchema.extend({
    region: buildRegionsSchema(regions),
  });
