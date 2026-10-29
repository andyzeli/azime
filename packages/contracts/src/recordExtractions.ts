import { z } from "zod";
import type { DocumentType } from "./records.js";
import { encounterSchema } from "./extraction/encounter.js";
import { genericSummarySchema } from "./extraction/generic.js";
import { imagingSchema } from "./extraction/imaging.js";
import { incidentReportSchema } from "./extraction/incidentReport.js";
import { interventionSchema } from "./extraction/intervention.js";
import { jobDescriptionSchema } from "./extraction/jobDescription.js";
import { surgerySchema } from "./extraction/surgery.js";
import { therapySchema } from "./extraction/therapyNote.js";
import { workStatusReportSchema } from "./extraction/workstatus.js";

export {
  diagnosisSchema,
  procedureItemSchema,
  treatmentPerformedSchema,
} from "./extraction/shared.js";
export {
  encounterSchema,
  genericSummarySchema,
  imagingSchema,
  incidentReportSchema,
  interventionSchema,
  jobDescriptionSchema,
  surgerySchema,
  therapySchema,
  workStatusReportSchema,
};

// Stored extraction schemas by document type. Model-facing variants (case
// regions, canonical diagnosis enums) and prompts are built in the backend.
export const extractionSchemas = {
  encounter: encounterSchema,
  generic: genericSummarySchema,
  imaging_report: imagingSchema,
  incident_report: incidentReportSchema,
  job_description: jobDescriptionSchema,
  surgery_report: surgerySchema,
  intervention_report: interventionSchema,
  therapy_note: therapySchema,
  workstatus: workStatusReportSchema,
  legal_summary: genericSummarySchema,
} satisfies Record<DocumentType, z.ZodObject<any>>;

export const withStoredFields = <T extends z.ZodRawShape>(
  extractionSchema: z.ZodObject<T>,
) =>
  extractionSchema.extend({
    schemaVersion: z.literal("v1"),
  });

type ExtractionSchemas = typeof extractionSchemas;

type StoredFields = {
  schemaVersion: "v1";
};

export type StoredExtraction<T extends DocumentType> = z.output<
  ExtractionSchemas[T]
> &
  StoredFields;

export type AnyStoredExtraction = {
  [T in DocumentType]: StoredExtraction<T>;
}[DocumentType];

export function safeParseStoredExtraction<T extends DocumentType>(
  documentType: T,
  data: unknown,
): z.ZodSafeParseResult<StoredExtraction<T>> {
  // Stored artifacts are parsed without today's mutable case-region context.
  const schema: z.ZodObject<any> = extractionSchemas[documentType];
  const storedSchema = withStoredFields(schema);

  return storedSchema.safeParse(data) as z.ZodSafeParseResult<
    StoredExtraction<T>
  >;
}
