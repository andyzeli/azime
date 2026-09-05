import { z } from "zod";
import type { DocumentType } from "../../records/documentMetadata.js";
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
  surgerySchema,
  surgerySystemPrompt,
  interventionSchema,
  interventionSystemPrompt,
  therapySchema,
  therapySystemPrompt,
  workStatusReportSchema,
  workStatusSystemPrompt,
} from "./extraction/index.js";

type ExtractionConfig = {
  schema: z.ZodObject<any>;
  systemPrompt: string;
};

export function createStoredSchema<T extends z.ZodRawShape>(
  extractionSchema: z.ZodObject<T>,
) {
  return extractionSchema.extend({
    schemaVersion: z.literal("v1"),
  });
}

//export type StoredRecordSummary = z.infer<typeof extendedSchema>;

// const semanticLicensePromptExample = `
// You are an expert clinical data extraction engine.

// CONCEPTUAL MAPPING AUTONOMY:
// You are granted full semantic license to map non-standard, colloquial, or layout-specific medical record sections into our target JSON schema keys. Use your clinical training data to deduce intent.
// For example:
// - If a section contains patient-reported pain details but is unlabeled or uses an unrecognizable header, map it to 'historyOfPresentIllness'.
// - Trust your internalized knowledge of EMR structures (Epic, Cerner, legacy printouts) to correctly classify data, even if the raw formatting is chaotic.

// Strict Guardrails:
// 1. Grounding: Extract facts exactly as written...`;

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
  surgery_report: {
    schema: surgerySchema,
    systemPrompt: surgerySystemPrompt,
  },
  intervention_report: {
    schema: interventionSchema,
    systemPrompt: interventionSystemPrompt,
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
};

export type StoredExtraction<T extends DocumentType> = z.output<
  ExtractionRegistry[T]["schema"]
> &
  StoredFields;

export type AnyStoredExtraction = {
  [T in DocumentType]: StoredExtraction<T>;
}[DocumentType];

export function safeParseStoredExtraction<T extends DocumentType>(
  documentType: T,
  data: unknown,
): z.ZodSafeParseResult<StoredExtraction<T>> {
  const config = getExtractionConfig(documentType);
  const storedSchema = createStoredSchema(config.schema);

  return storedSchema.safeParse(data) as z.ZodSafeParseResult<
    StoredExtraction<T>
  >;
}
