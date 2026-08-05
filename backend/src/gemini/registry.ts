import { z } from "zod";
import type { DocumentType } from "../records/documentMetadata.js";
import {
  encounterSchema,
  encounterSystemPrompt,
  genericSummarySchema,
  genericDocumentSystemPrompt,
  imagingSchema,
  imagingSystemPrompt,
  incidentReportSchema,
  incidentReportSystemPrompt,
  jobDescriptionSchema,
  jobDescriptionSystemPrompt,
  procedureSchema,
  procedureSystemPrompt,
  therapySchema,
  therapySystemPrompt,
  workStatusReportSchema,
  workStatusSystemPrompt,
} from "./extraction";

type ExtractionConfig = {
  schema: z.ZodObject<any>;
  systemPrompt: string;
};

const sourceMetadataSchema = z.object({
  recordId: z.number().int(),
  fileName: z.string(),
  providerName: z.string(),
  //providerType: z.string(),
  documentType: z.string(),
  eventDate: z.string().optional(),
  metadata: z.record(z.any(), z.any()).optional(),
});
export function createStoredSchema<T extends z.ZodRawShape>(
  extractionSchema: z.ZodObject<T>,
) {
  return extractionSchema.extend({
    schemaVersion: z.literal("v1"),
    sourceMetadata: sourceMetadataSchema,
  });
}

//export type StoredRecordSummary = z.infer<typeof extendedSchema>;

export const extractionRegistry = {
  encounter: {
    schema: encounterSchema,
    systemPrompt: encounterSystemPrompt,
  },
  generic: {
    schema: genericSummarySchema,
    systemPrompt: genericDocumentSystemPrompt,
  },
  imaging_report: {
    schema: imagingSchema,
    systemPrompt: imagingSystemPrompt,
  },
  incident_report: {
    schema: incidentReportSchema,
    systemPrompt: incidentReportSystemPrompt,
  },
  job_description: {
    schema: jobDescriptionSchema,
    systemPrompt: jobDescriptionSystemPrompt,
  },
  procedure_report: {
    schema: procedureSchema,
    systemPrompt: procedureSystemPrompt,
  },
  therapy_note: {
    schema: therapySchema,
    systemPrompt: therapySystemPrompt,
  },
  workstatus: {
    schema: workStatusReportSchema,
    systemPrompt: workStatusSystemPrompt,
  },
  legal_summary: {
    schema: genericSummarySchema,
    systemPrompt: genericDocumentSystemPrompt,
  },
} satisfies Record<DocumentType, ExtractionConfig>;

export const getExtractionConfig = (
  documentType: DocumentType,
): ExtractionConfig => {
  return extractionRegistry[documentType];
};
type ExtractionRegistry = typeof extractionRegistry;

type StoredFields = {
  schemaVersion: "v1";
  sourceMetadata: z.infer<typeof sourceMetadataSchema>;
};

export type StoredExtraction<T extends DocumentType> = z.output<
  ExtractionRegistry[T]["schema"]
> &
  StoredFields;
